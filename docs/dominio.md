*De acordo com item 2 do enunciado*

---

# Modelo de domínio e responsabilidades

| Conceito | Responsabilidade | GRASP / SOLID |
|---|---|---|
| `Recurso` | Tipo e capacidade; sabe se comporta uma quantidade | Information Expert |
| `Periodo` (value object) | Validar início < fim; detectar sobreposição | Alta coesão, imutável |
| `AgendaRecurso` | Calcular a capacidade livre num período a partir das reservas existentes; criar a reserva quando há capacidade | Information Expert, Creator de `Reserva` |
| `Reserva` | Ciclo de vida PENDENTE → APROVADA → ATIVA → ENCERRADA (ou REJEITADA/CANCELADA); impede transições inválidas; registra quem aprovou ou rejeitou e quando; sabe se o acesso ao recurso está liberado | Expert, encapsulamento |
| `Usuario` | Identidade institucional, contato e papel (aluno, doutorando, orientador, administrador) | Information Expert |
| `Projeto` | Agrupa usuários, tem um responsável (orientador) e possui as quotas | Information Expert |
| `Quota` | Limite definido pelo administrador e consumo atual; decide se um pedido cabe, por acúmulo mensal (GPU-horas) ou por capacidade simultânea (storage) | Information Expert |
| `PoliticaAutorizacao` (interface) | Decide auto-aprovar, exigir aprovação ou negar | Polymorphism, Protected Variations, OCP |
| `SolicitarReservaUseCase` | Orquestrar o fluxo, sem regra de negócio | Controller, SRP |
| `AprovarReservaUseCase`, `CancelarReservaUseCase`, `AtivarReservasUseCase`, `EncerrarReservasUseCase`, `RevogarAcessoUseCase` | Orquestrar os demais fluxos que mudam o estado da reserva ou o acesso; os três últimos são acionados pelo agendador | Controller, SRP |
| `CatalogoRecursos`, `ControleQuotas`, `DiretorioUsuarios` (interfaces públicas dos módulos de suporte) | Oferecer a reservas e a notificações a consulta de recursos, a verificação, o consumo e a devolução de quota e a busca de usuários, sem expor as entidades internas | Indirection, Protected Variations |
| `RepositorioReservas`, `PublicadorEventos`, `Provisionador`, `UnidadeDeTrabalho`, `Notificador`, `ServicoAutenticacao` | Portas para a infraestrutura | Pure Fabrication, Indirection, DIP |

---

## Detalhamento das responsabilidades e GRASP

- **`Recurso` (Information Expert):** Guarda o tipo (GPU, servidor, storage) e a capacidade total. Por deter a informação de hardware, valida se suporta a quantidade solicitada.
- **`Periodo` (Alta coesão, imutável):** Value object com início e fim. Garante que `início < fim` e calcula se há sobreposição temporal com outros períodos.
- **`AgendaRecurso` (Information Expert / Creator):** Conhece as reservas do recurso e calcula o saldo livre em um período, evitando sobreposição e excesso de alocação (ASR1). Reservas pendentes e aprovadas contam como ocupadas. Por registrar as reservas do recurso e ter os dados para validá-las, é ela quem cria a `Reserva`. Se não há capacidade, nenhuma reserva é criada e o pedido é recusado por indisponibilidade.
- **`Reserva` (Information Expert / Encapsulamento):** Controla os dados da solicitação e as transições de estado (`aprovar()`, `ativar()`, `encerrar()`, `cancelar()`, `rejeitar()`), impedindo transições inválidas. `aprovar()` e `rejeitar()` registram o responsável e a data da decisão. REJEITADA é sempre decisão de um aprovador; a falta de capacidade não gera reserva rejeitada. `cancelar()` vale para reservas PENDENTE, APROVADA ou ATIVA; em reservas já REJEITADA, CANCELADA ou ENCERRADA é um erro. `ativar()` marca o acesso como liberado, e o agendador revoga o acesso de toda reserva ENCERRADA ou CANCELADA que ainda o tenha liberado. Depois de revogar com sucesso, o acesso deixa de estar marcado como liberado, para que o agendador não reprocesse a mesma reserva.
- **`Usuario` (Information Expert):** Representa quem está usando o sistema, com o papel obtido da autenticação institucional e os dados de contato usados nas notificações. As políticas usam esse papel, por exemplo para restringir um recurso a doutorandos.
- **`Projeto` (Information Expert):** Agrupa os pesquisadores, tem um responsável (um `Usuario` com papel de orientador), que é quem pode aprovar ou rejeitar as reservas pendentes do projeto, e detém as quotas.
- **`Quota` (Information Expert):** Guarda o limite definido pelo administrador e o consumo do projeto, que inclui as reservas pendentes e aprovadas, e calcula se uma nova solicitação cabe. Há dois modos, conforme o tipo de recurso. Para GPUs e servidores, a quota é acumulada por mês de calendário, medida em unidade × hora (ex.: GPU-horas), e uma reserva conta inteira no mês em que começa. Para storage, a quota é a capacidade simultânea reservada (TB): um pedido cabe se, em todo o seu período, a soma do storage já reservado pelo projeto mais o pedido não ultrapassar o limite — a mesma checagem de sobreposição que `AgendaRecurso` faz para a capacidade do recurso. Mudar o limite é mudar um dado, não o código.
- **`PoliticaAutorizacao` (Polymorphism / Protected Variations):** Interface para definir regras de autorização (ex.: aprovação direta vs. exigência de orientador para mais de 2 GPUs ou mais de 72h). Isola o caso de uso de mudanças de regras (ASR2).
- **`SolicitarReservaUseCase` (Controller):** Coordena o fluxo da solicitação (consulta agenda, quota, aplica política e persiste), sem assumir regras de negócio das entidades. Executa tudo dentro de uma `UnidadeDeTrabalho`.
- **Demais casos de uso (Controller):** `AprovarReservaUseCase` confere se quem decide é o responsável do projeto; `CancelarReservaUseCase` devolve capacidade e quota; `AtivarReservasUseCase`, `EncerrarReservasUseCase` e `RevogarAcessoUseCase` são chamados pelo agendador e acionam o `Provisionador` fora da transação; `RevogarAcessoUseCase` cuida das reservas canceladas enquanto estavam ativas, que ainda tinham o acesso liberado.
- **`CatalogoRecursos`, `ControleQuotas` e `DiretorioUsuarios` (Indirection):** Interfaces públicas dos módulos de catálogo, de quotas e de identidade (esta última usada por notificações para buscar o destinatário). `CatalogoRecursos` e `ControleQuotas` também oferecem a operação de obter o recurso ou a quota com exclusão mútua até o fim da unidade de trabalho, para que reservas não precise acessar as tabelas desses módulos. `DiretorioUsuarios` é apenas de leitura.
- **Portas de infraestrutura (Pure Fabrication / Indirection):** `RepositorioReservas`, `PublicadorEventos`, `Provisionador`, `UnidadeDeTrabalho`, `Notificador` e `ServicoAutenticacao` isolam o domínio de banco de dados, transação, e-mail, Slurm e LDAP (ASR3).

