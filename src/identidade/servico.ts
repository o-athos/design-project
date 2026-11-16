import { Papel, Usuario } from "./dominio.ts";

export class AutenticacaoError extends Error {
  constructor(mensagem = "Credencial inválida.") {
    super(mensagem);
    this.name = "AutenticacaoError";
  }
}

export interface ServicoAutenticacao {
  autenticar(credencial?: string | null): Usuario;
}

export interface DiretorioUsuarios {
  buscar(id: string): Usuario | null;
}

export class DiretorioUsuariosEmMemoria implements DiretorioUsuarios {
  private readonly usuarios = new Map<string, Usuario>();

  constructor(usuarios: Iterable<Usuario> = []) {
    for (const u of usuarios) {
      this.registrar(u);
    }
  }

  public registrar(usuario: Usuario): void {
    this.usuarios.set(usuario.id, usuario);
  }

  public buscar(id: string): Usuario | null {
    return this.usuarios.get(id) ?? null;
  }
}

export interface ServicoAutenticacaoFakeProps {
  usuarioPadrao?: Usuario;
  diretorio?: DiretorioUsuarios;
}


//  implementação  para o protótipo e testes
//  devolve um usuário fixo quando nenhuma credencial é informada
export class ServicoAutenticacaoFake implements ServicoAutenticacao {
  private readonly usuarioPadrao: Usuario;
  private readonly diretorio?: DiretorioUsuarios;

  constructor({ usuarioPadrao, diretorio }: ServicoAutenticacaoFakeProps = {}) {
    this.usuarioPadrao =
      usuarioPadrao ??
      new Usuario({
        id: "aluno-1",
        papel: Papel.ALUNO,
        contato: "aluno1@inf.ufpr.br",
        nome: "Aluno Pesquisador",
      });
    this.diretorio = diretorio;
  }

  public autenticar(credencial?: string | null): Usuario {
    if (!credencial) {
      return this.usuarioPadrao;
    }
    if (this.diretorio) {
      const encontrado = this.diretorio.buscar(credencial);
      if (encontrado) {
        return encontrado;
      }
    }
    if (credencial === this.usuarioPadrao.id) {
      return this.usuarioPadrao;
    }
    throw new AutenticacaoError(`Credencial inválida: '${credencial}'.`);
  }
}
