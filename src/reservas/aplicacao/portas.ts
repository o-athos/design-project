import { EventoReserva, Periodo, Reserva } from "../dominio/index.ts";

export interface RepositorioReservas {
  salvar(reserva: Reserva): void;
  buscarPorId(id: string): Reserva | null;
  listarPorUsuario(usuario: string): Reserva[];
  listarPorRecurso(recurso: string, periodo: Periodo): Reserva[];
  listarParaAtivar(agora: Date): Reserva[];
  listarParaEncerrar(agora: Date): Reserva[];
}

export interface Provisionador {
  liberarAcesso(reserva: Reserva): void;
  revogarAcesso(reserva: Reserva): void;
}

export interface PublicadorEventos {
  publicar(evento: EventoReserva): void;
}

export interface UnidadeDeTrabalho {
  executar<T>(operacao: () => T): T;
}
