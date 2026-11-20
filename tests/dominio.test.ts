import { describe, expect, it } from "vitest";
import { Recurso, TipoRecurso } from "../src/catalogo/index.ts";
import {
  Decisao,
  ModoQuota,
  Pedido,
  PoliticaGpuApenasDoutorandos,
  PoliticaLimiteGpuDuracao,
  Quota,
  combinarDecisoes,
} from "../src/quotas/index.ts";
import {
  AgendaRecurso,
  EstadoReserva,
  Periodo,
  PeriodoInvalidoError,
  RecursoIndisponivelError,
  Reserva,
  TransicaoEstadoInvalidaError,
} from "../src/reservas/dominio/index.ts";

describe("Domínio - Periodo (Value Object)", () => {
  it("deve validar que início é estritamente anterior ao fim", () => {
    expect(
      () => new Periodo("2026-11-20T18:00:00Z", "2026-11-20T08:00:00Z")
    ).toThrow(PeriodoInvalidoError);

    expect(
      () => new Periodo("2026-11-20T08:00:00Z", "2026-11-20T08:00:00Z")
    ).toThrow(PeriodoInvalidoError);
  });

  it("deve detectar sobreposição entre períodos corretamente e calcular duração", () => {
    const base = new Periodo("2026-11-20T08:00:00Z", "2026-11-20T18:00:00Z");
    const sobrepostoParcial = new Periodo(
      "2026-11-20T12:00:00Z",
      "2026-11-20T20:00:00Z"
    );
    const adjacenteDepois = new Periodo(
      "2026-11-20T18:00:00Z",
      "2026-11-20T22:00:00Z"
    );

    expect(base.duracao()).toBe(10);
    expect(base.sobrepoe(sobrepostoParcial)).toBe(true);
    expect(sobrepostoParcial.sobrepoe(base)).toBe(true);
    expect(base.sobrepoe(adjacenteDepois)).toBe(false);
  });
});

