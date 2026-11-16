import { Usuario } from "../identidade/index.ts";

export interface Notificador {
  notificar(destinatario: Usuario, mensagem: string): void;
}
