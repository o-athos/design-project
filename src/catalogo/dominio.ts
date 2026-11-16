export enum TipoRecurso {
  GPU = "GPU",
  SERVIDOR = "SERVIDOR",
  STORAGE = "STORAGE",
}

export interface RecursoProps {
  id: string;
  tipo: TipoRecurso;
  capacidade: number;
  nome?: string;
}

export class Recurso {
  public readonly id: string;
  public readonly tipo: TipoRecurso;
  public readonly capacidade: number;
  public readonly nome: string;

  constructor({ id, tipo, capacidade, nome = "" }: RecursoProps) {
    if (!id) {
      throw new Error("O recurso precisa de um identificador.");
    }
    if (!Number.isInteger(capacidade) || capacidade <= 0) {
      throw new Error("A capacidade do recurso deve ser um inteiro maior que zero.");
    }
    this.id = id;
    this.tipo = tipo;
    this.capacidade = capacidade;
    this.nome = nome;
  }

  // verifica se a capacidade física total do recurso comporta a quantidade solicitada
  public comporta(quantidade: number): boolean {
    return Number.isInteger(quantidade) && quantidade > 0 && quantidade <= this.capacidade;
  }
}
