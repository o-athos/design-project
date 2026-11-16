import { Provisionador } from "../reservas/aplicacao/index.ts";
import { Reserva } from "../reservas/dominio/index.ts";

export class SlurmProvisionador implements Provisionador {
  public readonly comandosExecutados: string[] = [];

  public liberarAcesso(reserva: Reserva): void {
    this.comandosExecutados.push(
      `scontrol create reservationname=${reserva.id} user=${reserva.solicitanteId} tres=gpu:${reserva.quantidade}`
    );
  }

  public revogarAcesso(reserva: Reserva): void {
    this.comandosExecutados.push(
      `scontrol delete reservationname=${reserva.id}`
    );
  }
}

 // implementação fake em memoria para testes
export class ProvisionadorFake implements Provisionador {
  public readonly acessosLiberados: string[] = [];
  public readonly acessosRevogados: string[] = [];

  public liberarAcesso(reserva: Reserva): void {
    this.acessosLiberados.push(reserva.id);
  }

  public revogarAcesso(reserva: Reserva): void {
    this.acessosRevogados.push(reserva.id);
  }
}
