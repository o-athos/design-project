import { setImmediate } from "node:timers";
import type { Database as DatabaseType } from "better-sqlite3";
import { UnidadeDeTrabalho } from "../aplicacao/index.ts";
import { BarramentoEventosEmMemoria } from "./eventosMemoria.ts";

function agendarEntrega(barramento?: BarramentoEventosEmMemoria): void {
  if (!barramento) {
    return;
  }
  const eventos = barramento.retirarFilaPosCommit();
  if (eventos.length === 0) {
    return;
  }
  setImmediate(() => {
    barramento.entregar(eventos);
  });
}

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
      agendarEntrega(this.barramento);
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
      agendarEntrega(this.barramento);
      return resultado;
    } catch (err) {
      this.barramento?.descartarFilaRollback();
      throw err;
    }
  }
}
