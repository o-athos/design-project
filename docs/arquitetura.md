# Proposta arquitetural

O sistema é um monolito modular acessado no modelo cliente-servidor, e cada módulo é organizado por dentro com arquitetura hexagonal (portas e adaptadores)

```
Cliente-servidor (API REST)
+
Monolito modular
+
Hexagonal dentro de cada módulo
```

## Como cada estilo aparece na solução

O lado cliente-servidor é o mais simples. Existe um único servidor, implantado na infraestrutura do Dinf, que expõe uma API REST. Os clientes (uma CLI ou um front web simples) só falam com ele por HTTP e nunca acessam o banco ou os serviços externos diretamente. Se um dia surgir um app mobile, ele consome a mesma API.

Esse servidor é um monolito: um processo só, com um banco só. Escolhemos assim por causa do ASR1. Verificar disponibilidade e quota e gravar a reserva precisa acontecer numa transação local, e isso fica simples quando tudo roda no mesmo processo e no mesmo banco. A equipe pequena e o prazo de um semestre, listados nas restrições, também descartam microsserviços: vários deploys, orquestração e consistência entre serviços teriam um custo que o projeto não comporta (ADR-001). Mesmo sendo um processo só, o código é dividido em módulos de negócio, e um módulo só usa outro pela interface pública dele.

Dentro de cada módulo aplicamos a arquitetura hexagonal (ADR-002). O domínio, com as entidades e as regras, fica no centro e não importa framework, banco nem HTTP. Em volta dele ficam os casos de uso, que definem as portas de que precisam. Na borda ficam os adaptadores: o controlador REST, o repositório SQL e os clientes de e-mail e de provisionamento. A dependência sempre aponta para o centro, ou seja, adaptadores dependem da aplicação e a aplicação depende do domínio. Com isso dá para trocar uma integração mexendo só num adaptador e rodar os testes com fakes (ASR3), e o domínio fica livre para receber políticas novas (ASR2).

No código, a organização fica assim:

```
src/
|-- catalogo/           Recurso, CatalogoRecursos
|-- reservas/           núcleo do sistema
|   |-- dominio/        Reserva, Periodo, AgendaRecurso, eventos (ReservaAprovada, ...)
|   |-- aplicacao/      SolicitarReservaUseCase, AtivarReservasUseCase, EncerrarReservasUseCase
|   |                   e demais casos de uso; portas RepositorioReservas, Provisionador, PublicadorEventos
|   `-- adaptadores/    controlador REST, agendador, RepositorioReservas em SQL
|-- quotas/             Projeto, Quota, ControleQuotas, PoliticaAutorizacao e políticas concretas
|-- notificacoes/       tratador de eventos, porta Notificador, EmailNotificador, NotificadorFake
|-- provisionamento/    SlurmProvisionador (stub), ProvisionadorFake
|-- identidade/         Usuario, porta ServicoAutenticacao, ServicoAutenticacaoFake
`-- app/                composição: cria os adaptadores e injeta nos casos de uso
```

Nem todo módulo precisa das três pastas. Catálogo e identidade são pequenos e podem ficar num nível só, mas seguem a mesma regra de dependência. Reservas, que é o núcleo, usa a divisão completa.

A pasta `app/` não é um módulo de negócio. Ela monta o sistema: cria os adaptadores concretos (`EmailNotificador`, `ProvisionadorFake`, o repositório SQL) e entrega cada um à porta correspondente. Como é o único lugar que conhece essas classes, trocar uma implementação é uma mudança de configuração feita ali.

## Módulos

Reservas é o núcleo. Ele solicita, aprova, rejeita e cancela reservas, responde às consultas de reservas de um usuário e da agenda de um recurso e controla o ciclo de vida da reserva. É onde ficam `Reserva`, `Periodo`, `AgendaRecurso` e `SolicitarReservaUseCase`, e cobre os RF02, RF03, RF05, RF06 e RF07.

Nem toda mudança de estado começa com uma requisição. A reserva vira ATIVA quando o período começa e ENCERRADA quando termina, e é nesses momentos que o acesso é provisionado e revogado (RF09) e os envolvidos são avisados (RF08). Por isso o núcleo tem um segundo adaptador de entrada além do REST: um agendador que roda periodicamente dentro do próprio servidor e chama `AtivarReservasUseCase` e `EncerrarReservasUseCase`. São esses casos de uso que chamam o `Provisionador`, e não a solicitação.

