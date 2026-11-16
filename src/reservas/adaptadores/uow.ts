import type { Database as DatabaseType } from "better-sqlite3";
import { UnidadeDeTrabalho } from "../aplicacao/index.ts";
import { BarramentoEventosEmMemoria } from "./eventosMemoria.ts";

// unidadeDeTrabalho em memória para testes de caso de uso sem banco de dados.
export class UnidadeDeTrabalhoFake implements UnidadeDeTrabalho {
  private readonly barramento?: BarramentoEventosEmMemoria;

  constructor(barramento?: BarramentoEventosEmMemoria) {
    this.barramento = barramento;
  }

  public executar<T>(operacao: () => T): T {
    this.barramento?.iniciarColetaTransacional();
    try {
      const resultado = operacao();
      this.barramento?.despacharPosCommit();
      return resultado;
    } catch (err) {
      this.barramento?.descartarFilaRollback();
      throw err;
    }
  }
}

export class UnidadeDeTrabalhoSQL implements UnidadeDeTrabalho {
  private readonly db: DatabaseType;
  private readonly barramento?: BarramentoEventosEmMemoria;

  constructor(db: DatabaseType, barramento?: BarramentoEventosEmMemoria) {
    this.db = db;
    this.barramento = barramento;
  }

  public executar<T>(operacao: () => T): T {
    this.barramento?.iniciarColetaTransacional();
    const tx = this.db.transaction(() => operacao());
    try {
      const resultado = tx.immediate();
      this.barramento?.despacharPosCommit();
      return resultado;
    } catch (err) {
      this.barramento?.descartarFilaRollback();
      throw err;
    }
  }
}
