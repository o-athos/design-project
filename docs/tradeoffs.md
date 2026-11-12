*De acordo com item 5 do enunciado*

# Alternativas e trade-offs

Comparamos três formas de organizar o sistema como um todo. A escolhida, descrita no arquivo de arquitetura, é a C

## Alternativas consideradas

A. Monolito em camadas simples. Um único artefato organizado só por camadas técnicas: controladores, serviços e repositórios. Não há fronteira entre as partes do negócio, e os serviços chamam SMTP, o provisionador e o LDAP diretamente.

B. Microsserviços. Um serviço por módulo (catálogo, reservas, quotas, notificações, provisionamento e identidade), cada um com o próprio banco, conversando por HTTP ou por mensageria.

C. Monolito modular com hexagonal dentro dos módulos (escolhida). Um único artefato e um único banco, divididos em módulos que só se usam por interfaces públicas. Cada módulo isola domínio, casos de uso e adaptadores.

## Comparação

| Critério | A: Monolito em camadas | B: Microsserviços | C: Monolito modular hexagonal |
|---|---|---|---|
| Modificabilidade | Média. Sem fronteiras, as regras de quota e autorização se espalham pelos serviços, e uma política nova costuma mexer no serviço de reserva. | Boa dentro de cada serviço. Uma mudança que cruza serviços, como passar o papel do usuário para uma política, exige alterar contratos de API e coordenar deploys. | Boa. Política nova é uma classe nova registrada em `app/`, e integração nova é um adaptador novo. Uma mudança entre módulos altera uma interface dentro do mesmo código. |
| Desempenho | Bom. Uma solicitação é resolvida em memória, numa transação. | Pior. Uma solicitação passa por catálogo, quotas e reservas pela rede, e manter a consistência exige etapas extras de saga. | Bom, igual ao A. O lock por recurso faz pedidos ao mesmo recurso esperarem a vez, o que é aceitável para a carga de um departamento. |
| Disponibilidade | Ponto único de falha. Como o e-mail é enviado dentro da solicitação, uma falha no SMTP também derruba o pedido. | Melhor isolamento: se o serviço de notificações cair, o de reservas continua. Por outro lado, há mais peças que podem falhar, e o serviço de reservas não funciona sem os de quotas e catálogo. | Ponto único de falha no servidor. Falhas das integrações não derrubam a reserva: a notificação é assíncrona e o provisionamento é tentado de novo. Se o servidor cair, o agendador recupera as ativações e os encerramentos atrasados quando ele voltar. |
| Testabilidade | Média. Testar um serviço exige rede ou mocks de bibliotecas de SMTP, Slurm e LDAP. | Cada serviço é testável isoladamente, mas validar o fluxo de reserva exige subir vários serviços, e o teste do ASR1 vira um teste distribuído. | Alta. Domínio e casos de uso são testados com fakes, sem rede, e o teste de concorrência do ASR1 roda contra um banco local. |
| Complexidade | Baixa. | Alta: contratos entre serviços, saga, mensageria e monitoramento distribuído. | Média. Tem mais interfaces e classes que o A, mas continua sendo um processo só. |
| Implantação | Simples: um artefato e um banco no servidor do Dinf. | Complexa: vários artefatos e bancos, e orquestração de containers num servidor próprio, sem nuvem. | Simples, igual ao A. |
| Escalabilidade | Vertical. Dá para replicar a aplicação inteira, mas não há como separar só uma parte. | Independente por serviço. | Vertical. Como a garantia de concorrência está no banco (ADR-003), dá para rodar mais de uma instância da API, deixando o agendador ativo em uma só. Os módulos podem ser extraídos depois, começando por notificações. |
| Custo de desenvolvimento e operação | Baixo. | Alto para uma equipe pequena com um semestre de prazo. | Médio-baixo. O custo inicial é maior que o do A por causa das interfaces, e a operação custa o mesmo. |

## Relação com os ASRs e as restrições

O ASR1 pede que verificar capacidade, verificar quota e gravar a reserva aconteçam de forma atômica. A e C fazem isso com uma transação local. Em B, a capacidade fica no banco de reservas e a quota no banco de quotas, então a operação vira uma saga: entre uma etapa e outra, dois pedidos podem passar pela verificação de quota antes de qualquer um ser gravado, e um deles precisa ser desfeito por compensação. Para resolver seria necessário um mecanismo a mais justamente no ponto mais critico do sistema.

O ASR2 pede que uma política nova de autorização entre sem alterar o caso de uso. Em A não há um lugar definido para as políticas, e elas tendem a virar condicionais dentro do serviço de reserva. B e C atendem: em C, por meio de PoliticaAutorizacao

O ASR3 pede que trocar o provisionador ou o canal de notificação afete só um adaptador, e que os testes rodem sem rede. A não atende, porque os serviços chamam as integrações diretamente. B poderia atender se cada serviço usasse adaptadores, mas ao custo de toda a infraestrutura distribuída. C atende pelas portas e adaptadores.

As restrições afetam diretamente B. Uma equipe pequena, com prazo curto e implantação num servidor próprio, não comporta operar vários serviços e bancos. B resolveria um problema de escala que o sistema não tem e, em troca, dificultaria o ASR1.

A é a opção mais barata, mas falha no ASR2 e no ASR3. B atende esses dois e piora o ASR1, além de ir contra as restrições. C é a única que atende os três ASRs com um custo compatível com o contexto (ADR-001 e ADR-002).

## O que aceitamos ao escolher C

- Mais classes e interfaces que no A. O custo se justifica porque a modificabilidade das políticas e a substituição das integrações estão nos requisitos do problema (ASR2 e ASR3).
- O servidor continua sendo um ponto único de falha. Para um sistema de reservas de um departamento, ficar fora do ar por algum tempo atrasa pedidos, mas não perde dados.
- As fronteiras entre os módulos não são garantidas pela linguagem. Elas dependem do teste de arquitetura e da revisão de código (ADR-001).
- Com um banco compartilhado, os módulos ficam presos ao mesmo esquema físico, mesmo com tabelas separadas.

## Organização interna dos módulos

Comparamos três formas de organizar cada módulo  (ADR-002). Camadas tradicionais deixariam o domínio dependendo da infraestrutura, o que vai contra o ASR3. Clean Architecture ou Onion dividiriam o código em mais anéis, sem que nenhum requisito do problema peça essa separação extra. A hexagonal dá o que os ASRS pedem (portas, adaptadores e domínio isolado) com menos estrutura.

## Quando reconsiderar

A escolha muda se a carga crescer a ponto de uma instância e um banco não darem conta, ou se uma parte precisar ser implantada separadamente. Nesse caso, o módulo de notificações é o primeiro a ser extraído. Ele já conversa com o núcleo só por eventos, então trocando o barramento em memória por uma fila entre processos seria suficiente. Reservas e quotas são os últimos, porque separá-los traz de volta o problema de consistência do ASR1.
