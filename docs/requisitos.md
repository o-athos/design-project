De acordo com item 1 do enunciado

## Contexto

a) Dinf mantem um cluster compartilahdo de servidores, GPUs e armazenamento, usado por alunos e grupos de pesquisa.  
As reservas sao feitas por email, o que gera conflito de horario, uso acima do combinado e falta de controle sobre quem autorizou o que. 
O sistema centraliza solicitacoes, verifica disponibilidade e quotas, aplica regras de autorizacao e libera acesso aos recursos.

---

b) Atores  
- Solicitante: Aluno/pesquisador que pede recursos
- Responsavel/aprovador: orientador ou coordenador de projetos que autoriza pedidos acima de certos limites.
- Administrador de infraestrutura: adastra recursos, define quotas e resolve excecoes.
- Sistemas externos: autenticacao institucional, provisionador de recursos (Slurm, OpenStack, Proxmox?) e servico de notificacao (email).

---

c) Requisitos funcionais  

1. RF01: Cadastrar e consultar o catalogo de recursos (tipo e capacidade, "servidor X com 4 gpus y")
2. RF02: Solicitar reserva de um recurso para um periodo (inicio/fim) e qnt.
3. RF03: Consultar a disponibilidade de um recurso em um periodo
4. RF04: Definir (administrador) e consultar a quota e o consumo do projeto ("GPU-horas por mes, TB de storage)
5. RF05: Aprovar ou rejeitar solicitacoes conforme a politica de autorizacao ("mais de 2 GPUs ou mais de 72h exige aprovacao de orientador"). Pedido que exige aprovacao fica pendente, ja ocupando capacidade e quota, ate o responsavel decidir. A decisao registra quem aprovou ou rejeitou e quando, e a rejeicao devolve capacidade e quota
6. RF06: Cancelar um reserva, devolvendo capacidade e quota
7. RF07: Consultar as reservas do usuarioe a agenda de ocupacao de um recurso.
8. RF08: Notificar os envolvidos sobre mudancas de estado (aprovado, rejeitado, inicio, fim)
9: RF09: Provisionar e liberar o acesso ao recurso no inicio e fim da reseerva, via sistema externo

---

d) Restricoes

- Autenticacao deve ser com conta institucional
- Implantacao em servidor proprio do dinf
- Equipe pequena e prazo de 1 semestre
- Recursos heterogeneos: GPU eh contavel, storage eh medido em capacidade, servidor pode ser de uso exclusivo

---

e) ASRs

- ASR1 - Consistencia de alocacao sob concorrencia: Solicitacoes simultaneas para o mesmo recurso e periodo nunca podem resultar em alocacao acima da capacidade,  
e nenhuma solicitacao aceita pode fazer um projeto exceder sua quota. Reservas pendentes e aprovadas contam para a capacidade e para a quota. (Recurso com 1 GPU livre num horario e 20 pedidos simultaneos de 1 GPU para esse horario, todos dentro do limite de aprovacao automatica: exatamente 1 vira reserva aprovada e 19 sao recusados por indisponibilidade, sem criar reserva.)

- ASR2 - modificabilidade das politicas de autorizacao: Uma nova regra ("GPU XYZ apenas para doutorandos") deve ser adicionada criando uma nova classe de politica,  
sem alterar o caso de uso de solicitacao nem as entidades existentes. Os limites de quota sao dados configurados pelo administrador, entao mudar um limite nao exige mudar codigo.

- ASR3 - substitubilidade das integracoes externas e testabilidade: Trocar o provisionador ou o canal de notificacao deve fetar apenas um adaptador. Os testes de dominio e de caso de uso devem  
rodar sem rede, e uma falaha no notificador nao pode impedir a cricao dea reserva.

---

f) Por que influenciam a arquitetura

- ASR1: exige transacao atomica sobre verirficar e reservar. Favorece banco unico e monolito
- ASR2: politicas isoladas e plugaveis (Strategy/Specification) e um dominio sem dependencia de infraestrutura (OCP)
- ASR3: leva `a arquitetura hexagonal(portas e adaptadores, DIP) e sugere notificação assíncrona.