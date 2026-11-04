*De acordo com item 2 do enunciado*

---

# Modelo de domínio e responsabilidades

| Conceito | Responsabilidade | GRASP / SOLID |
|---|---|---|
| `Recurso` | Tipo e capacidade; sabe se comporta uma quantidade | Information Expert |
| `Periodo` (value object) | Validar início < fim; detectar sobreposição | Alta coesão, imutável |
| `AgendaRecurso` | Calcular a capacidade livre num período a partir das reservas existentes | Information Expert |
| `Reserva` | Ciclo de vida PENDENTE → APROVADA → ATIVA → ENCERRADA (ou REJEITADA/CANCELADA); impede transições inválidas | Expert, encapsulamento |
| `Projeto` | Agrupa usuários e possui a quota | Creator de `Reserva` |
| `Quota` | Consumo atual; decide se um pedido cabe | Information Expert |
| `PoliticaAutorizacao` (interface) | Decide auto-aprovar, exigir aprovação ou negar | Polymorphism, Protected Variations, OCP |
| `SolicitarReservaUseCase` | Orquestrar o fluxo, sem regra de negócio | Controller, SRP |
| `RepositorioReservas`, `Notificador`, `Provisionador`, `ServicoAutenticacao` | Portas para a infraestrutura | Pure Fabrication, Indirection, DIP |

---

## Detalhamento das responsabilidades e GRASP

- **`Recurso` (Information Expert):** Guarda o tipo (GPU, servidor, storage) e a capacidade total. Por deter a informação de hardware, valida se suporta a quantidade solicitada.
- **`Periodo` (Alta coesão, imutável):** Value object com início e fim. Garante que `início < fim` e calcula se há sobreposição temporal com outros períodos.
- **`AgendaRecurso` (Information Expert):** Conhece as reservas do recurso e calcula o saldo livre em um período, evitando sobreposição e excesso de alocação (ASR1).
- **`Reserva` (Information Expert / Encapsulamento):** Controla os dados da solicitação e as transições de estado (`aprovar()`, `ativar()`, `encerrar()`, `cancelar()`, `rejeitar()`), impedindo transições inválidas.
- **`Projeto` (Creator):** Agrupa os pesquisadores e detém a quota. É responsável por instanciar a `Reserva` vinculada ao projeto.
- **`Quota` (Information Expert):** Mantém o consumo acumulado do projeto e calcula se uma nova solicitação excede o limite mensal.
- **`PoliticaAutorizacao` (Polymorphism / Protected Variations):** Interface para definir regras de autorização (ex.: aprovação direta vs. exigência de orientador para mais de 2 GPUs ou mais de 72h). Isola o caso de uso de mudanças de regras (ASR2).
- **`SolicitarReservaUseCase` (Controller):** Coordena o fluxo da solicitação (consulta agenda, quota, aplica política e persiste), sem assumir regras de negócio das entidades.
- **Portas de infraestrutura (Pure Fabrication / Indirection):** `RepositorioReservas`, `Notificador`, `Provisionador` e `ServicoAutenticacao` isolam o domínio de banco de dados, e-mail, Slurm e LDAP (ASR3).

---

## Coesão e acoplamento

Cada classe de domínio concentra uma única responsabilidade de negócio. O domínio não depende de framework, banco ou serviço externo; os adaptadores é que dependem das interfaces do domínio. O caso de uso conhece apenas abstrações, o que mantém o acoplamento baixo e permite testar tudo com fakes.

---

## SOLID pertinente

- **SRP:** o caso de uso orquestra o fluxo, enquanto as entidades decidem sobre seu próprio estado.
- **OCP:** novas políticas de autorização são adicionadas criando novas classes que implementam `PoliticaAutorizacao`, sem alterar o código existente.
- **ISP:** portas pequenas e específicas (`Notificador` trata apenas de avisos e não sabe nada de provisionamento).
- **DIP:** casos de uso dependem de portas (interfaces), não de implementações de infraestrutura.
