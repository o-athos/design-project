import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.resolve(import.meta.dirname, "../src");

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
  const regex = /from\s+["']([^"']+)["']/g;
  const imports: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(conteudo)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

describe("Teste de Arquitetura - Fronteiras de Módulos e Hexagonal (ADR-001 e ADR-002)", () => {
  it("módulos de suporte (catalogo, quotas, identidade) não dependem de reservas nem entre si", () => {
    for (const modulo of ["catalogo", "quotas", "identidade"]) {
      const arquivos = listarArquivosTs(path.join(SRC_DIR, modulo));
      for (const arq of arquivos) {
        const imports = extrairImports(arq);
        for (const imp of imports) {
          expect(imp, `Violação em ${arq}: importou ${imp}`).not.toMatch(
            /\.\.\/(reservas|notificacoes|provisionamento|catalogo|quotas|identidade)/
          );
        }
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

  it("reservas só importa outros módulos pela interface pública (index.ts), nunca arquivos internos", () => {
    const arquivosReservas = listarArquivosTs(path.join(SRC_DIR, "reservas"));
    for (const arq of arquivosReservas) {
      const imports = extrairImports(arq);
      for (const imp of imports) {
        if (imp.includes("catalogo/") || imp.includes("quotas/") || imp.includes("identidade/")) {
          expect(
            imp.endsWith("/index.ts"),
            `Acesso a classe interna de outro módulo em ${arq}: ${imp}`
          ).toBe(true);
        }
      }
    }
  });
});
