import { randomUUID } from "node:crypto";
import { Recurso } from "../../catalogo/index.ts";

export enum EstadoReserva {
  PENDENTE = "PENDENTE",
  APROVADA = "APROVADA",
  ATIVA = "ATIVA",
  ENCERRADA = "ENCERRADA",
  REJEITADA = "REJEITADA",
  CANCELADA = "CANCELADA",
}

export class PeriodoInvalidoError extends Error {
  constructor(mensagem = "O período informado é inválido (início deve ser anterior ao fim).") {
    super(mensagem);
    this.name = "PeriodoInvalidoError";
  }
}

export class RecursoIndisponivelError extends Error {
  constructor(mensagem = "Recurso indisponível para a quantidade e período solicitados.") {
    super(mensagem);
    this.name = "RecursoIndisponivelError";
  }
}

export class TransicaoEstadoInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "TransicaoEstadoInvalidaError";
  }
}

function paraData(valor: Date | string): Date {
  const data = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw new PeriodoInvalidoError(`Data inválida: '${String(valor)}'.`);
  }
  return data;
}

export class Periodo {
  public readonly inicio: Date;
  public readonly fim: Date;

  constructor(inicio: Date | string, fim: Date | string) {
    const ini = paraData(inicio);
    const end = paraData(fim);
    if (ini.getTime() >= end.getTime()) {
      throw new PeriodoInvalidoError("A data de início deve ser estritamente anterior à data de fim.");
    }
    this.inicio = ini;
    this.fim = end;
    Object.freeze(this);
  }


   // verifica se há sobreposição temporal com outro periodo
  public sobrepoe(outro: Periodo): boolean {
    return (
      this.inicio.getTime() < outro.fim.getTime() &&
      outro.inicio.getTime() < this.fim.getTime()
    );
  }


  // retorna a duração do período em horas
  public duracao(): number {
    return (this.fim.getTime() - this.inicio.getTime()) / (1000 * 60 * 60);
  }
}

export interface ReservaProps {
  id?: string;
  recursoId: string;
  projetoId: string;
  solicitanteId: string;
  periodo: Periodo;
  quantidade: number;
  estado?: EstadoReserva;
  aprovadorId?: string | null;
  dataDecisao?: Date | null;
  acessoLiberado?: boolean;
}

export class Reserva {
  public readonly id: string;
  public readonly recursoId: string;
  public readonly projetoId: string;
  public readonly solicitanteId: string;
  public readonly periodo: Periodo;
  public readonly quantidade: number;
  private _estado: EstadoReserva;
  private _aprovadorId: string | null;
  private _dataDecisao: Date | null;
  private _acessoLiberado: boolean;

  constructor({
    id,
    recursoId,
    projetoId,
    solicitanteId,
    periodo,
    quantidade,
    estado = EstadoReserva.PENDENTE,
    aprovadorId = null,
    dataDecisao = null,
    acessoLiberado = false,
  }: ReservaProps) {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error("A quantidade reservada deve ser um inteiro positivo.");
    }
    this.id = id ?? randomUUID();
    this.recursoId = recursoId;
    this.projetoId = projetoId;
    this.solicitanteId = solicitanteId;
    this.periodo = periodo;
    this.quantidade = quantidade;
    this._estado = estado;
    this._aprovadorId = aprovadorId;
    this._dataDecisao = dataDecisao;
    this._acessoLiberado = acessoLiberado;
  }

  public get estado(): EstadoReserva {
    return this._estado;
  }

  public get aprovadorId(): string | null {
    return this._aprovadorId;
  }

  public get dataDecisao(): Date | null {
    return this._dataDecisao;
  }

  public get acessoLiberado(): boolean {
    return this._acessoLiberado;
  }


  // indica se a reserva ocupa capacidade física e quota
  public ocupaCapacidade(): boolean {
    return (
      this._estado === EstadoReserva.PENDENTE ||
      this._estado === EstadoReserva.APROVADA ||
      this._estado === EstadoReserva.ATIVA
    );
  }

  public aprovar(aprovadorId: string, dataDecisao: Date = new Date()): void {
    if (this._estado !== EstadoReserva.PENDENTE) {
      throw new TransicaoEstadoInvalidaError(
        `Não é possível aprovar uma reserva no estado '${this._estado}'.`
      );
    }
    if (!aprovadorId) {
      throw new Error("É necessário informar o aprovadorId ao aprovar uma reserva.");
    }
    this._estado = EstadoReserva.APROVADA;
    this._aprovadorId = aprovadorId;
    this._dataDecisao = dataDecisao;
  }

  public rejeitar(aprovadorId: string, dataDecisao: Date = new Date()): void {
    if (this._estado !== EstadoReserva.PENDENTE) {
      throw new TransicaoEstadoInvalidaError(
        `Não é possível rejeitar uma reserva no estado '${this._estado}'.`
      );
    }
    if (!aprovadorId) {
      throw new Error("É necessário informar o aprovadorId ao rejeitar uma reserva.");
    }
    this._estado = EstadoReserva.REJEITADA;
    this._aprovadorId = aprovadorId;
    this._dataDecisao = dataDecisao;
  }

  public ativar(): void {
    if (this._estado !== EstadoReserva.APROVADA) {
      throw new TransicaoEstadoInvalidaError(
        `Não é possível ativar uma reserva no estado '${this._estado}'.`
      );
    }
    this._estado = EstadoReserva.ATIVA;
    this._acessoLiberado = true;
  }

  public encerrar(): void {
    if (this._estado !== EstadoReserva.ATIVA) {
      throw new TransicaoEstadoInvalidaError(
        `Não é possível encerrar uma reserva no estado '${this._estado}'.`
      );
    }
    this._estado = EstadoReserva.ENCERRADA;
  }

  public cancelar(): void {
    if (
      this._estado !== EstadoReserva.PENDENTE &&
      this._estado !== EstadoReserva.APROVADA &&
      this._estado !== EstadoReserva.ATIVA
    ) {
      throw new TransicaoEstadoInvalidaError(
        `Não é possível cancelar uma reserva já finalizada no estado '${this._estado}'.`
      );
    }
    this._estado = EstadoReserva.CANCELADA;
  }

  public marcarAcessoRevogado(): void {
    this._acessoLiberado = false;
  }
}

