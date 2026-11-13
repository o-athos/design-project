# ADR-002: Arquitetura Hexagonal para integrações externas (ASR3)

**Status:** Aceito

---

## 1. Contexto

O sistema depende de serviços externos: autenticação institucional (LDAP/SSO), provisionador de recursos (Slurm, OpenStack, Proxmox ou outro) e notificação por e-mail. O provisionador real ainda não está definido e pode mudar. As regras de negócio (disponibilidade, quota, autorização) são o valor central do sistema.

---

## 2. Problema e forças envolvidas

- **ASR3:** trocar o provisionador ou o canal de notificação deve afetar apenas um adaptador. Os testes de domínio e de caso de uso devem rodar sem rede, e uma falha no notificador não pode impedir a criação da reserva.
- **ASR2:** o domínio precisa estar livre de dependências de infraestrutura para que novas políticas de autorização sejam adicionadas sem alterar o que já existe (OCP).
- O provisionador é uma incerteza do projeto, e as regras de negócio não podem depender dessa escolha.

Pergunta: como organizar cada módulo para que o domínio não conheça as tecnologias externas?

---

## 3. Alternativas consideradas

**A. Camadas tradicionais (apresentação → serviço → dados).** O serviço chama diretamente SMTP, cliente do provisionador e LDAP.
- Prós: menos classes e menos indireção.
- Contras: o domínio passa a depender da infraestrutura, os testes exigem rede ou mocks acoplados, e trocar o provisionador afeta o serviço.

**B. Hexagonal (portas e adaptadores).** O domínio e os casos de uso ficam no centro e definem portas (interfaces). Os adaptadores implementam as portas e dependem delas (DIP).
- Prós: cada integração fica isolada num adaptador e pode ser substituída por um fake nos testes.
- Contras: mais interfaces e classes do que nas camadas tradicionais.

**C. Clean Architecture / Onion completa.** Mais anéis concêntricos (entidades, casos de uso, adaptadores de interface, frameworks).
- Prós: separação ainda mais rígida.
- Contras: maior trabalho do que o problema necessita para o tamanho da equipe e do prazo.

---

## 4. Decisão

Adotar a **Arquitetura Hexagonal** dentro dos módulos do monolito (ADR-001). As portas são `RepositorioReservas`, `Provisionador`, `PublicadorEventos` e `UnidadeDeTrabalho`, definidas pelo núcleo de reservas, `Notificador`, do módulo de notificações, e `ServicoAutenticacao`, do módulo de identidade. Cada uma é pequena e específica (ISP). As portas que levam a sistemas externos têm uma implementação real ou stub e uma implementação fake:

- `Notificador`: `EmailNotificador` e `NotificadorFake`.
- `Provisionador`: `SlurmProvisionador` (stub) e `ProvisionadorFake`.
- `ServicoAutenticacao`: `ServicoAutenticacaoFake` (usuário fixo no protótipo).

O caso de uso recebe as portas por injeção de dependência, e só o módulo de composição (`app/`) conhece as implementações concretas. A notificação é disparada por eventos de domínio (`ReservaPendente`, `ReservaAprovada`, `ReservaRejeitada`, `ReservaCancelada`, `ReservaAtivada`, `ReservaEncerrada`), publicados depois do commit e tratados de forma assíncrona. Os eventos carregam identificadores, e o `Notificador` recebe o `Usuario` destinatário e a mensagem, e não um endereço de e-mail, para que a porta não fique presa ao canal de e-mail.

---

## 5. Consequências positivas

- Trocar e-mail por Telegram/WhatsApp, ou Slurm por Kubernetes/OpenStack, exige apenas um novo adaptador e configuração.
- Testes de domínio e de caso de uso rodam sem rede, com os fakes.
- Uma falha no notificador não impede a criação da reserva, pelo tratamento assíncrono.
- O domínio fica livre de framework, banco e serviços externos, o que favorece o ASR2.

---

## 6. Consequências negativas, custos e riscos

- Mais classes e interfaces do que numa arquitetura em camadas simples, o que aumenta o custo inicial e a curva de aprendizado da equipe.
- A porta `Provisionador` precisa ser definida em termos do domínio ("provisionar reserva X"). Se ela vazar conceitos de um provisionador específico, a troca deixa de ser isolada.
- A notificação assíncrona traz consistência eventual: a notificação pode chegar depois da mudança de estado e é preciso tratar falhas e reenvios.
- Como o barramento de eventos é em memória, um evento pode se perder se o servidor cair entre o commit e a entrega. O aviso não é enviado, mas a reserva fica correta. Se isso deixar de ser aceitável, os eventos podem ser gravados no banco na mesma transação e enviados a partir dali.
- Os fakes podem divergir do comportamento real das integrações, então é necessário ao menos um teste de integração com um adaptador real ou local.