Dois módulos dão suporte às regras do núcleo. Catálogo cadastra e consulta os recursos com tipo e capacidade (`Recurso`, RF01). Quotas e Políticas guarda a quota e o consumo de cada projeto e decide, por meio de políticas plugáveis, se um pedido é aprovado direto, se precisa de aprovação ou se é negado (`Projeto`, `Quota` e `PoliticaAutorizacao`, RF04 e RF05).

Os demais existem para isolar sistemas externos. Notificações avisa solicitante e aprovador quando uma reserva muda de estado (RF08). Provisionamento libera o acesso ao recurso no sistema externo quando a reserva começa e retira quando ela termina (RF09). Identidade reconhece o usuário pela conta institucional, como exigem as restrições, e devolve um `Usuario` com o papel dele: aluno, doutorando, orientador ou administrador.

## Dependências entre os módulos

```
                     catalogo        quotas
                         ^              ^
                         |              |
  identidade <------- reservas ---------+
                       ^     ^
                       |     |
          notificacoes       provisionamento

  app ---> todos os módulos
```

Reservas depende de catálogo, para buscar o recurso e a capacidade dele, e de quotas, para verificar e consumir a quota do projeto e aplicar as políticas. O adaptador REST de reservas também usa identidade para saber quem fez a requisição e com qual papel. Catálogo, quotas e identidade não dependem de nenhum outro módulo, então não há ciclos.

Com notificações e provisionamento a seta é invertida. O núcleo publica eventos (`ReservaAprovada` e outros) e chama a porta `Provisionador`, que ele mesmo define. Notificações assina esses eventos e provisionamento implementa a porta, então são esses dois módulos que dependem de reservas. Por isso trocar o e-mail ou o Slurm não exige mudar nada no núcleo.

Quotas também não conhece `Reserva`. Ele recebe os dados do pedido no próprio vocabulário: projeto, tipo de recurso, quantidade, duração e papel do solicitante. Se recebesse a entidade, reservas e quotas passariam a depender um do outro, e uma política nova poderia obrigar a mexer em `Reserva`, o que contraria o ASR2.

Um módulo nunca acessa as classes internas ou as tabelas de outro. A linguagem não impede que um módulo importe classes internas de outro, então essa regra será verificada por um teste de arquitetura que falha quando surgir uma dependência fora do diagrama de componentes. O risco está registrado no ADR-001.

## Interfaces relevantes

Os módulos de suporte oferecem duas interfaces públicas, ambas usadas pelos casos de uso de reservas. `CatalogoRecursos` serve para consultar recursos e `ControleQuotas` para verificar, consumir e devolver a quota de um projeto.

As portas de saída do núcleo ficam em `reservas/aplicacao`. `RepositorioReservas` tem uma implementação SQL e outra em memória para os testes. `Provisionador` tem `SlurmProvisionador`, que por enquanto é um stub, e `ProvisionadorFake`. `PublicadorEventos` é implementado por um barramento de eventos em memória, dentro do próprio processo.

`Notificador` pertence ao módulo de notificações e é usado pelo tratador de eventos, com as implementações `EmailNotificador` e `NotificadorFake`. `ServicoAutenticacao` pertence a identidade e é usado pelo adaptador REST. No protótipo ele é implementado por `ServicoAutenticacaoFake`, com um usuário fixo; na versão real seria LDAP ou SSO.

`PoliticaAutorizacao` é o ponto de extensão do módulo de quotas. Cada política devolve `AUTO_APROVAR`, `EXIGIR_APROVACAO` ou `NEGAR`, e quando várias se aplicam ao mesmo pedido vale a mais restritiva. A primeira implementação é `PoliticaLimiteGpuDuracao`, que exige aprovação para mais de 2 GPUs ou mais de 72h. Para criar a regra "GPU XYZ apenas para doutorandos", basta escrever `PoliticaGpuApenasDoutorandos` e registrá-la em `app/`. O `SolicitarReservaUseCase` recebe a lista de políticas por injeção e continua igual.

As portas falam a língua do domínio. O `Provisionador` recebe pedidos como "liberar o acesso da reserva X" e "revogar o acesso da reserva X", sem nenhum comando ou conceito do Slurm. Se a porta expusesse detalhes de um provisionador específico, trocar de provisionador deixaria de ser só a troca de um adaptador (ADR-002).