export interface CriarReservaParams {
  id?: string;
  projetoId: string;
  solicitanteId: string;
  periodo: Periodo;
  quantidade: number;
  estadoInicial: EstadoReserva.APROVADA | EstadoReserva.PENDENTE;
}


// calcula a capacidade livre de um recurso num período a partir das reservas existentes
// instancia novas reservas garantindo que nunca haja superalocação
export class AgendaRecurso {
  public readonly recurso: Recurso;
  private readonly reservas: Reserva[];

  constructor(recurso: Recurso, reservas: Iterable<Reserva> = []) {
    this.recurso = recurso;
    this.reservas = Array.from(reservas);
  }

  
  // retorna as reservas ativas/pendentes/aprovadas que se sobrepõem ao periodo informado
  public reservasSobrepostas(periodo: Periodo): Reserva[] {
    return this.reservas.filter(
      (r) =>
        r.recursoId === this.recurso.id &&
        r.ocupaCapacidade() &&
        r.periodo.sobrepoe(periodo)
    );
  }

  
  // calcula a menor capacidade livre disponivel ao longo de todo o periodo informado
  public capacidadeLivre(periodo: Periodo): number {
    const sobrepostas = this.reservasSobrepostas(periodo);
    if (sobrepostas.length === 0) {
      return this.recurso.capacidade;
    }

    const pontos = new Set<number>([periodo.inicio.getTime()]);
    for (const r of sobrepostas) {
      const t = r.periodo.inicio.getTime();
      if (t >= periodo.inicio.getTime() && t < periodo.fim.getTime()) {
        pontos.add(t);
      }
    }

    let maiorOcupacao = 0;
    for (const instante of pontos) {
      let ocupadoNoInstante = 0;
      for (const r of sobrepostas) {
        if (
          r.periodo.inicio.getTime() <= instante &&
          instante < r.periodo.fim.getTime()
        ) {
          ocupadoNoInstante += r.quantidade;
        }
      }
      if (ocupadoNoInstante > maiorOcupacao) {
        maiorOcupacao = ocupadoNoInstante;
      }
    }

    return Math.max(0, this.recurso.capacidade - maiorOcupacao);
  }

  public verificarDisponibilidade(periodo: Periodo, quantidade: number): void {
    if (!this.recurso.comporta(quantidade)) {
      throw new RecursoIndisponivelError(
        `O recurso '${this.recurso.id}' (capacidade ${this.recurso.capacidade}) não comporta a quantidade ${quantidade}.`
      );
    }
    const livre = this.capacidadeLivre(periodo);
    if (livre < quantidade) {
      throw new RecursoIndisponivelError(
        `Capacidade insuficiente no recurso '${this.recurso.id}' para o período solicitado (disponível: ${livre}, solicitado: ${quantidade}).`
      );
    }
  }

  public criarReserva({
    id,
    projetoId,
    solicitanteId,
    periodo,
    quantidade,
    estadoInicial,
  }: CriarReservaParams): Reserva {
    this.verificarDisponibilidade(periodo, quantidade);
    const novaReserva = new Reserva({
      id,
      recursoId: this.recurso.id,
      projetoId,
      solicitanteId,
      periodo,
      quantidade,
      estado: estadoInicial,
    });
    this.reservas.push(novaReserva);
    return novaReserva;
  }
}
