import { CatalogoRecursos } from "../../catalogo/index.ts";
import { ControleQuotas, Decisao, Pedido } from "../../quotas/index.ts";
import {
  AgendaRecurso,
  EstadoReserva,
  Periodo,
  Reserva,
  ReservaAprovada,
  ReservaPendente,
} from "../dominio/index.ts";
import {
  PublicadorEventos,
  RepositorioReservas,
  UnidadeDeTrabalho,
} from "./portas.ts";

export class PedidoNegadoPorPoliticaError extends Error {
  constructor(
    mensagem = "Solicitação negada pelas políticas de autorização do recurso."
  ) {
    super(mensagem);
    this.name = "PedidoNegadoPorPoliticaError";
  }
}

export interface SolicitarReservaComando {
  recursoId: string;
  projetoId: string;
  solicitanteId: string;
  papelSolicitante: string;
  quantidade: number;
  inicio: Date | string;
  fim: Date | string;
}

export interface SolicitarReservaDeps {
  uow: UnidadeDeTrabalho;
  catalogo: CatalogoRecursos;
  quotas: ControleQuotas;
  repositorio: RepositorioReservas;
  publicador: PublicadorEventos;
}


 // solicitar Reserva (POST)
export class SolicitarReservaUseCase {
  private readonly uow: UnidadeDeTrabalho;
  private readonly catalogo: CatalogoRecursos;
  private readonly quotas: ControleQuotas;
  private readonly repositorio: RepositorioReservas;
  private readonly publicador: PublicadorEventos;

  constructor({
    uow,
    catalogo,
    quotas,
    repositorio,
    publicador,
  }: SolicitarReservaDeps) {
    this.uow = uow;
    this.catalogo = catalogo;
    this.quotas = quotas;
    this.repositorio = repositorio;
    this.publicador = publicador;
  }

  public executar(comando: SolicitarReservaComando): Reserva {
    const periodo = new Periodo(comando.inicio, comando.fim);

    return this.uow.executar(() => {
      //lock do recurso
      const recurso = this.catalogo.obterParaAtualizacao(comando.recursoId);

      // buscar reservas do período 
      const reservasDoPeriodo = this.repositorio.listarPorRecurso(
        recurso.id,
        periodo
      );
      const agenda = new AgendaRecurso(recurso, reservasDoPeriodo);

      // verificar disponibilidade física no períod
      agenda.verificarDisponibilidade(periodo, comando.quantidade);

      const pedido = new Pedido({
        projetoId: comando.projetoId,
        recursoId: recurso.id,
        tipoRecurso: recurso.tipo,
        quantidade: comando.quantidade,
        inicio: periodo.inicio,
        fim: periodo.fim,
        papelSolicitante: comando.papelSolicitante,
      });

      // lock da quota e verificação de saldo
      this.quotas.obterParaAtualizacao(comando.projetoId, pedido);
      this.quotas.verificarQuota(pedido);

      // avaliar políticas de autorização
      const decisao = this.quotas.avaliarPoliticas(pedido);
      if (decisao === Decisao.NEGAR) {
        throw new PedidoNegadoPorPoliticaError();
      }

      const estadoInicial =
        decisao === Decisao.AUTO_APROVAR
          ? EstadoReserva.APROVADA
          : EstadoReserva.PENDENTE;

      //  Agenda recurso cria a Reserva 
      const reserva = agenda.criarReserva({
        projetoId: comando.projetoId,
        solicitanteId: comando.solicitanteId,
        periodo,
        quantidade: comando.quantidade,
        estadoInicial,
      });

      //  consumir quota e persistir reserva na mesma transação
      this.quotas.consumir(pedido);
      this.repositorio.salvar(reserva);

      if (estadoInicial === EstadoReserva.PENDENTE) {
        const responsavelId = this.quotas.responsavelDe(comando.projetoId);
        this.publicador.publicar(
          new ReservaPendente({
            reservaId: reserva.id,
            solicitanteId: reserva.solicitanteId,
            responsavelId,
          })
        );
      } else {
        this.publicador.publicar(
          new ReservaAprovada({
            reservaId: reserva.id,
            solicitanteId: reserva.solicitanteId,
            aprovadorId: null,
          })
        );
      }

      return reserva;
    });
  }
}
