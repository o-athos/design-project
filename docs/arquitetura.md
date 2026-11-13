*De acordo com item 4 e 8 do enunciado*

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
|-- catalogo/           Recurso, CatalogoRecursos (interface pública)
|-- reservas/           núcleo do sistema
|   |-- dominio/        Reserva, Periodo, AgendaRecurso, eventos (ReservaPendente, ReservaAprovada, ...)
|   |-- aplicacao/      SolicitarReservaUseCase, AprovarReservaUseCase, CancelarReservaUseCase,
|   |                   AtivarReservasUseCase, EncerrarReservasUseCase, RevogarAcessoUseCase; portas RepositorioReservas,
|   |                   Provisionador, PublicadorEventos, UnidadeDeTrabalho
|   `-- adaptadores/    controlador REST, agendador, RepositorioReservas em SQL
|-- quotas/             Projeto, Quota, ControleQuotas (interface pública), PoliticaAutorizacao e políticas concretas
|-- notificacoes/       tratador de eventos, porta Notificador, EmailNotificador, NotificadorFake
|-- provisionamento/    SlurmProvisionador (stub), ProvisionadorFake
|-- identidade/         Usuario, DiretorioUsuarios (interface pública), porta ServicoAutenticacao, ServicoAutenticacaoFake
`-- app/                composição: cria os adaptadores e injeta nos casos de uso
```

Nem todo módulo precisa das três pastas. Catálogo e identidade são pequenos e podem ficar num nível só, mas seguem a mesma regra de dependência. Reservas, que é o núcleo, usa a divisão completa.

A pasta `app/` não é um módulo de negócio. Ela monta o sistema: cria os adaptadores concretos (`EmailNotificador`, `ProvisionadorFake`, os repositórios SQL e a `UnidadeDeTrabalho` SQL) e entrega cada um à porta correspondente. Como é o único lugar que conhece essas classes, trocar uma implementação é uma mudança de configuração feita ali.

## Módulos

Reservas é o núcleo. Ele solicita, aprova, rejeita e cancela reservas, responde às consultas de reservas de um usuário e da agenda de um recurso e controla o ciclo de vida da reserva. É onde ficam `Reserva`, `Periodo`, `AgendaRecurso` e `SolicitarReservaUseCase`, e cobre os RF02, RF03, RF05, RF06 e RF07.

Nem toda mudança de estado começa com uma requisição. A reserva vira ATIVA quando o período começa e ENCERRADA quando termina, e é nesses momentos que o acesso é provisionado e revogado (RF09) e os envolvidos são avisados (RF08). Por isso o núcleo tem um segundo adaptador de entrada além do REST: um agendador que roda periodicamente dentro do próprio servidor e chama `AtivarReservasUseCase`, `EncerrarReservasUseCase` e `RevogarAcessoUseCase`. São esses casos de uso que chamam o `Provisionador`, e não a solicitação nem o cancelamento. Quando uma reserva ATIVA é cancelada, `CancelarReservaUseCase` só devolve capacidade e quota e muda o estado para CANCELADA; depois o agendador percebe que o acesso ainda está liberado e chama `RevogarAcessoUseCase`.

Dois módulos dão suporte às regras do núcleo. Catálogo cadastra e consulta os recursos com tipo e capacidade (`Recurso`, RF01). Quotas e Políticas guarda as quotas e o consumo de cada projeto, sabe quem é o responsável por ele e decide, por meio de políticas plugáveis, se um pedido é aprovado direto, se precisa de aprovação ou se é negado (`Projeto`, `Quota` e `PoliticaAutorizacao`, RF04 e RF05).

Os demais existem para isolar sistemas externos. Notificações avisa solicitante e aprovador quando uma reserva muda de estado (RF08). Provisionamento libera o acesso ao recurso no sistema externo quando a reserva começa e retira quando ela termina ou é cancelada (RF09). Identidade reconhece o usuário pela conta institucional, como exigem as restrições, e devolve um `Usuario` com o papel e o contato dele: aluno, doutorando, orientador ou administrador.

## Dependências entre os módulos

```
                     catalogo        quotas
                         ^              ^
                         |              |
  identidade <------- reservas ---------+
      ^                ^     ^
      |                |     |
      +--- notificacoes      provisionamento

  app ---> todos os módulos
