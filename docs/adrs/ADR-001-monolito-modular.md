# ADR-001: Monolito modular vs. microsserviços (ASR1, custo, restrições de equipe)

**Status:** Aceito

---

## 1. Contexto

O sistema controla solicitações de recursos computacionais (servidores, GPUs e armazenamento) de um departamento universitário. Ele é implantado em servidor próprio, sem nuvem, por uma equipe pequena e com prazo de um semestre. O núcleo do sistema é a reserva, que depende de três consultas ao mesmo tempo: disponibilidade do recurso, quota do projeto e política de autorização.

---

## 2. Problema e forças envolvidas

- **ASR1:** solicitações concorrentes nunca podem gerar alocação acima da capacidade, nem quota excedida. Isso exige uma transação atômica sobre "verificar + reservar".
- **ASR2:** novas políticas de autorização precisam entrar sem alterar o caso de uso. Isso pede módulos com fronteiras claras.
- **Restrições:** equipe pequena, um semestre, implantação em servidor próprio.
- **Escala:** a carga esperada é baixa (alunos e pesquisadores de um departamento), com picos pontuais perto de prazos.

Pergunta: o sistema deve ser dividido em serviços implantáveis separadamente ou em módulos dentro de um único artefato?

---

## 3. Alternativas consideradas

**A. Monolito em camadas simples.** Um único deployable, organizado apenas em camadas técnicas (apresentação, serviço, dados).
- Prós: mais simples de construir e implantar.
- Contras: as regras de negócio tendem a vazar para as classes de serviço, o que dificulta a modificabilidade (ASR2).

**B. Microsserviços.** Um serviço por módulo (catálogo, reservas, quotas, notificações, provisionamento e identidade), cada um com seu banco.
- Prós: isolamento de falhas e escalabilidade independente.
- Contras: verificar e reservar passaria a atravessar serviços, já que a capacidade fica em reservas e a quota em quotas, exigindo saga ou transação distribuída (contra o ASR1). Também traz custo alto de implantação, operação e testes de integração para uma equipe pequena.

**C. Monolito modular.** Um único deployable dividido em módulos com fronteiras explícitas (Catálogo, Reservas, Quotas e Políticas, Notificações, Provisionamento, Identidade), comunicando-se por interfaces in-process e compartilhando um único banco.
- Prós: transação local para o ASR1, implantação simples e fronteiras que organizam o código por assunto de negócio.
- Contras: continua sendo um processo só, e as fronteiras entre módulos precisam ser verificadas, porque a linguagem não as impõe.

---

## 4. Decisão

Adotar o **monolito modular (alternativa C)**, com banco único e módulos que se comunicam apenas por interfaces.

---

## 5. Consequências positivas

- A verificação de disponibilidade e quota e a criação da reserva ocorrem numa única transação local, o que atende o ASR1 sem mecanismos distribuídos.
- Implantação simples: um artefato em um servidor do departamento.
- Custo de desenvolvimento e operação compatível com a equipe e o prazo.
- Desempenho bom, pois não há rede entre módulos.
- As fronteiras entre módulos mantêm aberta a extração futura. Notificações é o candidato natural, pois já se comunica por eventos.

---

## 6. Consequências negativas, custos e riscos

- Ponto único de falha: se a aplicação cair, todo o sistema fica indisponível. A notificação assíncrona e a nova tentativa de provisionamento evitam que falhas das integrações externas derrubem a reserva, mas não protegem contra a queda do próprio servidor. Enquanto ele estiver fora, ativações e encerramentos atrasam e são recuperados pelo agendador quando ele volta.
- Escalabilidade apenas vertical para o núcleo transacional. Para carga muito maior seria preciso replicar a API, confiando no banco para a concorrência (ADR-003) e mantendo o agendador ativo em uma só instância.
- As fronteiras entre módulos não são impostas pela linguagem: nada impede um módulo de importar classes internas de outro. Um teste de arquitetura verifica as dependências em relação ao diagrama de componentes.
- Banco compartilhado: os módulos ficam acoplados ao mesmo esquema físico, mesmo que usem tabelas ou schemas separados.
