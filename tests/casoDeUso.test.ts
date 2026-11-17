import { describe, expect, it } from "vitest";
import {
  CatalogoRecursosEmMemoria,
  Recurso,
  TipoRecurso,
} from "../src/catalogo/index.ts";
import {
  DiretorioUsuariosEmMemoria,
  Papel,
  ServicoAutenticacaoFake,
  Usuario,
} from "../src/identidade/index.ts";
import {
  NotificadorFake,
  TratadorDeEventos,
} from "../src/notificacoes/index.ts";
import {
  ControleQuotasEmMemoria,
  ModoQuota,
  PoliticaGpuApenasDoutorandos,
  PoliticaLimiteGpuDuracao,
  Projeto,
  Quota,
  QuotaExcedidaError,
} from "../src/quotas/index.ts";
import {
  BarramentoEventosEmMemoria,
  RepositorioReservasFake,
  UnidadeDeTrabalhoFake,
} from "../src/reservas/adaptadores/index.ts";
import {
  PedidoNegadoPorPoliticaError,
  SolicitarReservaUseCase,
} from "../src/reservas/aplicacao/index.ts";
import {
  EstadoReserva,
  RecursoIndisponivelError,
} from "../src/reservas/dominio/index.ts";

function montarAmbienteEmMemoria() {
  const gpu = new Recurso({
    id: "gpu-a100",
    tipo: TipoRecurso.GPU,
    capacidade: 4,
    nome: "Cluster A100",
  });
  const catalogo = new CatalogoRecursosEmMemoria([gpu]);

  const aluno = new Usuario({
    id: "aluno-1",
    papel: Papel.ALUNO,
    contato: "aluno1@inf.ufpr.br",
  });
  const doutorando = new Usuario({
    id: "doutorando-1",
    papel: Papel.DOUTORANDO,
    contato: "doutorando1@inf.ufpr.br",
  });
  const orientador = new Usuario({
    id: "orientador-1",
    papel: Papel.ORIENTADOR,
    contato: "orientador@inf.ufpr.br",
  });

  const diretorioUsuarios = new DiretorioUsuariosEmMemoria([
    aluno,
    doutorando,
    orientador,
  ]);
  const autenticacao = new ServicoAutenticacaoFake({
    usuarioPadrao: aluno,
    diretorio: diretorioUsuarios,
  });

  const projeto = new Projeto({
    id: "proj-ia",
    responsavelId: orientador.id,
    quotas: {
      [TipoRecurso.GPU]: new Quota({
        modo: ModoQuota.ACUMULADA_MENSAL,
        limite: 100,
      }),
    },
  });

  const quotas = new ControleQuotasEmMemoria({
    projetos: [projeto],
    politicas: [new PoliticaLimiteGpuDuracao()],
  });

  const notificador = new NotificadorFake();
  const tratador = new TratadorDeEventos({ diretorioUsuarios, notificador });
  const barramento = new BarramentoEventosEmMemoria();
  barramento.assinar((ev) => tratador.tratar(ev));

  const repositorio = new RepositorioReservasFake();
  const uow = new UnidadeDeTrabalhoFake(barramento);

  const useCase = new SolicitarReservaUseCase({
    uow,
    catalogo,
    quotas,
    repositorio,
    publicador: barramento,
  });

  return {
    catalogo,
    diretorioUsuarios,
    autenticacao,
    quotas,
    notificador,
    tratador,
    barramento,
    repositorio,
    useCase,
  };
}

