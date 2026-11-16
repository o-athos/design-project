import { Recurso } from "./dominio.ts";

export class RecursoNaoEncontradoError extends Error {
  constructor(id: string) {
    super(`Recurso '${id}' não encontrado.`);
    this.name = "RecursoNaoEncontradoError";
  }
}

export interface CatalogoRecursos {
  buscar(id: string): Recurso | null;
  obterParaAtualizacao(id: string): Recurso;
}

//  implementação em memória para testes de caso de uso sem banco de dados
export class CatalogoRecursosEmMemoria implements CatalogoRecursos {
  private readonly recursos = new Map<string, Recurso>();

  constructor(recursos: Iterable<Recurso> = []) {
    for (const r of recursos) {
      this.cadastrar(r);
    }
  }

  public cadastrar(recurso: Recurso): void {
    this.recursos.set(recurso.id, recurso);
  }

  public listar(): Recurso[] {
    return Array.from(this.recursos.values());
  }

  public buscar(id: string): Recurso | null {
    return this.recursos.get(id) ?? null;
  }

  public obterParaAtualizacao(id: string): Recurso {
    const recurso = this.buscar(id);
    if (!recurso) {
      throw new RecursoNaoEncontradoError(id);
    }
    return recurso;
  }
}
