import { DiretorioUsuarios } from "../identidade/index.ts";
import { EventoReserva, ReservaPendente } from "../reservas/dominio/index.ts";
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
      if (evento instanceof ReservaPendente) {
        const responsavel = this.diretorioUsuarios.buscar(evento.responsavelId);
        if (responsavel) {
          this.notificador.notificar(
            responsavel,
            `Reserva ${evento.reservaId} aguarda sua aprovação (solicitante: ${evento.solicitanteId}).`
          );
        }
        return;
      }

      const solicitante = this.diretorioUsuarios.buscar(evento.solicitanteId);
      if (solicitante) {
        this.notificador.notificar(
          solicitante,
          `Evento ${evento.tipo} para a reserva ${evento.reservaId}.`
        );
      }
    } catch (err) {
      // ASR3: falha no notificador é registrada mas não propaga nem desfaz a reserva
      this.errosRegistrados.push(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
}
