import { DiretorioUsuarios } from "../identidade/index.ts";
import { EventoReserva } from "../reservas/dominio/index.ts";
import { Notificador } from "./porta.ts";

export interface TratadorDeEventosDeps {
  diretorioUsuarios: DiretorioUsuarios;
  notificador: Notificador;
}

export class TratadorDeEventos {
  private readonly diretorioUsuarios: DiretorioUsuarios;
  private readonly notificador: Notificador;
  public readonly errosRegistrados: Error[] = [];

  constructor({ diretorioUsuarios, notificador }: TratadorDeEventosDeps) {
    this.diretorioUsuarios = diretorioUsuarios;
    this.notificador = notificador;
  }

  public tratar(evento: EventoReserva): void {
    try {
      const solicitante = this.diretorioUsuarios.buscar(evento.solicitanteId);
      if (solicitante) {
        this.notificador.notificar(
          solicitante,
          `Evento ${evento.tipo} para a reserva ${evento.reservaId}.`
        );
      }
    } catch (err) {
      this.errosRegistrados.push(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}
