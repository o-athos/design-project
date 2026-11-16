import { Pedido } from "./dominio.ts";

export enum Decisao {
  AUTO_APROVAR = "AUTO_APROVAR",
  EXIGIR_APROVACAO = "EXIGIR_APROVACAO",
  NEGAR = "NEGAR",
}

export interface PoliticaAutorizacao {
  avaliar(pedido: Pedido): Decisao;
}


 // mais de 2 GPUs ou duração maior que 72h exige aprovação do orientador
export class PoliticaLimiteGpuDuracao implements PoliticaAutorizacao {
  public readonly maxGpusAuto: number;
  public readonly maxHorasAuto: number;

  constructor({
    maxGpusAuto = 2,
    maxHorasAuto = 72,
  }: { maxGpusAuto?: number; maxHorasAuto?: number } = {}) {
    this.maxGpusAuto = maxGpusAuto;
    this.maxHorasAuto = maxHorasAuto;
  }

  public avaliar(pedido: Pedido): Decisao {
    if (pedido.duracaoHoras() > this.maxHorasAuto) {
      return Decisao.EXIGIR_APROVACAO;
    }
    if (pedido.tipoRecurso === "GPU" && pedido.quantidade > this.maxGpusAuto) {
      return Decisao.EXIGIR_APROVACAO;
    }
    return Decisao.AUTO_APROVAR;
  }
}

export class PoliticaGpuApenasDoutorandos implements PoliticaAutorizacao {
  private readonly papeisPermitidos: Set<string>;

  constructor(
    papeisPermitidos: Iterable<string> = [
      "DOUTORANDO",
      "ORIENTADOR",
      "ADMINISTRADOR",
    ]
  ) {
    this.papeisPermitidos = new Set(papeisPermitidos);
  }

  public avaliar(pedido: Pedido): Decisao {
    if (
      pedido.tipoRecurso === "GPU" &&
      !this.papeisPermitidos.has(pedido.papelSolicitante)
    ) {
      return Decisao.NEGAR;
    }
    return Decisao.AUTO_APROVAR;
  }
}