describe("Caso de Uso - SolicitarReservaUseCase com Fakes sem rede (ASR2 e ASR3)", () => {
  it("aprova automaticamente pedido dentro do limite e notifica o solicitante", () => {
    const { useCase, autenticacao, repositorio, notificador } =
      montarAmbienteEmMemoria();
    const usuario = autenticacao.autenticar("aluno-1");

    const reserva = useCase.executar({
      recursoId: "gpu-a100",
      projetoId: "proj-ia",
      solicitanteId: usuario.id,
      papelSolicitante: usuario.papel,
      quantidade: 2,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T18:00:00Z",
    });

    expect(reserva.estado).toBe(EstadoReserva.APROVADA);
    expect(repositorio.buscarPorId(reserva.id)).not.toBeNull();
    expect(notificador.mensagens).toHaveLength(1);
    expect(notificador.mensagens[0].destinatario.id).toBe("aluno-1");
  });

  it("cria reserva PENDENTE quando exige aprovação (> 2 GPUs) e notifica o responsável do projeto", () => {
    const { useCase, notificador } = montarAmbienteEmMemoria();

    const reserva = useCase.executar({
      recursoId: "gpu-a100",
      projetoId: "proj-ia",
      solicitanteId: "aluno-1",
      papelSolicitante: Papel.ALUNO,
      quantidade: 3,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T18:00:00Z",
    });

    expect(reserva.estado).toBe(EstadoReserva.PENDENTE);
    expect(notificador.mensagens).toHaveLength(1);
    expect(notificador.mensagens[0].destinatario.id).toBe("orientador-1");
  });

  it("recusa por indisponibilidade (409) sem criar reserva nem enviar notificação", () => {
    const { useCase, repositorio, notificador } = montarAmbienteEmMemoria();

    useCase.executar({
      recursoId: "gpu-a100",
      projetoId: "proj-ia",
      solicitanteId: "aluno-1",
      papelSolicitante: Papel.ALUNO,
      quantidade: 3,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T18:00:00Z",
    });

    expect(() =>
      useCase.executar({
        recursoId: "gpu-a100",
        projetoId: "proj-ia",
        solicitanteId: "aluno-1",
        papelSolicitante: Papel.ALUNO,
        quantidade: 2,
        inicio: "2026-11-20T10:00:00Z",
        fim: "2026-11-20T12:00:00Z",
      })
    ).toThrow(RecursoIndisponivelError);

    expect(repositorio.listarTodas()).toHaveLength(1);
    expect(notificador.mensagens).toHaveLength(1);
  });

  it("recusa quando o pedido excede a quota do projeto (422)", () => {
    const { useCase } = montarAmbienteEmMemoria();

    // Limite é 100 GPU-h; 4 GPUs * 30h = 120 GPU-h > 100
    expect(() =>
      useCase.executar({
        recursoId: "gpu-a100",
        projetoId: "proj-ia",
        solicitanteId: "aluno-1",
        papelSolicitante: Papel.ALUNO,
        quantidade: 4,
        inicio: "2026-11-20T08:00:00Z",
        fim: "2026-11-21T14:00:00Z",
      })
    ).toThrow(QuotaExcedidaError);
  });

  it("ASR2 (OCP): permite plugar PoliticaGpuApenasDoutorandos sem alterar o caso de uso nem entidades", () => {
    const { useCase, quotas } = montarAmbienteEmMemoria();
    quotas.adicionarPolitica(new PoliticaGpuApenasDoutorandos());

    expect(() =>
      useCase.executar({
        recursoId: "gpu-a100",
        projetoId: "proj-ia",
        solicitanteId: "aluno-1",
        papelSolicitante: Papel.ALUNO,
        quantidade: 1,
        inicio: "2026-11-20T08:00:00Z",
        fim: "2026-11-20T12:00:00Z",
      })
    ).toThrow(PedidoNegadoPorPoliticaError);

    const reservaDoutorando = useCase.executar({
      recursoId: "gpu-a100",
      projetoId: "proj-ia",
      solicitanteId: "doutorando-1",
      papelSolicitante: Papel.DOUTORANDO,
      quantidade: 1,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T12:00:00Z",
    });
    expect(reservaDoutorando.estado).toBe(EstadoReserva.APROVADA);
  });

  it("ASR3: uma falha no Notificador nunca impede nem desfaz a criação da reserva", () => {
    const { useCase, notificador, tratador, repositorio } =
      montarAmbienteEmMemoria();
    notificador.simularFalha = true;

    const reserva = useCase.executar({
      recursoId: "gpu-a100",
      projetoId: "proj-ia",
      solicitanteId: "aluno-1",
      papelSolicitante: Papel.ALUNO,
      quantidade: 1,
      inicio: "2026-11-20T08:00:00Z",
      fim: "2026-11-20T12:00:00Z",
    });

    expect(reserva.estado).toBe(EstadoReserva.APROVADA);
    expect(repositorio.buscarPorId(reserva.id)).not.toBeNull();
    expect(tratador.errosRegistrados).toHaveLength(1);
  });
});
