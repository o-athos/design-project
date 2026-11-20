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

// "GPU XYZ apenas para doutorandos" (ASR2): nega os recursos listados a quem
// não tem um dos papéis permitidos
export class PoliticaGpuApenasDoutorandos implements PoliticaAutorizacao {
  private readonly recursosRestritos: Set<string>;
  private readonly papeisPermitidos: Set<string>;

  constructor(
    recursosRestritos: Iterable<string>,
    papeisPermitidos: Iterable<string> = [
      "DOUTORANDO",
      "ORIENTADOR",
      "ADMINISTRADOR",
    ]
  ) {
    this.recursosRestritos = new Set(recursosRestritos);
    this.papeisPermitidos = new Set(papeisPermitidos);
  }

  public avaliar(pedido: Pedido): Decisao {
    if (
      this.recursosRestritos.has(pedido.recursoId) &&
      !this.papeisPermitidos.has(pedido.papelSolicitante)
    ) {
      return Decisao.NEGAR;
    }
    return Decisao.AUTO_APROVAR;
  }
}
