*De acordo com item 9 do enunciado*

---

# Análise de evolução

Em ambas as mudanças a seguir, o que muda é um adaptador na borda do sistema. O domínio e os casos de uso permanecem. O que varia é o quanto aquela borda já estava isolada: quando a integração está inteira atrás de uma porta, a troca é quase só configuração. Quando a borda carrega parte de uma garantia de negócio, a troca cobra reescrever essa parte.

---

## Mudança 1 - E-mail -> WhatsApp/Telegram

Trocar o canal de notificação por um serviço de mensagens.

- **Afetado:** um novo adaptador (ex.: `WhatsAppNotificador`) implementando a porta `Notificador`; a linha de composição no `app/` que escolhe a implementação; e, em identidade, o `Usuario` passa a guardar o contato do novo canal (número ou ID), além ou no lugar do e-mail.
- **Inalterado:** o domínio e os casos de uso de reservas; os eventos (`ReservaPendente`, `ReservaAprovada`, ...); o `PublicadorEventos` e o tratador de eventos de notificações; o `DiretorioUsuarios`; a persistência; e a API. O tratador continua chamando `Notificador.notificar(destinatario, mensagem)` com um `Usuario`, sem saber qual é o canal.
- **Decisões que ajudam:** a arquitetura hexagonal (ADR-002) - o `Notificador` é uma porta pequena que fala a língua do domínio e recebe um `Usuario`, não um endereço de e-mail, então o canal concreto fica preso ao adaptador. A notificação é assíncrona por eventos, então mexer no canal não toca o fluxo da reserva. Como só o `app/` conhece a implementação, a troca é uma mudança de configuração.
- **Decisões que dificultam:** o barramento de eventos é em memória (ADR-002), e um evento pode se perder se o servidor cair entre o commit e a entrega. Para e-mail isso é tolerável, mas um canal que exija entrega garantida ou confirmação pediria gravar os eventos no banco (outbox) ou uma fila - a própria evolução registrada no ADR-002. E o `Usuario` precisa carregar o contato do novo canal: é um dado novo em identidade, não código, mas alguém tem de preenchê-lo no cadastro ou no SSO.

---

## Mudança 2 - PostgreSQL -> outro banco

Trocar o mecanismo de persistência (ex.: por um banco sem `EXCLUDE USING gist`).

- **Afetado:** as implementações SQL dos repositórios (`RepositorioReservas` e os de catálogo e quotas) e da `UnidadeDeTrabalho`; os scripts de schema e migração; e, principalmente, as garantias de concorrência do ASR1 que hoje moram no PostgreSQL - a exclusion constraint (`tstzrange` com `EXCLUDE USING gist`), que impede a sobreposição de recursos exclusivos, e o bloqueio de linha (`SELECT ... FOR UPDATE`) atrás do `obterParaAtualizacao`. Num banco sem constraint equivalente, a não-sobreposição exclusiva precisa ser reimplementada na aplicação, dentro do lock.
- **Inalterado:** o domínio (`AgendaRecurso`, `Quota`, `Reserva` e as políticas) e os casos de uso; a API; os adaptadores externos (`Notificador`, `Provisionador`) e identidade; e a porta `UnidadeDeTrabalho` em si - só a implementação muda. A verificação de quota de storage por sobreposição já roda na aplicação (dentro do lock), então ela é portável sem depender de recurso específico do banco.
- **Decisões que ajudam:** a persistência fica atrás de portas (`RepositorioReservas`, `UnidadeDeTrabalho`), e `obterParaAtualizacao` é um nome neutro: cada adaptador decide como garantir a exclusão mútua (ADR-002 e ADR-003). O protótipo já roda em SQLite no lugar do PostgreSQL, então a troca de banco já foi exercitada uma vez.
- **Decisões que dificultam:** o ADR-003 decidiu, de propósito, colocar parte da garantia do ASR1 no banco, porque assim ela vale mesmo com um erro na aplicação. O preço aparece exatamente aqui: trocar de banco pode significar reescrever essa garantia. Se o novo banco não tiver uma exclusion constraint equivalente, a não-sobreposição volta para a aplicação; se não tiver bloqueio de linha comparável ao `FOR UPDATE`, o esquema de lock pessimista muda. Esse custo está registrado nas consequências negativas do ADR-003.

---

## O que se repete

Nas duas mudanças, o domínio e os casos de uso ficam intactos e o trabalho se concentra num adaptador da borda. A diferença é o grau de isolamento: o canal de notificação estava inteiro atrás da porta `Notificador`, então a troca é quase só configuração; a persistência carrega parte de uma garantia de negócio (ASR1) que não dá para expressar só no domínio, então a troca cobra reescrever essa parte. O sistema evolui trocando peças da borda, e as dependências que criamos de propósito, como a garantia no banco, são justamente as que aparecem quando a peça muda.