describe("Domínio - Quota nos dois modos de ModoQuota (RF04)", () => {
  it("Modo ACUMULADA_MENSAL: acumula GPU-horas no mês de início sem dividir entre meses", () => {
    const quotaGpu = new Quota({
      modo: ModoQuota.ACUMULADA_MENSAL,
      limite: 100,
    });

    // 2 GPUs * 30h = 60 GPU-horas em novembro (cabe em 100)
    const p1 = new Pedido({
      projetoId: "proj-ia",
      recursoId: "gpu-a100",
      tipoRecurso: "GPU",
      quantidade: 2,
      inicio: "2026-11-30T10:00:00Z",
      fim: "2026-12-01T16:00:00Z", // Termina em dezembro, mas conta inteira em novembro 
      papelSolicitante: "ALUNO",
    });
    expect(quotaGpu.comporta(p1)).toBe(true);
    quotaGpu.consumir(p1);

    // Mais 2 GPUs * 25h = 50 GPU-horas em novembro -> 60 + 50 = 110 > 100 (não cabe)
    const p2Novembro = new Pedido({
      projetoId: "proj-ia",
      recursoId: "gpu-a100",
      tipoRecurso: "GPU",
      quantidade: 2,
      inicio: "2026-11-15T00:00:00Z",
      fim: "2026-11-16T01:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(quotaGpu.comporta(p2Novembro)).toBe(false);

    // Pedido começando em dezembro tem saldo limpo de dezembro (cabe)
    const p3Dezembro = new Pedido({
      projetoId: "proj-ia",
      recursoId: "gpu-a100",
      tipoRecurso: "GPU",
      quantidade: 2,
      inicio: "2026-12-05T00:00:00Z",
      fim: "2026-12-06T01:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(quotaGpu.comporta(p3Dezembro)).toBe(true);
  });

  it("Modo CAPACIDADE_SIMULTANEA (Storage): valida soma dos consumos sobrepostos no período", () => {
    const quotaStorage = new Quota({
      modo: ModoQuota.CAPACIDADE_SIMULTANEA,
      limite: 20,
    });

    const p1 = new Pedido({
      projetoId: "proj-ia",
      recursoId: "stg-ceph",
      tipoRecurso: "STORAGE",
      quantidade: 15,
      inicio: "2026-11-10T08:00:00Z",
      fim: "2026-11-12T08:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(quotaStorage.comporta(p1)).toBe(true);
    quotaStorage.consumir(p1);

    // 15 TB em período que NÃO se sobrepõe 
    const p2SemSobreposicao = new Pedido({
      projetoId: "proj-ia",
      recursoId: "stg-ceph",
      tipoRecurso: "STORAGE",
      quantidade: 15,
      inicio: "2026-11-13T08:00:00Z",
      fim: "2026-11-15T08:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(quotaStorage.comporta(p2SemSobreposicao)).toBe(true);
    quotaStorage.consumir(p2SemSobreposicao);

    // 10 TB sobrepondo com p1 (15 + 10 = 25 > 20 -> não cabe)
    const p3Sobreposto = new Pedido({
      projetoId: "proj-ia",
      recursoId: "stg-ceph",
      tipoRecurso: "STORAGE",
      quantidade: 10,
      inicio: "2026-11-11T08:00:00Z",
      fim: "2026-11-12T08:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(quotaStorage.comporta(p3Sobreposto)).toBe(false);

    // Ao devolver p1, o período fica livre e p3Sobreposto passa a caber
    quotaStorage.devolver(p1);
    expect(quotaStorage.comporta(p3Sobreposto)).toBe(true);
  });
});

describe("Domínio - Políticas de Autorização (RF05 / ASR2)", () => {
  it("PoliticaLimiteGpuDuracao auto-aprova até 2 GPUs e até 72h, e exige aprovação acima disso", () => {
    const politica = new PoliticaLimiteGpuDuracao();

    const pedidoAuto = new Pedido({
      projetoId: "proj-ia",
      recursoId: "gpu-a100",
      tipoRecurso: "GPU",
      quantidade: 2,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T18:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(politica.avaliar(pedidoAuto)).toBe(Decisao.AUTO_APROVAR);

    const pedidoMuitasGpus = new Pedido({
      projetoId: "proj-ia",
      recursoId: "gpu-a100",
      tipoRecurso: "GPU",
      quantidade: 3,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T18:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(politica.avaliar(pedidoMuitasGpus)).toBe(Decisao.EXIGIR_APROVACAO);

    const pedidoLongo = new Pedido({
      projetoId: "proj-ia",
      recursoId: "srv-dgx",
      tipoRecurso: "SERVIDOR",
      quantidade: 1,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-24T08:00:00Z", // 96h > 72h
      papelSolicitante: "ALUNO",
    });
    expect(politica.avaliar(pedidoLongo)).toBe(Decisao.EXIGIR_APROVACAO);
  });

  it("combinarDecisoes aplica a decisão mais restritiva (NEGAR > EXIGIR_APROVACAO > AUTO_APROVAR)", () => {
    const politicas = [
      new PoliticaLimiteGpuDuracao(),
      new PoliticaGpuApenasDoutorandos(["gpu-a100"]),
    ];
    const pedidoAluno = new Pedido({
      projetoId: "proj-ia",
      recursoId: "gpu-a100",
      tipoRecurso: "GPU",
      quantidade: 1,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T12:00:00Z",
      papelSolicitante: "ALUNO",
    });
    expect(combinarDecisoes(politicas, pedidoAluno)).toBe(Decisao.NEGAR);
  });
});

describe("Domínio - AgendaRecurso e Ciclo de Vida de Reserva", () => {
  it("AgendaRecurso calcula saldo livre considerando reservas PENDENTE e APROVADA e barra excesso", () => {
    const gpu = new Recurso({
      id: "gpu-a100",
      tipo: TipoRecurso.GPU,
      capacidade: 4,
    });
    const periodo = new Periodo("2026-11-20T08:00:00Z", "2026-11-20T18:00:00Z");
    const agenda = new AgendaRecurso(gpu, []);

    const r1 = agenda.criarReserva({
      projetoId: "proj-ia",
      solicitanteId: "aluno-1",
      periodo,
      quantidade: 3,
      estadoInicial: EstadoReserva.PENDENTE,
    });

    expect(r1.estado).toBe(EstadoReserva.PENDENTE);
    expect(agenda.capacidadeLivre(periodo)).toBe(1);
    expect(() => agenda.verificarDisponibilidade(periodo, 2)).toThrow(
      RecursoIndisponivelError
    );
  });

  it("Reserva protege transições de estado e impede transições inválidas", () => {
    const periodo = new Periodo("2026-11-20T08:00:00Z", "2026-11-20T18:00:00Z");
    const reserva = new Reserva({
      recursoId: "gpu-a100",
      projetoId: "proj-ia",
      solicitanteId: "aluno-1",
      periodo,
      quantidade: 3,
      estado: EstadoReserva.PENDENTE,
    });

    reserva.aprovar("orientador-1");
    expect(reserva.estado).toBe(EstadoReserva.APROVADA);
    expect(reserva.aprovadorId).toBe("orientador-1");

    reserva.ativar();
    expect(reserva.estado).toBe(EstadoReserva.ATIVA);
    expect(reserva.acessoLiberado).toBe(true);

    reserva.encerrar();
    expect(reserva.estado).toBe(EstadoReserva.ENCERRADA);

    // Reserva já encerrada não pode ser cancelada
    expect(() => reserva.cancelar()).toThrow(TransicaoEstadoInvalidaError);
  });
});
