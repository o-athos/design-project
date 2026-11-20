import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.resolve(import.meta.dirname, "../src");

const DEPENDENCIAS_PERMITIDAS: Record<string, string[]> = {
  catalogo: [],
  quotas: [],
  identidade: [],
  reservas: ["catalogo", "quotas", "identidade"],
  notificacoes: ["reservas", "identidade"],
  provisionamento: ["reservas"],
};

function listarArquivosTs(dir: string): string[] {
  const resultado: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      resultado.push(...listarArquivosTs(caminho));
    } else if (entrada.isFile() && entrada.name.endsWith(".ts")) {
      resultado.push(caminho);
    }
  }
  return resultado;
}

function extrairImports(arquivo: string): string[] {
  const conteudo = fs.readFileSync(arquivo, "utf-8");
  const regex = /(?:from|import)\s+["']([^"']+)["']/g;
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(conteudo)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function moduloDe(caminhoAbsoluto: string): string {
  return path.relative(SRC_DIR, caminhoAbsoluto).split(path.sep)[0];
}

interface ImportEntreModulos {
  arquivo: string;
  importacao: string;
  destino: string;
}

function importsParaOutrosModulos(modulo: string): ImportEntreModulos[] {
  const resultado: ImportEntreModulos[] = [];
  for (const arquivo of listarArquivosTs(path.join(SRC_DIR, modulo))) {
    for (const importacao of extrairImports(arquivo)) {
      if (!importacao.startsWith(".")) {
        continue; // pacote externo
      }
      const destino = moduloDe(path.resolve(path.dirname(arquivo), importacao));
      if (destino !== modulo) {
        resultado.push({ arquivo, importacao, destino });
      }
    }
  }
  return resultado;
}

describe("Teste de Arquitetura - Fronteiras de Módulos e Hexagonal (ADR-001 e ADR-002)", () => {
  it("cada módulo só depende dos módulos previstos no diagrama de componentes", () => {
    for (const [modulo, permitidos] of Object.entries(DEPENDENCIAS_PERMITIDAS)) {
      for (const { arquivo, importacao, destino } of importsParaOutrosModulos(modulo)) {
        expect(
          permitidos,
          `Dependência fora do diagrama em ${arquivo}: ${modulo} -> ${destino} (${importacao})`
        ).toContain(destino);
      }
    }
  });

  it("módulos só se usam pela interface pública (index.ts), nunca por arquivos internos", () => {
    for (const modulo of Object.keys(DEPENDENCIAS_PERMITIDAS)) {
      for (const { arquivo, importacao } of importsParaOutrosModulos(modulo)) {
        expect(
          importacao.endsWith("/index.ts"),
          `Acesso a arquivo interno de outro módulo em ${arquivo}: ${importacao}`
        ).toBe(true);
      }
    }
  });

  it("nenhum módulo de negócio depende de app/ (composition root)", () => {
    for (const modulo of Object.keys(DEPENDENCIAS_PERMITIDAS)) {
      for (const { arquivo, destino } of importsParaOutrosModulos(modulo)) {
        expect(destino, `${arquivo} importa app/`).not.toBe("app");
      }
    }
  });

  it("núcleo de reservas (dominio e aplicacao) não depende de notificacoes, provisionamento, SQL ou Fastify", () => {
    const arquivosNucleo = [
      ...listarArquivosTs(path.join(SRC_DIR, "reservas/dominio")),
      ...listarArquivosTs(path.join(SRC_DIR, "reservas/aplicacao")),
    ];

    for (const arq of arquivosNucleo) {
      const imports = extrairImports(arq);
      for (const imp of imports) {
        expect(imp, `Violação hexagonal em ${arq}: ${imp}`).not.toMatch(
          /(fastify|better-sqlite3|notificacoes|provisionamento|adaptadores)/
        );
      }
    }
  });
});
