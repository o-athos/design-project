export enum ModoQuota {
  ACUMULADA_MENSAL = "ACUMULADA_MENSAL",
  CAPACIDADE_SIMULTANEA = "CAPACIDADE_SIMULTANEA",
}

function paraData(valor: Date | string): Date {
  const data = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new Error(`Data inválida: '${String(valor)}'.`);
  }
  return data;
}

export interface ConsumoProps {
  inicio: Date | string;
  fim: Date | string;
  quantidade: number;
}

export class Consumo {
  public readonly inicio: Date;
  public readonly fim: Date;
  public readonly quantidade: number;

  constructor({ inicio, fim, quantidade }: ConsumoProps) {
    this.inicio = paraData(inicio);
    this.fim = paraData(fim);
    this.quantidade = quantidade;
    Object.freeze(this);
  }

  public duracaoHoras(): number {
    return (this.fim.getTime() - this.inicio.getTime()) / (1000 * 60 * 60);
  }

  public sobrepoe(inicio: Date | string, fim: Date | string): boolean {
    const ini = paraData(inicio);
    const end = paraData(fim);
    return this.inicio.getTime() < end.getTime() && ini.getTime() < this.fim.getTime();
  }
}

export interface PedidoProps {
  projetoId: string;
  recursoId: string;
  tipoRecurso: string;
  quantidade: number;
  inicio: Date | string;
  fim: Date | string;
  papelSolicitante: string;
}

export class Pedido {
  public readonly projetoId: string;
  public readonly recursoId: string;
  public readonly tipoRecurso: string;
  public readonly quantidade: number;
  public readonly inicio: Date;
  public readonly fim: Date;
  public readonly papelSolicitante: string;

  constructor({
    projetoId,
    recursoId,
    tipoRecurso,
    quantidade,
    inicio,
    fim,
    papelSolicitante,
  }: PedidoProps) {
    this.projetoId = projetoId;
    this.recursoId = recursoId;
    this.tipoRecurso = String(tipoRecurso);
    this.quantidade = Number(quantidade);
    this.inicio = paraData(inicio);
    this.fim = paraData(fim);
    this.papelSolicitante = String(papelSolicitante);
    Object.freeze(this);
  }

  public duracaoHoras(): number {
    return (this.fim.getTime() - this.inicio.getTime()) / (1000 * 60 * 60);
  }
}

export interface QuotaProps {
  modo: ModoQuota;
  limite: number;
  consumos?: Array<Consumo | ConsumoProps>;
}

export class Quota {
  public readonly modo: ModoQuota;
  public readonly limite: number;
  public readonly consumos: Consumo[];

  constructor({ modo, limite, consumos = [] }: QuotaProps) {
    if (limite < 0) {
      throw new Error("O limite da quota não pode ser negativo.");
    }
    this.modo = modo;
    this.limite = limite;
    this.consumos = consumos.map((c) =>
      c instanceof Consumo ? c : new Consumo(c)
    );
  }


   // soma unidade * hora de todos os consumos cujo inicio ocorre no mesmo mês de calendário.
  
  private consumoMensalHoras(ano: number, mes: number): number {
    let total = 0;
    for (const c of this.consumos) {
      if (
        c.inicio.getUTCFullYear() === ano &&
        c.inicio.getUTCMonth() === mes
      ) {
        total += c.quantidade * c.duracaoHoras();
      }
    }
    return total;
  }


  // calcula a maior capacidade simultânea reservada em qualquer instante dentro do intervalo
  private picoSimultaneoNoPeriodo(inicio: Date, fim: Date): number {
    const sobrepostos = this.consumos.filter((c) => c.sobrepoe(inicio, fim));
    if (sobrepostos.length === 0) {
      return 0;
    }
    const pontos = new Set<number>([inicio.getTime()]);
    for (const c of sobrepostos) {
      const t = c.inicio.getTime();
      if (t >= inicio.getTime() && t < fim.getTime()) {
        pontos.add(t);
      }
    }
    let maior = 0;
    for (const instante of pontos) {
      let ocupado = 0;
      for (const c of sobrepostos) {
        if (c.inicio.getTime() <= instante && instante < c.fim.getTime()) {
          ocupado += c.quantidade;
        }
      }
      if (ocupado > maior) {
        maior = ocupado;
      }
    }
    return maior;
  }

  // decide se um pedido cabe na quota
  public comporta(pedido: Pedido): boolean {
    if (
      pedido.quantidade <= 0 ||
      pedido.fim.getTime() <= pedido.inicio.getTime()
    ) {
      return false;
    }

    if (this.modo === ModoQuota.ACUMULADA_MENSAL) {
      const atual = this.consumoMensalHoras(
        pedido.inicio.getUTCFullYear(),
        pedido.inicio.getUTCMonth()
      );
      const novo = pedido.quantidade * pedido.duracaoHoras();
      return atual + novo <= this.limite + 1e-9;
    }

    if (this.modo === ModoQuota.CAPACIDADE_SIMULTANEA) {
      const picoAtual = this.picoSimultaneoNoPeriodo(pedido.inicio, pedido.fim);
      return picoAtual + pedido.quantidade <= this.limite;
    }

    return false;
  }

  public consumir(pedido: Pedido): void {
    this.consumos.push(
      new Consumo({
        inicio: pedido.inicio,
        fim: pedido.fim,
        quantidade: pedido.quantidade,
      })
    );
  }

  public devolver(pedido: Pedido): void {
    const idx = this.consumos.findIndex(
      (c) =>
        c.inicio.getTime() === pedido.inicio.getTime() &&
        c.fim.getTime() === pedido.fim.getTime() &&
        c.quantidade === pedido.quantidade
    );
    if (idx !== -1) {
      this.consumos.splice(idx, 1);
    }
  }
}

export interface ProjetoProps {
  id: string;
  responsavelId: string;
  quotas?: Record<string, Quota>;
}

export class Projeto {
  public readonly id: string;
  public readonly responsavelId: string;
  public readonly quotas: Map<string, Quota>;

  constructor({ id, responsavelId, quotas = {} }: ProjetoProps) {
    if (!id) {
      throw new Error("O projeto precisa de um identificador.");
    }
    if (!responsavelId) {
      throw new Error("O projeto precisa do identificador do responsável.");
    }
    this.id = id;
    this.responsavelId = responsavelId;
    this.quotas = new Map(Object.entries(quotas));
  }

  public definirQuota(tipoRecurso: string, quota: Quota): void {
    this.quotas.set(String(tipoRecurso), quota);
  }

  public obterQuota(tipoRecurso: string): Quota {
    const chave = String(tipoRecurso);
    const quota = this.quotas.get(chave);
    if (!quota) {
      throw new Error(
        `Projeto '${this.id}' não possui quota configurada para '${chave}'.`
      );
    }
    return quota;
  }
}