---

## Eventos de domínio

Publicados pelo núcleo depois do commit: `ReservaPendente`, `ReservaAprovada`, `ReservaRejeitada`, `ReservaCancelada`, `ReservaAtivada` e `ReservaEncerrada`. Os eventos carregam identificadores (reserva, solicitante, aprovador), e não endereços de contato.

---

## Operações

Esta tabela é a fonte dos nomes usados nos diagramas e no código.

| Classe | Operações |
|---|---|
| `Recurso` | `comporta(quantidade)` |
| `Periodo` | `sobrepoe(outro)`, `duracao()` |
| `AgendaRecurso` | `verificarDisponibilidade(periodo, quantidade)`, `criarReserva(...)` (levanta indisponibilidade se não houver capacidade) |
| `Reserva` | `aprovar(aprovador)`, `rejeitar(aprovador)`, `ativar()`, `encerrar()`, `cancelar()` |
| `Quota` | `comporta(pedido)`, `consumir(pedido)`, `devolver(pedido)` |
| `ControleQuotas` | `verificarQuota(pedido)`, `avaliarPoliticas(pedido)`, `consumir(pedido)`, `devolver(pedido)`, `responsavelDe(projeto)`, `obterParaAtualizacao(projeto, pedido)` |
| `PoliticaAutorizacao` | `avaliar(pedido)`, devolvendo `AUTO_APROVAR`, `EXIGIR_APROVACAO` ou `NEGAR` |
| `CatalogoRecursos` | `buscar(id)`, `obterParaAtualizacao(id)` |
| `RepositorioReservas` | `salvar(reserva)`, `buscarPorId(id)`, `listarPorUsuario(usuario)`, `listarPorRecurso(recurso, periodo)`, `listarParaAtivar(agora)`, `listarParaEncerrar(agora)` |
| `Provisionador` | `liberarAcesso(reserva)`, `revogarAcesso(reserva)` |
| `Notificador` | `notificar(destinatario, mensagem)` |
| `PublicadorEventos` | `publicar(evento)` |
| `ServicoAutenticacao` | `autenticar(credencial)` |
| `DiretorioUsuarios` | `buscar(id)` |
| `UnidadeDeTrabalho` | `executar(operacao)` |
| Casos de uso | `executar(comando)` |

---

## Coesão e acoplamento

Cada classe de domínio concentra uma única responsabilidade de negócio. O domínio não depende de framework, banco ou serviço externo; os adaptadores é que dependem das interfaces do domínio. O caso de uso conhece apenas abstrações, o que mantém o acoplamento baixo e permite testar tudo com fakes.

---

## SOLID pertinente

- **SRP:** o caso de uso orquestra o fluxo, enquanto as entidades decidem sobre seu próprio estado.
- **OCP:** novas políticas de autorização são adicionadas criando novas classes que implementam `PoliticaAutorizacao`, sem alterar o código existente.
- **ISP:** portas pequenas e específicas (`Notificador` trata apenas de avisos e não sabe nada de provisionamento).
- **DIP:** casos de uso dependem de portas (interfaces), não de implementações de infraestrutura.
