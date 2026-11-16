import { RepositorioReservas } from "../aplicacao/index.ts";
import { EstadoReserva, Periodo, Reserva } from "../dominio/index.ts";

// implementação em memoria de RepositorioReservas para testes
export class RepositorioReservasFake implements RepositorioReservas {
  private readonly reservas: Reserva[] = [];

  public salvar(reserva: Reserva): void {
    const idx = this.reservas.findIndex((r) => r.id === reserva.id);
    if (idx >= 0) {
      this.reservas[idx] = reserva;
    } else {
      this.reservas.push(reserva);
    }
  }

  public buscarPorId(id: string): Reserva | null {
    return this.reservas.find((r) => r.id === id) ?? null;
  }

  public listarTodas(): Reserva[] {
    return [...this.reservas];
  }

  public listarPorUsuario(usuario: string): Reserva[] {
    return this.reservas.filter((r) => r.solicitanteId === usuario);
  }

  public listarPorRecurso(recurso: string, periodo: Periodo): Reserva[] {
    return this.reservas.filter(
      (r) => r.recursoId === recurso && r.periodo.sobrepoe(periodo)
    );
  }

  public listarParaAtivar(agora: Date): Reserva[] {
    return this.reservas.filter(
      (r) =>
        r.estado === EstadoReserva.APROVADA &&
        r.periodo.inicio.getTime() <= agora.getTime()
    );
  }

  public listarParaEncerrar(agora: Date): Reserva[] {
    return this.reservas.filter(
      (r) =>
        r.estado === EstadoReserva.ATIVA &&
        r.periodo.fim.getTime() <= agora.getTime()
    );
  }
}
