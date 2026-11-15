*De acordo com item 2 do enunciado*

---

# Modelo de domínio e responsabilidades

| Conceito | Responsabilidade | GRASP / SOLID |
|---|---|---|
| `Recurso` | Tipo e capacidade; sabe se comporta uma quantidade | Information Expert |
| `Periodo` (value object) | Validar início < fim; detectar sobreposição | Alta coesão, imutável |
| `AgendaRecurso` | Calcular a capacidade livre num período a partir das reservas existentes; criar a reserva quando há capacidade | Information Expert, Creator de `Reserva` |
| `Reserva` | Ciclo de vida PENDENTE → APROVADA → ATIVA → ENCERRADA (ou REJEITADA/CANCELADA); impede transições inválidas; registra quem aprovou ou rejeitou e quando; sabe se o acesso ao recurso está liberado | Expert, encapsulamento |
| `EventoReserva` (e subclasses) | Registrar uma mudança de estado da reserva, com identificadores, para quem precisar reagir a ela | Indirection, baixo acoplamento |
| `Usuario` | Identidade institucional, contato e papel (aluno, doutorando, orientador, administrador) | Information Expert |
| `Projeto` | Agrupa usuários, tem um responsável (orientador, guardado pelo id) e possui as quotas | Information Expert |
| `Quota` | Limite definido pelo administrador e registro do consumo; decide se um pedido cabe, conforme o `ModoQuota`: acúmulo mensal (GPU-horas) ou capacidade simultânea (storage) | Information Expert |
| `Consumo` | Um pedido aceito na quota, com início, fim e quantidade | Alta coesão (parte de `Quota`) |
| `Pedido` (value object) | Os dados de uma solicitação no vocabulário de quotas: projeto, tipo de recurso, quantidade, início, fim e papel do solicitante | Baixo acoplamento, Protected Variations |
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
- **`Reserva` (Information Expert / Encapsulamento):** Controla os dados da solicitação (recurso, projeto, período, quantidade e o id do solicitante) e as transições de estado (`aprovar()`, `ativar()`, `encerrar()`, `cancelar()`, `rejeitar()`), impedindo transições inválidas. `aprovar()` e `rejeitar()` registram o id do responsável e a data da decisão. REJEITADA é sempre decisão de um aprovador; a falta de capacidade não gera reserva rejeitada. `cancelar()` vale para reservas PENDENTE, APROVADA ou ATIVA; em reservas já REJEITADA, CANCELADA ou ENCERRADA é um erro. `ativar()` marca o acesso como liberado, e o agendador revoga o acesso de toda reserva ENCERRADA ou CANCELADA que ainda o tenha liberado. Depois de revogar com sucesso, o acesso deixa de estar marcado como liberado, para que o agendador não reprocesse a mesma reserva.
- **`Usuario` (Information Expert):** Representa quem está usando o sistema, com o papel obtido da autenticação institucional e os dados de contato usados nas notificações. As políticas usam esse papel, por exemplo para restringir um recurso a doutorandos.
- **`Projeto` (Information Expert):** Agrupa os pesquisadores, tem um responsável (um `Usuario` com papel de orientador), que é quem pode aprovar ou rejeitar as reservas pendentes do projeto, e detém as quotas. O responsável é guardado pelo id do usuário, para que o módulo de quotas não dependa do módulo de identidade.
- **`Quota` (Information Expert):** Guarda o limite definido pelo administrador e um registro de `Consumo` com os pedidos aceitos do projeto, pendentes e aprovados, e calcula se uma nova solicitação cabe. Há dois modos (`ModoQuota`), conforme o tipo de recurso. Para GPUs e servidores, a quota é acumulada por mês de calendário, medida em unidade × hora (ex.: GPU-horas), e uma reserva conta inteira no mês em que começa. Para storage, a quota é a capacidade simultânea reservada (TB): um pedido cabe se, em todo o seu período, a soma do storage dos consumos sobrepostos mais o pedido não ultrapassar o limite. Essa checagem usa o registro da própria quota, e não as reservas, então o módulo de quotas não precisa conhecer `Reserva`. `consumir(pedido)` acrescenta um consumo e `devolver(pedido)` o retira, sempre na mesma transação que grava ou cancela a reserva. Mudar o limite é mudar um dado, não o código.
- **`Pedido` (value object):** Leva a quotas e às políticas os dados de uma solicitação: projeto, tipo de recurso, quantidade, início, fim e papel do solicitante. Usa tipos simples em vez de `Reserva` e `Periodo`, que pertencem ao módulo de reservas, para que quotas não dependa de reservas e uma política nova não exija mudar a entidade (ASR2).
- **`PoliticaAutorizacao` (Polymorphism / Protected Variations):** Interface para definir regras de autorização (ex.: aprovação direta vs. exigência de orientador para mais de 2 GPUs ou mais de 72h). Isola o caso de uso de mudanças de regras (ASR2).
- **`SolicitarReservaUseCase` (Controller):** Coordena o fluxo da solicitação (bloqueia o recurso, busca as reservas do período para montar a agenda, verifica disponibilidade e quota, aplica a política, persiste e, se a reserva ficar pendente, consulta o responsável do projeto para o evento), sem assumir regras de negócio das entidades. Executa tudo dentro de uma `UnidadeDeTrabalho`.
- **Demais casos de uso (Controller):** `AprovarReservaUseCase` confere se quem decide é o responsável do projeto; `CancelarReservaUseCase` devolve capacidade e quota; `AtivarReservasUseCase`, `EncerrarReservasUseCase` e `RevogarAcessoUseCase` são chamados pelo agendador e acionam o `Provisionador` fora da transação; `RevogarAcessoUseCase` cuida das reservas canceladas enquanto estavam ativas, que ainda tinham o acesso liberado.
- **`CatalogoRecursos`, `ControleQuotas` e `DiretorioUsuarios` (Indirection):** Interfaces públicas dos módulos de catálogo, de quotas e de identidade (esta última usada por notificações para buscar o destinatário). `CatalogoRecursos` e `ControleQuotas` também oferecem a operação de obter o recurso ou a quota com exclusão mútua até o fim da unidade de trabalho, para que reservas não precise acessar as tabelas desses módulos. `DiretorioUsuarios` é apenas de leitura.
- **Portas de infraestrutura (Pure Fabrication / Indirection):** `RepositorioReservas`, `PublicadorEventos`, `Provisionador`, `UnidadeDeTrabalho`, `Notificador` e `ServicoAutenticacao` isolam o domínio de banco de dados, transação, e-mail, Slurm e LDAP (ASR3).

