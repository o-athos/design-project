import Fastify, { type FastifyInstance } from "fastify";
import {
  CatalogoRecursosSQL,
  Recurso,
  TipoRecurso,
} from "../catalogo/index.ts";
import {
  DiretorioUsuariosEmMemoria,
  Papel,
  ServicoAutenticacaoFake,
  Usuario,
} from "../identidade/index.ts";
import {
  NotificadorFake,
  TratadorDeEventos,
} from "../notificacoes/index.ts";
import {
  ControleQuotasSQL,
  ModoQuota,
  PoliticaAutorizacao,
  Projeto,
  Quota,
} from "../quotas/index.ts";
import {
  BarramentoEventosEmMemoria,
  RepositorioReservasSQL,
  UnidadeDeTrabalhoSQL,
  registrarRotasReservas,
} from "../reservas/adaptadores/index.ts";
import { SolicitarReservaUseCase } from "../reservas/aplicacao/index.ts";
import { criarBancoSQLite } from "./db.ts";

export interface OpcoesServidor {
  caminhoBanco?: string;
  politicas?: Iterable<PoliticaAutorizacao> | null;
}

export function criarDependenciasIniciais({
  caminhoBanco = ":memory:",
  politicas = null,
}: OpcoesServidor = {}) {
  const db = criarBancoSQLite(caminhoBanco);

  const recursos = [
    new Recurso({
      id: "gpu-a100",
      tipo: TipoRecurso.GPU,
      capacidade: 4,
      nome: "Cluster NVIDIA A100 (4 GPUs)",
    }),
    new Recurso({
      id: "srv-dgx",
      tipo: TipoRecurso.SERVIDOR,
      capacidade: 1,
      nome: "Servidor Exclusivo DGX",
    }),
    new Recurso({
      id: "stg-ceph",
      tipo: TipoRecurso.STORAGE,
      capacidade: 50,
      nome: "Armazenamento Ceph (50 TB)",
    }),
  ];
  const catalogo = new CatalogoRecursosSQL(db, recursos);

  const aluno = new Usuario({
    id: "aluno-1",
    papel: Papel.ALUNO,
    contato: "aluno1@inf.ufpr.br",
    nome: "Aluno Pesquisador",
  });
  const doutorando = new Usuario({
    id: "doutorando-1",
    papel: Papel.DOUTORANDO,
    contato: "doutorando1@inf.ufpr.br",
    nome: "Doutorando Pesquisador",
  });
  const orientador = new Usuario({
    id: "orientador-1",
    papel: Papel.ORIENTADOR,
    contato: "orientador@inf.ufpr.br",
    nome: "Orientador Responsavel",
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
        limite: 200,
      }),
      [TipoRecurso.SERVIDOR]: new Quota({
        modo: ModoQuota.ACUMULADA_MENSAL,
        limite: 100,
      }),
      [TipoRecurso.STORAGE]: new Quota({
        modo: ModoQuota.CAPACIDADE_SIMULTANEA,
        limite: 20,
      }),
    },
  });

  const quotas = new ControleQuotasSQL({
    db,
    projetosIniciais: [projeto],
    politicas,
  });

  const notificador = new NotificadorFake();
  const tratadorEventos = new TratadorDeEventos({
    diretorioUsuarios,
    notificador,
  });

  const barramento = new BarramentoEventosEmMemoria();
  barramento.assinar((evento) => tratadorEventos.tratar(evento));

  const repositorio = new RepositorioReservasSQL(db);
  const uow = new UnidadeDeTrabalhoSQL(db, barramento);

  const solicitarReservaUseCase = new SolicitarReservaUseCase({
    uow,
    catalogo,
    quotas,
    repositorio,
    publicador: barramento,
  });

  return {
    db,
    catalogo,
    diretorioUsuarios,
    autenticacao,
    quotas,
    projeto,
    notificador,
    tratadorEventos,
    barramento,
    repositorio,
    uow,
    solicitarReservaUseCase,
  };
}

export function construirServidor(opcoes: OpcoesServidor = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  const deps = criarDependenciasIniciais(opcoes);
  const {
    catalogo,
    autenticacao,
    quotas,
    notificador,
    repositorio,
    solicitarReservaUseCase,
  } = deps;

  app.decorate("deps", deps);

  app.get("/", async () => {
    return {
      sistema: "Controle de Uso de Infraestrutura Computacional - DINF/UFPR",
      status: "online",
      rotasDisponiveis: [
        "POST /reservas",
        "GET /reservas",
        "GET /recursos/:id/agenda?inicio=...&fim=...",
        "GET /recursos",
        "GET /projetos (ou GET /quotas)",
        "GET /quotas/:projetoId",
        "GET /notificacoes",
        "GET /eu",
      ],
    };
  });

  app.get("/recursos", async () => {
    return catalogo.listar();
  });

  app.get("/eu", async (request) => {
    const credencial =
      (request.headers["x-usuario-id"] as string | undefined) ?? null;
    return autenticacao.autenticar(credencial);
  });

  const formatarProjeto = (proj: Projeto) => {
    const resumo: Record<string, unknown> = {};
    for (const [tipo, quota] of proj.quotas.entries()) {
      resumo[tipo] = {
        modo: quota.modo,
        limite: quota.limite,
        consumosRegistrados: quota.consumos,
      };
    }
    return {
      projetoId: proj.id,
      responsavelId: proj.responsavelId,
      quotas: resumo,
    };
  };

  app.get("/projetos", async () => {
    return quotas.listarProjetos().map(formatarProjeto);
  });

  app.get("/quotas", async () => {
    return quotas.listarProjetos().map(formatarProjeto);
  });

  app.get("/quotas/:projetoId", async (request, reply) => {
    const { projetoId } = request.params as { projetoId: string };
    const encontrado = quotas.listarProjetos().find((p) => p.id === projetoId);
    if (!encontrado) {
      return reply
        .code(404)
        .send({ erro: `Projeto '${projetoId}' não encontrado.` });
    }
    return formatarProjeto(encontrado);
  });

  app.get("/notificacoes", async () => {
    return notificador.mensagens.map((m) => ({
      destinatarioId: m.destinatario.id,
      contato: m.destinatario.contato,
      papel: m.destinatario.papel,
      mensagem: m.mensagem,
      enviadaEm: m.enviadaEm.toISOString(),
    }));
  });

  registrarRotasReservas(app, {
    autenticacao,
    catalogo,
    repositorio,
    solicitarReservaUseCase,
  });

  return app;
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("src/app/main.ts");

if (isMain) {
  const portaInicial = Number(process.env.PORT ?? 3333);
  const app = construirServidor();
  const iniciar = async (porta: number) => {
    try {
      const address = await app.listen({ port: porta, host: "0.0.0.0" });
      console.log(
        `Servidor DINF rodando em http://localhost:${porta} (${address})`
      );
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "EADDRINUSE"
      ) {
        await iniciar(porta + 1);
      } else {
        throw err;
      }
    }
  };
  iniciar(portaInicial);
}
