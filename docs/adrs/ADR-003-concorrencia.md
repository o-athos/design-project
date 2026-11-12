# ADR-003: Controle de concorrência na reserva: lock pessimista vs. otimista vs. exclusion constraint (ASR1)

**Status:** Aceito

---

## 1. Contexto

Várias pessoas podem solicitar o mesmo recurso no mesmo período ao mesmo tempo, principalmente perto de prazos importantes. O fluxo "verificar disponibilidade -> reservar" não é atômico por si só: duas requisições podem ler o mesmo dado e ambas gravar a reserva. O mesmo vale para a quota: dois pedidos do mesmo projeto, mesmo em recursos diferentes, podem ler o mesmo saldo de quota e ambos passarem. O ASR1 exige que isso nunca ocorra.

---

## 2. Problema e forças envolvidas

- **ASR1:** com 1 GPU livre num horário, 20 pedidos simultâneos de 1 GPU para esse horário, todos dentro do limite de aprovação automática, devem resultar em exatamente 1 reserva aprovada e 19 pedidos recusados por indisponibilidade, sem criar reserva. Nenhuma solicitação aceita pode fazer um projeto exceder a quota.
- Reservas pendentes e aprovadas contam para a capacidade e para a quota, então a garantia vale já na solicitação, e não só na aprovação.
- Os recursos são heterogêneos: GPU é contável, storage é medido em capacidade e servidor pode ser de uso exclusivo. Para recursos de uso exclusivo, a regra é "não sobrepor períodos"; para recursos contáveis, é soma das quantidades sobrepostas ser menor ou igual a capacidade.
- A garantia deve valer mesmo que o código da aplicação tenha um erro ou que existam várias instâncias da API.
- Um dos pontos fortes da decisão do ADR-001 é a transação local única.

Pergunta: onde e como garantir a atomicidade de "verificar + reservar"?

---

## 3. Alternativas consideradas

**A. Lock pessimista.** Bloquear a linha do recurso (`SELECT ... FOR UPDATE`) durante a transação de reserva.
- Prós: simples de entender; garante serialização por recurso.
- Contras: serializa todas as reservas do mesmo recurso, mesmo para períodos que não se sobrepõem; risco de contenção e deadlock.

**B. Lock otimista.** Usar um campo de versão no recurso ou na agenda e repetir a operação em caso de conflito.
- Prós: sem bloqueio em cenários de pouco conflito.
- Contras: sob alta contenção (o cenário do ASR1) gera muitas tentativas e rejeições; a lógica de repetição vai para a aplicação.

**C. Exclusion constraint do PostgreSQL.** Usar `tstzrange` com `EXCLUDE USING gist` para impedir, no próprio banco, reservas sobrepostas de recursos exclusivos.
- Prós: a garantia vale independentemente da aplicação; o banco rejeita a violação de forma atômica.
- Contras: cobre diretamente a sobreposição de períodos, mas não a soma de quantidades em recursos contáveis nem a quota; amarra parte da regra ao PostgreSQL.

---

## 4. Decisão

Combinar duas camadas:

1. **Recursos exclusivos:** exclusion constraint do PostgreSQL como garantia final de não sobreposição. A constraint considera apenas reservas pendentes, aprovadas ou ativas, para que reservas canceladas, rejeitadas ou encerradas não bloqueiem o período.
2. **Recursos contáveis (GPUs, storage) e quota:** lock pessimista (alternativa A) dentro da transação. A transação bloqueia primeiro a linha do recurso e depois a linha da quota do projeto, de modo que `AgendaRecurso.verificarDisponibilidade()` e `Quota.comporta()` sejam avaliados e a reserva seja salva com os dois bloqueados. A ordem é sempre a mesma (recurso, depois quota), o que evita deadlock entre duas transações.

A transação é aberta pelo caso de uso `SolicitarReservaUseCase` e a persistência é feita via `RepositorioReservas`. O cancelamento e a rejeição devolvem capacidade e quota numa transação com a mesma ordem de bloqueio. A violação da constraint ou a indisponibilidade resultam em recusa por indisponibilidade (HTTP 409), e a quota excedida em HTTP 422. No protótipo com SQLite, a transação com lock de escrita substitui a constraint e os locks de linha, e a diferença é registrada.

O comportamento é validado por dois testes de concorrência: 20 pedidos simultâneos pela mesma GPU e horário, resultando em 1 aprovado e 19 recusados, e pedidos simultâneos do mesmo projeto em recursos diferentes, que juntos não podem ultrapassar a quota.

---

## 5. Consequências positivas

- O ASR1 é atendido com uma garantia que não depende só do código da aplicação.
- A solução aproveita a transação local do monolito (ADR-001), sem saga nem transação distribuída.
- Reservas de recursos diferentes de projetos diferentes não competem entre si, pois o bloqueio é por recurso e por quota.

---

## 6. Consequências negativas, custos e riscos

- Parte da regra de negócio (não sobreposição) passa a viver no banco, o que dificulta a troca de persistência: em outro banco a garantia precisa ser reimplementada na aplicação.
- Duplicação de conhecimento: a regra de capacidade existe no domínio AgendaRecurso e na constraint, e precisam permanecer coerentes.
- O lock pessimista serializa as reservas do mesmo recurso e, pelo lock da quota, também os pedidos simultâneos do mesmo projeto, mesmo em recursos diferentes. Isso pode virar gargalo em picos muito altos e exige transações curtas. As chamadas externas (provisionamento, notificação) devem ficar fora da transação.
- A proteção contra deadlock depende de todo caso de uso que mexe em capacidade e quota respeitar a mesma ordem de bloqueio.
- O protótipo em SQLite permite um único escritor por vez no banco inteiro, então serializa mais do que o PostgreSQL faria e não exercita a exclusion constraint. O teste de concorrência no protótipo não valida essa parte do PostgreSQL.