```

Reservas depende de catálogo, para buscar o recurso e a capacidade dele, e de quotas, para verificar e consumir a quota do projeto e aplicar as políticas. O adaptador REST de reservas também usa identidade para saber quem fez a requisição e com qual papel. Catálogo, quotas e identidade não dependem de nenhum outro módulo, então não há ciclos.

Com notificações e provisionamento a seta é invertida. O núcleo publica eventos (`ReservaPendente`, `ReservaAprovada` e outros) e chama a porta `Provisionador`, que ele mesmo define. Notificações assina esses eventos e provisionamento implementa a porta, então são esses dois módulos que dependem de reservas. Notificações também depende de identidade, pela interface pública `DiretorioUsuarios`, para buscar o `Usuario` e o contato dele a partir dos identificadores que o evento carrega. Por isso trocar o e-mail ou o Slurm não exige mudar nada no núcleo.

Quotas também não conhece `Reserva`. Ele recebe os dados do pedido no próprio vocabulário: projeto, tipo de recurso, quantidade, duração e papel do solicitante. Se recebesse a entidade, reservas e quotas passariam a depender um do outro, e uma política nova poderia obrigar a mexer em `Reserva`, o que contraria o ASR2.

Um módulo nunca acessa as classes internas ou as tabelas de outro. A linguagem não impede que um módulo importe classes internas de outro, então essa regra será verificada por um teste de arquitetura que falha quando surgir uma dependência fora do diagrama de componentes. O risco está registrado no ADR-001.

## Interfaces relevantes

Os módulos de suporte oferecem três interfaces públicas. `CatalogoRecursos` e `ControleQuotas` são usadas pelos casos de uso de reservas. `CatalogoRecursos` serve para consultar recursos. `ControleQuotas` serve para verificar, consumir e devolver a quota de um projeto, avaliar as políticas e consultar o responsável pelo projeto (`responsavelDe`), que é quem pode aprovar ou rejeitar as reservas pendentes dele. `DiretorioUsuarios`, de identidade, é usada pelo tratador de eventos de notificações para buscar o `Usuario` pelo identificador.

As duas primeiras também oferecem a operação de obter o recurso ou a quota com exclusão mútua até o fim da unidade de trabalho (`obterParaAtualizacao`). O nome é neutro: só o adaptador SQL do módulo dono sabe que isso vira `SELECT ... FOR UPDATE`, e nos fakes em memória a operação não faz nada. Assim reservas não acessa as tabelas de outros módulos.

As portas de saída do núcleo ficam em `reservas/aplicacao`. `RepositorioReservas` tem uma implementação SQL e outra em memória para os testes. `Provisionador` tem `SlurmProvisionador`, que por enquanto é um stub, e `ProvisionadorFake`. `PublicadorEventos` é implementado por um barramento de eventos em memória, dentro do próprio processo. `UnidadeDeTrabalho` delimita a transação: executa uma operação e confirma ou desfaz tudo no fim, e permite registrar ações para depois do commit, como a publicação dos eventos. A implementação SQL usa a mesma sessão de banco dos repositórios de reservas, catálogo e quotas, ligados em `app/`, e para os testes há uma implementação em memória.

`Notificador` pertence ao módulo de notificações e é usado pelo tratador de eventos, que passa o `Usuario` destinatário e a mensagem, e não um endereço de e-mail. As implementações são `EmailNotificador` e `NotificadorFake`. `ServicoAutenticacao` pertence a identidade e é usado pelo adaptador REST. No protótipo ele é implementado por `ServicoAutenticacaoFake`, com um usuário fixo; na versão real seria LDAP ou SSO.

`PoliticaAutorizacao` é o ponto de extensão do módulo de quotas. Cada política devolve `AUTO_APROVAR`, `EXIGIR_APROVACAO` ou `NEGAR`, e quando várias se aplicam ao mesmo pedido vale a mais restritiva. A primeira implementação é `PoliticaLimiteGpuDuracao`, que exige aprovação para mais de 2 GPUs ou mais de 72h. Para criar a regra "GPU XYZ apenas para doutorandos", basta escrever `PoliticaGpuApenasDoutorandos` e registrá-la em `app/`. O `SolicitarReservaUseCase` recebe a lista de políticas por injeção e continua igual.

As portas falam a língua do domínio. O `Provisionador` recebe pedidos como "liberar o acesso da reserva X" e "revogar o acesso da reserva X", sem nenhum comando ou conceito do Slurm. Se a porta expusesse detalhes de um provisionador específico, trocar de provisionador deixaria de ser só a troca de um adaptador (ADR-002).

## Mecanismos e decisões de comunicação

Entre cliente e servidor a comunicação é HTTP/REST síncrona, com JSON. O cliente envia um pedido e recebe na mesma resposta se a reserva foi aprovada, ficou pendente ou foi recusada. Não há motivo para algo mais elaborado: os clientes são simples e a carga esperada é baixa.

Entre os módulos, as chamadas são síncronas e acontecem dentro do mesmo processo, por meio das interfaces públicas (`CatalogoRecursos`, `ControleQuotas`). Isso permite que a verificação de disponibilidade, a verificação de quota e a gravação da reserva fiquem na mesma transação, como o ASR1 exige. Se os módulos conversassem pela rede, essa transação viraria uma transação distribuída (ADR-001).

As notificações são assíncronas. O caso de uso publica um evento de domínio (`ReservaPendente`, `ReservaAprovada`, `ReservaRejeitada`, `ReservaCancelada`, `ReservaAtivada`, `ReservaEncerrada`) pela porta `PublicadorEventos`, e o barramento só entrega o evento depois que a transação foi confirmada. O tratador do módulo de notificações processa o evento separadamente, busca o destinatário em `DiretorioUsuarios` e chama o `Notificador`. Uma falha no envio de e-mail fica registrada em log e não desfaz nem bloqueia a reserva (ASR3). O preço é a consistência eventual: o aviso pode chegar alguns instantes depois da mudança de estado e, como o barramento é em memória, um evento pode se perder se o servidor cair nesse intervalo. Para o contexto do Dinf isso é aceitável. O ADR-002 registra a consistência eventual como custo da decisão, junto com a necessidade de tratar falhas e reenvios.

O agendador é o único mecanismo disparado pelo relógio. Ele roda periodicamente dentro do servidor e trata três situações: as reservas aprovadas cujo período começou vão para `AtivarReservasUseCase`, que libera o acesso; as reservas ativas cujo período terminou vão para `EncerrarReservasUseCase`, que revoga o acesso e as encerra; e as reservas canceladas enquanto estavam ativas, que seguem com o acesso liberado, vão para `RevogarAcessoUseCase`. A chamada ao `Provisionador` acontece fora de qualquer transação de reserva, para que um sistema externo lento não segure o lock do recurso (ADR-003). Se o provisionamento falhar, a reserva continua no estado anterior (ou com o acesso ainda marcado como liberado, no caso da revogação) e o agendador tenta de novo na execução seguinte.

## Persistência

O sistema usa um único banco PostgreSQL, compartilhado pelos módulos (ADR-001). Cada módulo tem as próprias tabelas e só acessa as suas, sempre pelo próprio repositório. Reservas usa `RepositorioReservas`, e catálogo e quotas têm repositórios equivalentes. Assim o banco é um só, mas a fronteira entre os módulos continua valendo também nos dados.

A garantia do ASR1 fica na transação delimitada pela `UnidadeDeTrabalho`, dentro da qual o `SolicitarReservaUseCase` verifica a disponibilidade, verifica e consome a quota e grava a reserva (ADR-003). Para recursos contáveis, como GPUs e storage, a transação obtém o recurso com exclusão mútua (`CatalogoRecursos.obterParaAtualizacao`, que no PostgreSQL vira `SELECT ... FOR UPDATE`) antes de calcular a capacidade livre, então dois pedidos para o mesmo recurso são avaliados um de cada vez. Em seguida obtém do mesmo jeito a quota do projeto (`ControleQuotas.obterParaAtualizacao`) — a do mês de início, para GPU-horas; a de capacidade de storage, para storage —, para que dois pedidos do mesmo projeto também não passem juntos pela verificação de quota. A ordem é sempre recurso e depois quota, o que evita deadlock. Para servidores de uso exclusivo, o banco também impede períodos sobrepostos com uma exclusion constraint (`tstzrange` com `EXCLUDE USING gist`) na tabela de reservas, que guarda só o identificador do recurso e considera apenas reservas pendentes, aprovadas ou ativas. Assim a regra vale mesmo que a aplicação tenha um erro. Pedidos para recursos diferentes, de projetos diferentes, não disputam o mesmo lock.

O protótipo usa SQLite com transação e lock de escrita no lugar do PostgreSQL. O teste de concorrência do ASR1 funciona igual, mas a exclusion constraint não é exercitada no protótipo. Os testes de domínio e de caso de uso não usam banco: recebem o repositório em memória.

## Integrações externas

O sistema conversa com três sistemas externos, e cada um fica atrás de uma porta:

- Autenticação institucional (LDAP/SSO), atrás de `ServicoAutenticacao`. No protótipo, `ServicoAutenticacaoFake` devolve um usuário fixo.
- Provisionador de recursos (Slurm, OpenStack ou Proxmox; ainda não definido), atrás de `Provisionador`. No protótipo, `SlurmProvisionador` é um stub que só registra o comando que seria executado, e os testes usam `ProvisionadorFake`.
- Serviço de e-mail, atrás de `Notificador`. `EmailNotificador` envia por SMTP, e para rodar localmente pode apontar para o Mailpit, que captura as mensagens sem enviá-las de verdade. Os testes usam `NotificadorFake`.

Nenhuma dessas integrações é chamada diretamente por um caso de uso ou por uma entidade. O domínio não sabe que elas existem.

## Dependência externa

As duas integrações substituíveis implementadas no protótipo são estas:

```
Notificador (porta do módulo notificacoes)
|-- EmailNotificador     SMTP real ou Mailpit local
`-- NotificadorFake      guarda as mensagens em memória, usado nos testes

Provisionador (porta definida pelo núcleo, em reservas/aplicacao)
|-- SlurmProvisionador   stub que registra o comando que seria executado
`-- ProvisionadorFake    registra as chamadas em memória, usado nos testes
```

Em termos de interface, cada porta é pequena e fala a língua do domínio: o `Notificador` sabe enviar um aviso a um `Usuario`, e o `Provisionador` sabe liberar e revogar o acesso de uma reserva. Nenhuma delas expõe SMTP ou comandos do Slurm.

Quanto às dependências, os casos de uso e o tratador de eventos dependem só das portas. As implementações concretas dependem das portas, e não o contrário, e só o `app/` sabe qual implementação está em uso.

Na testabilidade, os testes trocam as implementações reais pelos fakes. Assim, eles rodam sem rede e conseguem verificar se o aviso foi enviado ou se o acesso foi liberado olhando o que o fake registrou.

Na modificabilidade, trocar e-mail por Telegram ou Slurm por OpenStack é escrever um adaptador novo que implementa a mesma porta e mudar uma linha no `app/`. Domínio, casos de uso, banco e API ficam iguais. O `evolucao.md` analisa essas trocas.

## Documentação da API

A API cobre o caso de uso principal e as consultas do protótipo:

| Método e rota | O que faz | Respostas |
|---|---|---|
| `POST /reservas` | Solicita uma reserva (recurso, quantidade, início, fim, projeto) | 201 com a reserva APROVADA ou PENDENTE; 400 período inválido; 403 pedido negado por política; 409 recurso indisponível; 422 quota excedida |
| `GET /reservas` | Lista as reservas do usuário autenticado | 200 |
| `GET /recursos/{id}/agenda?inicio=&fim=` | Mostra a ocupação e a capacidade livre de um recurso no período | 200; 404 recurso inexistente |
| `POST /reservas/{id}/aprovacao` | O responsável aprova ou rejeita uma reserva pendente | 200; 403 usuário não é responsável pelo projeto; 409 reserva não está pendente |
| `DELETE /reservas/{id}` | Cancela uma reserva pendente, aprovada ou ativa, devolvendo capacidade e quota | 204; 409 reserva já encerrada, cancelada ou rejeitada |

A diferença entre 409 e 422 é intencional: 409 significa que o recurso não tem capacidade no período, e outro horário pode funcionar; 422 significa que o projeto não tem quota, e trocar o horário não resolve. A especificação completa, com os formatos de requisição e resposta, será publicada em OpenAPI junto com o código.
