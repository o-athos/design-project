import type { Database as DatabaseType } from "better-sqlite3";
import { Consumo, ModoQuota, Pedido, Projeto, Quota } from "./dominio.ts";
import {
  Decisao,
  PoliticaAutorizacao,
  PoliticaLimiteGpuDuracao,
} from "./politicas.ts";
import {
  ControleQuotas,
  ProjetoNaoEncontradoError,
  QuotaExcedidaError,
  combinarDecisoes,
} from "./servico.ts";

interface LinhaProjeto {
  id: string;
  responsavel_id: string;
}

interface LinhaLimite {
  projeto_id: string;
  tipo_recurso: string;
  modo: string;
  limite: number;
}

interface LinhaConsumo {
  id: number;
  inicio: string;
  fim: string;
  quantidade: number;
}


// adaptador SQL do módulo de quotas (acessa exclusivamente as tabelas quotas_

export class ControleQuotasSQL implements ControleQuotas {
  private readonly db: DatabaseType;
  private readonly politicas: PoliticaAutorizacao[];

  constructor({
    db,
    projetosIniciais = [],
    politicas = null,
  }: {
    db: DatabaseType;
    projetosIniciais?: Iterable<Projeto>;
    politicas?: Iterable<PoliticaAutorizacao> | null;
  }) {
    this.db = db;
    this.politicas =
      politicas !== null ? Array.from(politicas) : [new PoliticaLimiteGpuDuracao()];
    for (const p of projetosIniciais) {
      this.registrarProjeto(p);
    }
  }

  public registrarProjeto(projeto: Projeto): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO quotas_projetos (id, responsavel_id) VALUES (?, ?)`
      )
      .run(projeto.id, projeto.responsavelId);

    for (const [tipoRecurso, quota] of projeto.quotas.entries()) {
      this.db
        .prepare(
          `INSERT OR REPLACE INTO quotas_limites (projeto_id, tipo_recurso, modo, limite)
           VALUES (?, ?, ?, ?)`
        )
        .run(projeto.id, tipoRecurso, quota.modo, quota.limite);

      for (const c of quota.consumos) {
        this.db
          .prepare(
            `INSERT INTO quotas_consumos (projeto_id, tipo_recurso, inicio, fim, quantidade)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(
            projeto.id,
            tipoRecurso,
            c.inicio.toISOString(),
            c.fim.toISOString(),
            c.quantidade
          );
      }
    }
  }

  public adicionarPolitica(politica: PoliticaAutorizacao): void {
    this.politicas.push(politica);
  }

  public listarProjetos(): Projeto[] {
    const projetos = this.db
      .prepare(`SELECT id, responsavel_id FROM quotas_projetos ORDER BY id`)
      .all() as LinhaProjeto[];
    return projetos.map((p) => this.reconstruirProjeto(p.id));
  }

  private reconstruirProjeto(projetoId: string): Projeto {
    const proj = this.db
      .prepare(`SELECT id, responsavel_id FROM quotas_projetos WHERE id = ?`)
      .get(projetoId) as LinhaProjeto | undefined;
    if (!proj) {
      throw new ProjetoNaoEncontradoError(projetoId);
    }

    const limites = this.db
      .prepare(
        `SELECT projeto_id, tipo_recurso, modo, limite
         FROM quotas_limites WHERE projeto_id = ?`
      )
      .all(projetoId) as LinhaLimite[];

    const mapaQuotas: Record<string, Quota> = {};
    for (const lim of limites) {
      const consumosLinhas = this.db
        .prepare(
          `SELECT id, inicio, fim, quantidade
           FROM quotas_consumos
           WHERE projeto_id = ? AND tipo_recurso = ?
           ORDER BY id`
        )
        .all(projetoId, lim.tipo_recurso) as LinhaConsumo[];

      mapaQuotas[lim.tipo_recurso] = new Quota({
        modo: lim.modo as ModoQuota,
        limite: lim.limite,
        consumos: consumosLinhas.map(
          (c) =>
            new Consumo({
              inicio: c.inicio,
              fim: c.fim,
              quantidade: c.quantidade,
            })
        ),
      });
    }

    return new Projeto({
      id: proj.id,
      responsavelId: proj.responsavel_id,
      quotas: mapaQuotas,
    });
  }

  public obterParaAtualizacao(projeto: string, pedido: Pedido): Quota {
    const proj = this.reconstruirProjeto(projeto);
    try {
      return proj.obterQuota(pedido.tipoRecurso);
    } catch (err) {
      throw new QuotaExcedidaError(
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  public verificarQuota(pedido: Pedido): void {
    const quota = this.obterParaAtualizacao(pedido.projetoId, pedido);
    if (!quota.comporta(pedido)) {
      throw new QuotaExcedidaError(
        `Quota excedida para o projeto '${pedido.projetoId}' no recurso '${pedido.tipoRecurso}'.`
      );
    }
  }

  public avaliarPoliticas(pedido: Pedido): Decisao {
    return combinarDecisoes(this.politicas, pedido);
  }

  public consumir(pedido: Pedido): void {
    this.db
      .prepare(
        `INSERT INTO quotas_consumos (projeto_id, tipo_recurso, inicio, fim, quantidade)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        pedido.projetoId,
        pedido.tipoRecurso,
        pedido.inicio.toISOString(),
        pedido.fim.toISOString(),
        pedido.quantidade
      );
  }

  public devolver(pedido: Pedido): void {
    const linha = this.db
      .prepare(
        `SELECT id FROM quotas_consumos
         WHERE projeto_id = ? AND tipo_recurso = ? AND inicio = ? AND fim = ? AND quantidade = ?
         LIMIT 1`
      )
      .get(
        pedido.projetoId,
        pedido.tipoRecurso,
        pedido.inicio.toISOString(),
        pedido.fim.toISOString(),
        pedido.quantidade
      ) as { id: number } | undefined;

    if (linha) {
      this.db
        .prepare(`DELETE FROM quotas_consumos WHERE id = ?`)
        .run(linha.id);
    }
  }

  public responsavelDe(projeto: string): string {
    return this.reconstruirProjeto(projeto).responsavelId;
  }
}
