import { PublicadorEventos } from "../aplicacao/index.ts";
import { EventoReserva } from "../dominio/index.ts";

export type OuvinteEvento = (evento: EventoReserva) => void;


 // barramento de eventos em memória dentro do processo
 // acumula eventos publicados durante uma UnidadeDeTrabalho e só os entrega aos assinantes 
export class BarramentoEventosEmMemoria implements PublicadorEventos {
  private readonly ouvintes: OuvinteEvento[] = [];
  private emTransacao = false;
  private filaPendente: EventoReserva[] = [];
  public readonly historicoEntregues: EventoReserva[] = [];

  public assinar(ouvinte: OuvinteEvento): void {
    this.ouvintes.push(ouvinte);
  }

  public iniciarColetaTransacional(): void {
    this.emTransacao = true;
    this.filaPendente = [];
  }

  public publicar(evento: EventoReserva): void {
    if (this.emTransacao) {
      this.filaPendente.push(evento);
      return;
    }
    this.entregarImediatamente(evento);
  }

  public despacharPosCommit(): void {
    const paraEntregar = [...this.filaPendente];
    this.filaPendente = [];
    this.emTransacao = false;
    for (const evento of paraEntregar) {
      this.entregarImediatamente(evento);
    }
  }

  public descartarFilaRollback(): void {
    this.filaPendente = [];
    this.emTransacao = false;
  }

  private entregarImediatamente(evento: EventoReserva): void {
    this.historicoEntregues.push(evento);
    for (const ouvinte of this.ouvintes) {
      ouvinte(evento);
    }
  }
}
