import type { FastifyInstance } from "fastify";
import {
  CatalogoRecursos,
  RecursoNaoEncontradoError,
} from "../../catalogo/index.ts";
import {
  AutenticacaoError,
  ServicoAutenticacao,
} from "../../identidade/index.ts";
import {
  ProjetoNaoEncontradoError,
  QuotaExcedidaError,
} from "../../quotas/index.ts";
import {
  PedidoNegadoPorPoliticaError,
  RepositorioReservas,
  SolicitarReservaUseCase,
} from "../aplicacao/index.ts";
import {
  AgendaRecurso,
  Periodo,
  PeriodoInvalidoError,
  RecursoIndisponivelError,
  Reserva,
} from "../dominio/index.ts";

export interface ControladorRestDeps {
  autenticacao: ServicoAutenticacao;
  catalogo: CatalogoRecursos;
  repositorio: RepositorioReservas;
  solicitarReservaUseCase: SolicitarReservaUseCase;
}

export function serializarReserva(r: Reserva) {
  return {
    id: r.id,
    recursoId: r.recursoId,
    projetoId: r.projetoId,
    solicitanteId: r.solicitanteId,
    quantidade: r.quantidade,
    inicio: r.periodo.inicio.toISOString(),
    fim: r.periodo.fim.toISOString(),
    duracaoHoras: r.periodo.duracao(),
    estado: r.estado,
    aprovadorId: r.aprovadorId,
    dataDecisao: r.dataDecisao ? r.dataDecisao.toISOString() : null,
    acessoLiberado: r.acessoLiberado,
  };
}

export function registrarRotasReservas(
  app: FastifyInstance,
  {
    autenticacao,
    catalogo,
    repositorio,
    solicitarReservaUseCase,
  }: ControladorRestDeps
): void {
  app.post("/reservas", async (request, reply) => {
    try {
      const credencial =
        (request.headers["x-usuario-id"] as string | undefined) ?? null;
      const usuario = autenticacao.autenticar(credencial);
      const body = (request.body ?? {}) as Record<string, unknown>;

      const quantidade = Number(body.quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return reply
          .code(400)
          .send({ erro: "A quantidade solicitada deve ser um inteiro positivo." });
      }

      const reserva = solicitarReservaUseCase.executar({
        recursoId: String(body.recursoId ?? ""),
        projetoId: String(body.projetoId ?? ""),
        solicitanteId: usuario.id,
        papelSolicitante: usuario.papel,
        quantidade,
        inicio: String(body.inicio ?? ""),
        fim: String(body.fim ?? ""),
      });

      return reply.code(201).send(serializarReserva(reserva));
    } catch (err) {
      if (err instanceof PeriodoInvalidoError) {
        return reply.code(400).send({ erro: err.message });
      }
      if (err instanceof AutenticacaoError) {
        return reply.code(401).send({ erro: err.message });
      }
      if (err instanceof PedidoNegadoPorPoliticaError) {
        return reply.code(403).send({ erro: err.message });
      }
      if (
        err instanceof RecursoNaoEncontradoError ||
        err instanceof ProjetoNaoEncontradoError
      ) {
        return reply.code(404).send({ erro: err.message });
      }
      if (err instanceof RecursoIndisponivelError) {
        return reply.code(409).send({ erro: err.message });
      }
      if (err instanceof QuotaExcedidaError) {
        return reply.code(422).send({ erro: err.message });
      }
      return reply.code(400).send({
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get("/reservas", async (request, reply) => {
    try {
      const credencial =
        (request.headers["x-usuario-id"] as string | undefined) ?? null;
      const usuario = autenticacao.autenticar(credencial);
      return repositorio.listarPorUsuario(usuario.id).map(serializarReserva);
    } catch (err) {
      if (err instanceof AutenticacaoError) {
        return reply.code(401).send({ erro: err.message });
      }
      throw err;
    }
  });

  app.get("/recursos/:id/agenda", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const recurso = catalogo.buscar(id);
      if (!recurso) {
        return reply.code(404).send({ erro: `Recurso '${id}' não encontrado.` });
      }

      const query = (request.query ?? {}) as Record<string, unknown>;
      const inicio = String(query.inicio ?? "2026-11-20T00:00:00Z");
      const fim = String(query.fim ?? "2026-11-21T00:00:00Z");
      const periodo = new Periodo(inicio, fim);

      const reservas = repositorio.listarPorRecurso(recurso.id, periodo);
      const agenda = new AgendaRecurso(recurso, reservas);

      return {
        recursoId: recurso.id,
        tipo: recurso.tipo,
        capacidadeTotal: recurso.capacidade,
        periodo: {
          inicio: periodo.inicio.toISOString(),
          fim: periodo.fim.toISOString(),
        },
        capacidadeLivre: agenda.capacidadeLivre(periodo),
        reservas: agenda.reservasSobrepostas(periodo).map(serializarReserva),
      };
    } catch (err) {
      if (err instanceof PeriodoInvalidoError) {
        return reply.code(400).send({ erro: err.message });
      }
      throw err;
    }
  });
}
