De acordo com item 1 do enunciado

## Contexto

a) O Dinf mantém um cluster compartilhado de servidores, GPUs e armazenamento, usado por alunos e grupos de pesquisa.  
As reservas são feitas por e-mail, o que gera conflito de horário, uso acima do combinado e falta de controle sobre quem autorizou o quê. 
O sistema centraliza solicitações, verifica disponibilidade e quotas, aplica regras de autorização e libera acesso aos recursos.

---

b) Atores  
- Solicitante: aluno/pesquisador que pede recursos.
- Responsável/aprovador: orientador ou coordenador de projetos que autoriza pedidos acima de certos limites.
- Administrador de infraestrutura: cadastra recursos, define quotas e resolve exceções.
- Sistemas externos: autenticação institucional, provisionador de recursos (Slurm, OpenStack, Proxmox?) e serviço de notificação (e-mail).

---

c) Requisitos funcionais  

1. RF01: Cadastrar e consultar o catálogo de recursos (tipo e capacidade, "servidor X com 4 GPUs Y").
2. RF02: Solicitar reserva de um recurso para um período (início/fim) e quantidade.
3. RF03: Consultar a disponibilidade de um recurso em um período.
4. RF04: Definir (administrador) e consultar a quota e o consumo do projeto, por tipo de recurso. Para GPUs e servidores, a quota é acumulada por mês de calendário, medida em unidade × hora (ex.: GPU-horas por mês), e uma reserva conta inteira no mês em que começa, sem divisão entre meses. Para storage, a quota é a capacidade simultânea reservada (ex.: TB): um pedido só é aceito se, em todo o seu período, a soma do storage reservado pelo projeto não ultrapassar o limite.
5. RF05: Aprovar ou rejeitar solicitações conforme a política de autorização ("mais de 2 GPUs ou mais de 72h exige aprovação de orientador"). Pedido que exige aprovação fica pendente, já ocupando capacidade e quota, até o responsável decidir. Só o responsável pelo projeto pode decidir. A decisão registra quem aprovou ou rejeitou e quando, e a rejeição devolve capacidade e quota.
6. RF06: Cancelar uma reserva pendente, aprovada ou ativa, devolvendo capacidade e quota. O cancelamento de uma reserva ativa também revoga o acesso ao recurso.
7. RF07: Consultar as reservas do usuário e a agenda de ocupação de um recurso.
8. RF08: Notificar os envolvidos sobre mudanças de estado (pendente, aprovada, rejeitada, cancelada, início, fim).
9. RF09: Provisionar e liberar o acesso ao recurso no início e no fim da reserva, e também no cancelamento de uma reserva ativa, via sistema externo.

---

d) Restrições

- Autenticação deve ser com conta institucional.
- Implantação em servidor próprio do Dinf.
- Equipe pequena e prazo de 1 semestre.
- Recursos heterogêneos: GPU é contável, storage é medido em capacidade, servidor pode ser de uso exclusivo.
- O provisionador real ainda não está definido e pode mudar.

---

e) ASRs

- ASR1 - Consistência de alocação sob concorrência: solicitações simultâneas para o mesmo recurso e período nunca podem resultar em alocação acima da capacidade,  
e nenhuma solicitação aceita pode fazer um projeto exceder sua quota. Reservas pendentes e aprovadas contam para a capacidade e para a quota. (Recurso com 1 GPU livre num horário e 20 pedidos simultâneos de 1 GPU para esse horário, todos dentro do limite de aprovação automática: exatamente 1 vira reserva aprovada e 19 são recusados por indisponibilidade, sem criar reserva.)

- ASR2 - Modificabilidade das políticas de autorização: uma nova regra ("GPU XYZ apenas para doutorandos") deve ser adicionada criando uma nova classe de política,  
sem alterar o caso de uso de solicitação nem as entidades existentes. Os limites de quota são dados configurados pelo administrador, então mudar um limite não exige mudar código.

- ASR3 - Substituibilidade das integrações externas e testabilidade: trocar o provisionador ou o canal de notificação deve afetar apenas um adaptador. Os testes de domínio e de caso de uso devem  
rodar sem rede, e uma falha no notificador não pode impedir a criação da reserva.

---

f) Por que influenciam a arquitetura

- ASR1: exige transação atômica sobre verificar e reservar. Favorece banco único e monolito.
- ASR2: políticas isoladas e plugáveis (Strategy/Specification) e um domínio sem dependência de infraestrutura (OCP).
- ASR3: leva à arquitetura hexagonal (portas e adaptadores, DIP) e sugere notificação assíncrona.
