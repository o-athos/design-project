import { parentPort, workerData } from "node:worker_threads";
import { criarBancoSQLite } from "../src/app/db.ts";
import { CatalogoRecursosSQL } from "../src/catalogo/repositorioSql.ts";
import { ControleQuotasSQL } from "../src/quotas/repositorioSql.ts";
import {
  BarramentoEventosEmMemoria,
  RepositorioReservasSQL,
  UnidadeDeTrabalhoSQL,
} from "../src/reservas/adaptadores/index.ts";
import { SolicitarReservaUseCase } from "../src/reservas/aplicacao/index.ts";

export interface PedidoConcorrente {
  caminhoBanco: string;
  recursoId: string;
  projetoId: string;
  solicitanteId: string;
  papelSolicitante: string;
  quantidade: number;
  inicio: string;
  fim: string;
}

export interface ResultadoConcorrente {
  ok: boolean;
  estado?: string;
  nome?: string;
  mensagem?: string;
}

function executar(pedido: PedidoConcorrente): ResultadoConcorrente {
  const db = criarBancoSQLite(pedido.caminhoBanco);
  try {
    const barramento = new BarramentoEventosEmMemoria();
    const useCase = new SolicitarReservaUseCase({
      uow: new UnidadeDeTrabalhoSQL(db, barramento),
      catalogo: new CatalogoRecursosSQL(db),
      quotas: new ControleQuotasSQL({ db }),
      repositorio: new RepositorioReservasSQL(db),
      publicador: barramento,
    });
    const reserva = useCase.executar({
      recursoId: pedido.recursoId,
      projetoId: pedido.projetoId,
      solicitanteId: pedido.solicitanteId,
      papelSolicitante: pedido.papelSolicitante,
      quantidade: pedido.quantidade,
      inicio: pedido.inicio,
      fim: pedido.fim,
    });
    return { ok: true, estado: reserva.estado };
  } catch (err) {
    const erro = err as Error;
    return { ok: false, nome: erro.name, mensagem: erro.message };
  } finally {
    db.close();
  }
}

const pedido = workerData as PedidoConcorrente | undefined;
if (parentPort && pedido) {
  parentPort.postMessage(executar(pedido));
}
