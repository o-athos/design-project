import Database, { type Database as DatabaseType } from "better-sqlite3";

// Cria e inicializa o banco SQLite compartilhado
export function criarBancoSQLite(caminho = ":memory:"): DatabaseType {
  const db = new Database(caminho);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS catalogo_recursos (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      capacidade INTEGER NOT NULL,
      nome TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotas_projetos (
      id TEXT PRIMARY KEY,
      responsavel_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotas_limites (
      projeto_id TEXT NOT NULL,
      tipo_recurso TEXT NOT NULL,
      modo TEXT NOT NULL,
      limite REAL NOT NULL,
      PRIMARY KEY (projeto_id, tipo_recurso)
    );

    CREATE TABLE IF NOT EXISTS quotas_consumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projeto_id TEXT NOT NULL,
      tipo_recurso TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL,
      quantidade INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservas (
      id TEXT PRIMARY KEY,
      recurso_id TEXT NOT NULL,
      projeto_id TEXT NOT NULL,
      solicitante_id TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      estado TEXT NOT NULL,
      aprovador_id TEXT,
      data_decisao TEXT,
      acesso_liberado INTEGER NOT NULL DEFAULT 0
    );
  `);

  return db;
}
