import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { afterEach, describe, expect, it } from "vitest";
import { criarBancoSQLite } from "../src/app/db.ts";
import { Recurso, TipoRecurso } from "../src/catalogo/index.ts";
import { CatalogoRecursosSQL } from "../src/catalogo/repositorioSql.ts";
import { ModoQuota, Projeto, Quota } from "../src/quotas/index.ts";
import { ControleQuotasSQL } from "../src/quotas/repositorioSql.ts";
import type {
  PedidoConcorrente,
  ResultadoConcorrente,
} from "./concorrencia.worker.ts";

const arquivos: string[] = [];

afterEach(() => {
  while (arquivos.length > 0) {
    const caminho = arquivos.pop();
    if (!caminho) {
      continue;
    }
    rmSync(path.dirname(caminho), { recursive: true, force: true });
  }
});

function prepararBanco(recursos: Recurso[], limiteGpuHoras: number): string {
  const diretorio = mkdtempSync(path.join(tmpdir(), "dinf-concorrencia-"));
  const caminho = path.join(diretorio, "reservas.sqlite");
  const db = criarBancoSQLite(caminho);
  try {
    new CatalogoRecursosSQL(db, recursos);
    new ControleQuotasSQL({
      db,
      projetosIniciais: [
        new Projeto({
          id: "proj-ia",
          responsavelId: "orientador-1",
          quotas: {
            [TipoRecurso.GPU]: new Quota({
              modo: ModoQuota.ACUMULADA_MENSAL,
              limite: limiteGpuHoras,
            }),
          },
        }),
      ],
    });
  } finally {
    db.close();
  }
  arquivos.push(caminho);
  return caminho;
}

function pedir(pedido: PedidoConcorrente): Promise<ResultadoConcorrente> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./concorrencia.worker.ts", import.meta.url), {
      execArgv: ["--import", "tsx"],
      workerData: pedido,
    });
    let entregue = false;
    worker.once("message", (resultado: ResultadoConcorrente) => {
      entregue = true;
      resolve(resultado);
    });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (!entregue && code !== 0) {
        reject(new Error(`Pedido concorrente encerrou com código ${code}.`));
      }
    });
  });
}

describe("Concorrência do ADR-003", () => {
  it("20 pedidos da mesma GPU no mesmo horário deixam 1 aprovada", async () => {
    const caminho = prepararBanco(
      [
        new Recurso({
          id: "gpu-unica",
          tipo: TipoRecurso.GPU,
          capacidade: 1,
          nome: "GPU única",
        }),
      ],
      1000
    );
    const pedidos = Array.from({ length: 20 }, () =>
      pedir({
        caminhoBanco: caminho,
        recursoId: "gpu-unica",
        projetoId: "proj-ia",
        solicitanteId: "aluno-1",
        papelSolicitante: "ALUNO",
        quantidade: 1,
        inicio: "2026-11-20T08:00:00.000Z",
        fim: "2026-11-20T10:00:00.000Z",
      })
    );

    const resultados = await Promise.all(pedidos);
    const aprovadas = resultados.filter((r) => r.ok && r.estado === "APROVADA");
    const indisponiveis = resultados.filter(
      (r) => !r.ok && r.nome === "RecursoIndisponivelError"
    );

    expect(aprovadas).toHaveLength(1);
    expect(indisponiveis).toHaveLength(19);

    const db = criarBancoSQLite(caminho);
    try {
      const gravadas = db.prepare(`SELECT COUNT(*) AS total FROM reservas`).get() as {
        total: number;
      };
      expect(gravadas.total).toBe(1);
    } finally {
      db.close();
    }
  }, 20000);

  it("pedidos do mesmo projeto em GPUs diferentes não passam da quota do mês", async () => {
    const recursos = Array.from(
      { length: 5 },
      (_, i) =>
        new Recurso({
          id: `gpu-${i + 1}`,
          tipo: TipoRecurso.GPU,
          capacidade: 1,
          nome: `GPU ${i + 1}`,
        })
    );
    const caminho = prepararBanco(recursos, 10);
    const pedidos = recursos.map((recurso) =>
      pedir({
        caminhoBanco: caminho,
        recursoId: recurso.id,
        projetoId: "proj-ia",
        solicitanteId: "aluno-1",
        papelSolicitante: "ALUNO",
        quantidade: 1,
        inicio: "2026-11-20T08:00:00.000Z",
        fim: "2026-11-20T12:00:00.000Z",
      })
    );

    const resultados = await Promise.all(pedidos);
    const aprovadas = resultados.filter((r) => r.ok && r.estado === "APROVADA");
    const quotaEstourada = resultados.filter(
      (r) => !r.ok && r.nome === "QuotaExcedidaError"
    );

    expect(aprovadas).toHaveLength(2);
    expect(quotaEstourada).toHaveLength(3);

    const db = criarBancoSQLite(caminho);
    try {
      const consumos = db
        .prepare(
          `SELECT quantidade, inicio, fim FROM quotas_consumos WHERE projeto_id = ?`
        )
        .all("proj-ia") as Array<{ quantidade: number; inicio: string; fim: string }>;
      const horas = consumos.reduce((total, consumo) => {
        const duracao =
          (Date.parse(consumo.fim) - Date.parse(consumo.inicio)) / 3_600_000;
        return total + consumo.quantidade * duracao;
      }, 0);
      expect(horas).toBeLessThanOrEqual(10);
      expect(horas).toBe(8);
    } finally {
      db.close();
    }
  }, 20000);
});
