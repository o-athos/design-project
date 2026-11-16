import Fastify, { type FastifyInstance } from "fastify";
import {
  CatalogoRecursosEmMemoria,
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
  ControleQuotasEmMemoria,
  ModoQuota,
  Pedido,
  Projeto,
  Quota,
} from "../quotas/index.ts";

export function criarDependenciasIniciais() {
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
  const catalogo = new CatalogoRecursosEmMemoria(recursos);

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

  const quotas = new ControleQuotasEmMemoria({ projetos: [projeto] });

  return { catalogo, diretorioUsuarios, autenticacao, quotas, projeto };
}

export function construirServidor(): FastifyInstance {
  const app = Fastify({ logger: false });
  const { catalogo, autenticacao, quotas, projeto } = criarDependenciasIniciais();

  app.get("/", async () => {
    return {
      sistema: "Controle de Uso de Infraestrutura Computacional - DINF/UFPR",
      status: "online",
      rotasDisponiveis: [
        "GET /recursos",
        "GET /projetos (ou GET /quotas)",
        "GET /quotas/:projetoId",
        "GET /eu (header opcional x-usuario-id: aluno-1 | doutorando-1 | orientador-1)",
        "GET ou POST /quotas/simular?quantidade=2",
      ],
    };
  });

  app.get("/recursos", async () => {
    return catalogo.listar();
  });

  app.get("/eu", async (request) => {
    const credencial = (request.headers["x-usuario-id"] as string | undefined) ?? null;
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
      return reply.code(404).send({ erro: `Projeto '${projetoId}' não encontrado.` });
    }
    return formatarProjeto(encontrado);
  });

  const simularPedidoHandler = async (
    dados: Record<string, unknown>,
    credencial: string | null,
    reply: { code: (statusCode: number) => { send: (payload: unknown) => unknown } }
  ) => {
    try {
      const usuario = autenticacao.autenticar(credencial);
      const pedido = new Pedido({
        projetoId: String(dados.projetoId ?? "proj-ia"),
        tipoRecurso: String(dados.tipoRecurso ?? "GPU"),
        quantidade: Number(dados.quantidade ?? 2),
        inicio: String(dados.inicio ?? "2026-11-20T08:00:00Z"),
        fim: String(dados.fim ?? "2026-11-20T18:00:00Z"),
        papelSolicitante: usuario.papel,
      });
      quotas.verificarQuota(pedido);
      const decisao = quotas.avaliarPoliticas(pedido);
      return {
        usuarioAutenticado: usuario,
        pedido: {
          projetoId: pedido.projetoId,
          tipoRecurso: pedido.tipoRecurso,
          quantidade: pedido.quantidade,
          inicio: pedido.inicio.toISOString(),
          fim: pedido.fim.toISOString(),
          duracaoHoras: pedido.duracaoHoras(),
        },
        cabeNaQuota: true,
        decisaoPolitica: decisao,
      };
    } catch (err) {
      return reply.code(422).send({
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  };

  app.get("/quotas/simular", async (request, reply) => {
    const query = (request.query ?? {}) as Record<string, unknown>;
    const credencial =
      (query.usuario as string | undefined) ??
      (request.headers["x-usuario-id"] as string | undefined) ??
      null;
    return simularPedidoHandler(query, credencial, reply);
  });

  app.post("/quotas/simular", async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const credencial = (request.headers["x-usuario-id"] as string | undefined) ?? null;
    return simularPedidoHandler(body, credencial, reply);
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
      console.log(`Servidor DINF rodando em http://localhost:${porta} (${address})`);
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
