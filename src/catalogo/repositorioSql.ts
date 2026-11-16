import type { Database as DatabaseType } from "better-sqlite3";
import { Recurso, TipoRecurso } from "./dominio.ts";
import { CatalogoRecursos, RecursoNaoEncontradoError } from "./servico.ts";

interface LinhaRecurso {
  id: string;
  tipo: string;
  capacidade: number;
  nome: string;
}

export class CatalogoRecursosSQL implements CatalogoRecursos {
  private readonly db: DatabaseType;

  constructor(db: DatabaseType, recursosIniciais: Iterable<Recurso> = []) {
    this.db = db;
    for (const r of recursosIniciais) {
      this.cadastrar(r);
    }
  }

  public cadastrar(recurso: Recurso): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO catalogo_recursos (id, tipo, capacidade, nome)
         VALUES (?, ?, ?, ?)`
      )
      .run(recurso.id, recurso.tipo, recurso.capacidade, recurso.nome);
  }

  public listar(): Recurso[] {
    const linhas = this.db
      .prepare(`SELECT id, tipo, capacidade, nome FROM catalogo_recursos ORDER BY id`)
      .all() as LinhaRecurso[];
    return linhas.map(
      (l) =>
        new Recurso({
          id: l.id,
          tipo: l.tipo as TipoRecurso,
          capacidade: l.capacidade,
          nome: l.nome,
        })
    );
  }

  public buscar(id: string): Recurso | null {
    const linha = this.db
      .prepare(`SELECT id, tipo, capacidade, nome FROM catalogo_recursos WHERE id = ?`)
      .get(id) as LinhaRecurso | undefined;
    if (!linha) {
      return null;
    }
    return new Recurso({
      id: linha.id,
      tipo: linha.tipo as TipoRecurso,
      capacidade: linha.capacidade,
      nome: linha.nome,
    });
  }

  public obterParaAtualizacao(id: string): Recurso {
    const recurso = this.buscar(id);
    if (!recurso) {
      throw new RecursoNaoEncontradoError(id);
    }
    return recurso;
  }
}
