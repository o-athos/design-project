import type { Database as DatabaseType } from "better-sqlite3";
import { RepositorioReservas } from "../aplicacao/index.ts";
import { EstadoReserva, Periodo, Reserva } from "../dominio/index.ts";

interface LinhaReserva {
  id: string;
  recurso_id: string;
  projeto_id: string;
  solicitante_id: string;
  inicio: string;
  fim: string;
  quantidade: number;
  estado: string;
  aprovador_id: string | null;
  data_decisao: string | null;
  acesso_liberado: number;
}

export class RepositorioReservasSQL implements RepositorioReservas {
  private readonly db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
  }

  private mapearLinha(l: LinhaReserva): Reserva {
    return new Reserva({
      id: l.id,
      recursoId: l.recurso_id,
      projetoId: l.projeto_id,
      solicitanteId: l.solicitante_id,
      periodo: new Periodo(l.inicio, l.fim),
      quantidade: l.quantidade,
      estado: l.estado as EstadoReserva,
      aprovadorId: l.aprovador_id,
      dataDecisao: l.data_decisao ? new Date(l.data_decisao) : null,
      acessoLiberado: l.acesso_liberado === 1,
    });
  }

  public salvar(reserva: Reserva): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO reservas (
          id, recurso_id, projeto_id, solicitante_id,
          inicio, fim, quantidade, estado,
          aprovador_id, data_decisao, acesso_liberado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        reserva.id,
        reserva.recursoId,
        reserva.projetoId,
        reserva.solicitanteId,
        reserva.periodo.inicio.toISOString(),
        reserva.periodo.fim.toISOString(),
        reserva.quantidade,
        reserva.estado,
        reserva.aprovadorId,
        reserva.dataDecisao ? reserva.dataDecisao.toISOString() : null,
        reserva.acessoLiberado ? 1 : 0
      );
  }

  public buscarPorId(id: string): Reserva | null {
    const linha = this.db
      .prepare(`SELECT * FROM reservas WHERE id = ?`)
      .get(id) as LinhaReserva | undefined;
    return linha ? this.mapearLinha(linha) : null;
  }

  public listarTodas(): Reserva[] {
    const linhas = this.db
      .prepare(`SELECT * FROM reservas ORDER BY inicio`)
      .all() as LinhaReserva[];
    return linhas.map((l) => this.mapearLinha(l));
  }

  public listarPorUsuario(usuario: string): Reserva[] {
    const linhas = this.db
      .prepare(`SELECT * FROM reservas WHERE solicitante_id = ? ORDER BY inicio`)
      .all(usuario) as LinhaReserva[];
    return linhas.map((l) => this.mapearLinha(l));
  }

  public listarPorRecurso(recurso: string, periodo: Periodo): Reserva[] {
    const linhas = this.db
      .prepare(
        `SELECT * FROM reservas
         WHERE recurso_id = ? AND inicio < ? AND ? < fim
         ORDER BY inicio`
      )
      .all(
        recurso,
        periodo.fim.toISOString(),
        periodo.inicio.toISOString()
      ) as LinhaReserva[];
    return linhas.map((l) => this.mapearLinha(l));
  }

  public listarParaAtivar(agora: Date): Reserva[] {
    const linhas = this.db
      .prepare(
        `SELECT * FROM reservas WHERE estado = 'APROVADA' AND inicio <= ? ORDER BY inicio`
      )
      .all(agora.toISOString()) as LinhaReserva[];
    return linhas.map((l) => this.mapearLinha(l));
  }

  public listarParaEncerrar(agora: Date): Reserva[] {
    const linhas = this.db
      .prepare(
        `SELECT * FROM reservas WHERE estado = 'ATIVA' AND fim <= ? ORDER BY fim`
      )
      .all(agora.toISOString()) as LinhaReserva[];
    return linhas.map((l) => this.mapearLinha(l));
  }
}
