import { Usuario } from "../identidade/index.ts";
import { Notificador } from "./porta.ts";

export interface NotificacaoRegistrada {
  destinatario: Usuario;
  mensagem: string;
  enviadaEm: Date;
}

// Adaptador local de e-mail
export class EmailNotificador implements Notificador {
  private readonly hostSmtp: string;
  public readonly enviadas: NotificacaoRegistrada[] = [];

  constructor({ hostSmtp = "localhost:1025" }: { hostSmtp?: string } = {}) {
    this.hostSmtp = hostSmtp;
  }

  public notificar(destinatario: Usuario, mensagem: string): void {
    this.enviadas.push({
      destinatario,
      mensagem,
      enviadaEm: new Date(),
    });
    // Simula envio via SMTP para o endereço de contato institucional 
    void this.hostSmtp;
  }
}

// implementação fake em memória usada nos testes 
export class NotificadorFake implements Notificador {
  public readonly mensagens: NotificacaoRegistrada[] = [];
  public simularFalha = false;

  public notificar(destinatario: Usuario, mensagem: string): void {
    if (this.simularFalha) {
      throw new Error("Falha simulada no servidor de notificações.");
    }
    this.mensagens.push({
      destinatario,
      mensagem,
      enviadaEm: new Date(),
    });
  }
}
