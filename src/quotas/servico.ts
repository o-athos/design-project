import { Pedido, Projeto, Quota } from "./dominio.ts";
import {
  Decisao,
  PoliticaAutorizacao,
  PoliticaLimiteGpuDuracao,
} from "./politicas.ts";

export class QuotaExcedidaError extends Error {
  constructor(mensagem = "Quota do projeto excedida.") {
    super(mensagem);
    this.name = "QuotaExcedidaError";
  }
}

export class ProjetoNaoEncontradoError extends Error {
  constructor(projetoId: string) {
    super(`Projeto '${projetoId}' não encontrado.`);
    this.name = "ProjetoNaoEncontradoError";
  }
}

export function combinarDecisoes(
  politicas: Iterable<PoliticaAutorizacao>,
  pedido: Pedido
): Decisao {
  const prioridade: Record<Decisao, number> = {
    [Decisao.AUTO_APROVAR]: 0,
    [Decisao.EXIGIR_APROVACAO]: 1,
    [Decisao.NEGAR]: 2,
  };
  let resultado = Decisao.AUTO_APROVAR;
  for (const politica of politicas) {
    const decisao = politica.avaliar(pedido);
    if (prioridade[decisao] > prioridade[resultado]) {
      resultado = decisao;
    }
  }
  return resultado;
}

export interface ControleQuotas {
  obterParaAtualizacao(projeto: string, pedido: Pedido): Quota;
  verificarQuota(pedido: Pedido): void;
  avaliarPoliticas(pedido: Pedido): Decisao;
  consumir(pedido: Pedido): void;
  devolver(pedido: Pedido): void;
  responsavelDe(projeto: string): string;
}

export interface ControleQuotasEmMemoriaProps {
  projetos?: Iterable<Projeto>;
  politicas?: Iterable<PoliticaAutorizacao> | null;
}

// implementação em memória para testes 
export class ControleQuotasEmMemoria implements ControleQuotas {
  private readonly projetos = new Map<string, Projeto>();
  private readonly politicas: PoliticaAutorizacao[];

  constructor({ projetos = [], politicas = null }: ControleQuotasEmMemoriaProps = {}) {
    for (const p of projetos) {
      this.registrarProjeto(p);
    }
    this.politicas =
      politicas !== null ? Array.from(politicas) : [new PoliticaLimiteGpuDuracao()];
  }

  public registrarProjeto(projeto: Projeto): void {
    this.projetos.set(projeto.id, projeto);
  }

  public listarProjetos(): Projeto[] {
    return Array.from(this.projetos.values());
  }

  public adicionarPolitica(politica: PoliticaAutorizacao): void {
    this.politicas.push(politica);
  }

  private buscarProjeto(projetoId: string): Projeto {
    const projeto = this.projetos.get(projetoId);
    if (!projeto) {
      throw new ProjetoNaoEncontradoError(projetoId);
    }
    return projeto;
  }

  public obterParaAtualizacao(projeto: string, pedido: Pedido): Quota {
    const proj = this.buscarProjeto(projeto);
    try {
      return proj.obterQuota(pedido.tipoRecurso);
    } catch (err) {
      throw new QuotaExcedidaError(err instanceof Error ? err.message : String(err));
    }
  }

  public verificarQuota(pedido: Pedido): void {
    const quota = this.obterParaAtualizacao(pedido.projetoId, pedido);
    if (!quota.comporta(pedido)) {
      throw new QuotaExcedidaError(
        `Quota excedida para o projeto '${pedido.projetoId}' no recurso '${pedido.tipoRecurso}'.`
      );
    }
  }

  public avaliarPoliticas(pedido: Pedido): Decisao {
    return combinarDecisoes(this.politicas, pedido);
  }

  public consumir(pedido: Pedido): void {
    const quota = this.obterParaAtualizacao(pedido.projetoId, pedido);
    quota.consumir(pedido);
  }

  public devolver(pedido: Pedido): void {
    const quota = this.obterParaAtualizacao(pedido.projetoId, pedido);
    quota.devolver(pedido);
  }

  public responsavelDe(projeto: string): string {
    return this.buscarProjeto(projeto).responsavelId;
  }
}
