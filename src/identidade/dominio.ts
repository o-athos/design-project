export enum Papel {
  ALUNO = "ALUNO",
  DOUTORANDO = "DOUTORANDO",
  ORIENTADOR = "ORIENTADOR",
  ADMINISTRADOR = "ADMINISTRADOR",
}

export interface UsuarioProps {
  id: string;
  papel: Papel;
  contato: string;
  nome?: string;
}

export class Usuario {
  public readonly id: string;
  public readonly papel: Papel;
  public readonly contato: string;
  public readonly nome: string;

  constructor({ id, papel, contato, nome = "" }: UsuarioProps) {
    if (!id) {
      throw new Error("O usuário precisa de um identificador.");
    }
    if (!contato) {
      throw new Error("O usuário precisa de um contato.");
    }
    this.id = id;
    this.papel = papel;
    this.contato = contato;
    this.nome = nome;
    Object.freeze(this);
  }
}
