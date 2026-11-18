# Controle de Uso de Infraestrutura Computacional — DINF/UFPR

Trabalho Final da disciplina de **Design e Arquitetura de Software (2026-2)**.

O sistema gerencia solicitações de recursos computacionais compartilhados do departamento (servidores, GPUs e armazenamento), controlando disponibilidade por período, quotas por projeto de pesquisa, políticas plugáveis de autorização e integrações externas.

---

## Visão Arquitetural

A solução adota a combinação de:

```text
Cliente-servidor (API REST + Interface Web)
+
Monolito modular
+
Arquitetura Hexagonal (Portas e Adaptadores) dentro de cada módulo
```

---

## Documentação e Modelagem

- [1. Descrição do problema, requisitos e ASRs](docs/requisitos.md)
- [2. Modelo de domínio, responsabilidades, GRASP e SOLID](docs/dominio.md)
- [3. Diagramas UML (PlantUML)](docs/diagramas/)
  - [Diagrama de Classes](docs/diagramas/classes.puml)
  - [Diagrama de Sequência](docs/diagramas/sequencia.puml)
  - [Diagrama de Comunicação](docs/diagramas/comunicacao.puml)
  - [Diagrama de Componentes](docs/diagramas/componentes.puml)
- [4. Proposta arquitetural e dependência externa](docs/arquitetura.md)
- [5. Alternativas arquiteturais e análise de trade-offs](docs/tradeoffs.md)
- [6. Architecture Decision Records (ADRs)](docs/adrs/)
  - [ADR-001: Monolito modular vs. microsserviços](docs/adrs/ADR-001-monolito-modular.md)
  - [ADR-002: Arquitetura Hexagonal para integrações externas](docs/adrs/ADR-002-hexagonal.md)
  - [ADR-003: Controle de concorrência na reserva](docs/adrs/ADR-003-concorrencia.md)
- [7. Análise de evolução](docs/evolucao.md)
- [8. Especificação OpenAPI](docs/api.yaml)

---

## Estrutura do Código (`src/` e `tests/`)

```text
src/
|-- catalogo/           Recurso, TipoRecurso, interface pública CatalogoRecursos e adaptadores (SQL / memória)
|-- reservas/           Núcleo do sistema
|   |-- dominio/        Reserva, Periodo, AgendaRecurso, EstadoReserva e eventos (ReservaPendente, ReservaAprovada, ...)
|   |-- aplicacao/      SolicitarReservaUseCase e portas (RepositorioReservas, Provisionador, PublicadorEventos, UnidadeDeTrabalho)
|   `-- adaptadores/    Controlador REST, RepositorioReservasSQL, RepositorioReservasFake, UnidadeDeTrabalhoSQL e barramento de eventos
|-- quotas/             Projeto, Quota, ModoQuota, Consumo, Pedido, ControleQuotas e políticas (PoliticaAutorizacao)
|-- notificacoes/       TratadorDeEventos, porta Notificador, EmailNotificador e NotificadorFake
|-- provisionamento/    SlurmProvisionador (stub) e ProvisionadorFake
|-- identidade/         Usuario, Papel, DiretorioUsuarios, ServicoAutenticacao e ServicoAutenticacaoFake
`-- app/                Composição (main.ts), banco SQLite (db.ts) e interface web (web.ts)

tests/
|-- dominio.test.ts           Testes unitários de Periodo, Quota (2 modos), AgendaRecurso, Reserva e políticas
|-- casoDeUso.test.ts         Testes de SolicitarReservaUseCase com Fakes sem rede (ASR2 e ASR3)
|-- concorrencia.test.ts      Testes de concorrência reais com worker threads contra SQLite (ASR1 / ADR-003)
|-- concorrencia.worker.ts    Worker utilizado nos testes de concorrência
|-- apiRest.test.ts           Testes de integração HTTP nos endpoints REST
`-- arquitetura.test.ts       Verificação automatizada das fronteiras entre módulos (ADR-001)
```

---

## Como Executar o Protótipo

### Pré-requisitos
- **Node.js** `>= 20` (com `npm`)

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar o servidor e a Interface Web
```bash
npm start
```
Abra no navegador: **`http://localhost:3333`**

### 3. Executar a suíte de testes automatizados
```bash
npm test
```

Para visualizar o relatório detalhado de cada teste:
```bash
npx vitest run --reporter=verbose
```