---

## Eventos de domínio

Publicados pelo núcleo depois do commit: `ReservaPendente`, `ReservaAprovada`, `ReservaRejeitada`, `ReservaCancelada`, `ReservaAtivada` e `ReservaEncerrada`, todos derivados de `EventoReserva`. Os eventos carregam identificadores, e não endereços de contato: todos levam a reserva e o solicitante, `ReservaAprovada` e `ReservaRejeitada` levam o aprovador, e `ReservaPendente` leva o responsável do projeto, que é quem precisa ser avisado.

---

## Operações

Esta tabela é a fonte dos nomes usados nos diagramas e no código.

| Classe | Operações |
|---|---|
| `Recurso` | `comporta(quantidade)` |
| `Periodo` | `sobrepoe(outro)`, `duracao()` |
| `AgendaRecurso` | `verificarDisponibilidade(periodo, quantidade)`, `criarReserva(...)` (levanta indisponibilidade se não houver capacidade) |
| `Reserva` | `aprovar(aprovadorId)`, `rejeitar(aprovadorId)`, `ativar()`, `encerrar()`, `cancelar()` |
| `Quota` | `comporta(pedido)`, `consumir(pedido)`, `devolver(pedido)` |
| `ControleQuotas` | `verificarQuota(pedido)`, `avaliarPoliticas(pedido)`, `consumir(pedido)`, `devolver(pedido)`, `responsavelDe(projeto)` (devolve o id do responsável), `obterParaAtualizacao(projeto, pedido)` |
| `PoliticaAutorizacao` | `avaliar(pedido)`, devolvendo `AUTO_APROVAR`, `EXIGIR_APROVACAO` ou `NEGAR` |
| `CatalogoRecursos` | `buscar(id)`, `obterParaAtualizacao(id)` |
| `RepositorioReservas` | `salvar(reserva)`, `buscarPorId(id)`, `listarPorUsuario(usuario)`, `listarPorRecurso(recurso, periodo)`, `listarParaAtivar(agora)`, `listarParaEncerrar(agora)` |
| `Provisionador` | `liberarAcesso(reserva)`, `revogarAcesso(reserva)` |
| `Notificador` | `notificar(destinatario, mensagem)` |
| `TratadorDeEventos` | `tratar(evento)` |
| `PublicadorEventos` | `publicar(evento)` |
| `ServicoAutenticacao` | `autenticar(credencial)` |
| `DiretorioUsuarios` | `buscar(id)` |
| `UnidadeDeTrabalho` | `executar(operacao)` |
| Casos de uso | `executar(comando)` |

---

## Coesão e acoplamento

Cada classe de domínio concentra uma única responsabilidade de negócio. `Periodo` só trata de tempo, `Recurso` só da capacidade total, `AgendaRecurso` da capacidade livre num período, `Quota` do consumo do projeto e `Reserva` do próprio estado. Os casos de uso orquestram e não decidem regra nenhuma. Os módulos também são coesos por assunto de negócio (catálogo, reservas, quotas, notificações, provisionamento, identidade), e não por camada técnica, então uma mudança numa regra de quota fica dentro do módulo de quotas.

O único acoplamento entre módulos de negócio é o de reservas com catálogo e quotas, e ele existe de propósito: uma solicitação precisa do recurso, da agenda e da quota na mesma transação (ASR1). Mesmo assim, reservas usa só as interfaces públicas `CatalogoRecursos` e `ControleQuotas`, e não as entidades internas nem as tabelas desses módulos. No sentido contrário não há dependência: quotas recebe um `Pedido` e mantém o próprio registro de `Consumo`, sem conhecer `Reserva`. Por isso não há ciclo entre os módulos, e uma política nova não mexe na entidade.

O núcleo também não conhece notificações nem provisionamento. Ele publica eventos e chama a porta `Provisionador`, que ele mesmo define, e são esses módulos que dependem dele (ASR3). Notificações conhece apenas os eventos e `DiretorioUsuarios`. Reservas e quotas guardam usuários pelo id, então só o adaptador REST e notificações lidam com `Usuario`. O domínio não depende de framework, banco ou serviço externo, e os casos de uso conhecem apenas abstrações, o que permite testá-los com fakes.

O custo é ter mais tipos e alguma duplicação. O período e a quantidade de uma reserva aparecem também no `Consumo` da quota, e os dois precisam ficar coerentes. Isso é garantido porque `consumir` e `devolver` rodam na mesma transação que grava ou cancela a reserva.

---

## SOLID pertinente

- **SRP:** o caso de uso orquestra o fluxo, enquanto as entidades decidem sobre seu próprio estado.
- **OCP:** novas políticas de autorização são adicionadas criando novas classes que implementam `PoliticaAutorizacao`, sem alterar o código existente.
- **ISP:** portas pequenas e específicas (`Notificador` trata apenas de avisos e não sabe nada de provisionamento).
- **DIP:** casos de uso dependem de portas (interfaces), não de implementações de infraestrutura.
