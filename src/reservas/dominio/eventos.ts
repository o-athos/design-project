export abstract class EventoReserva {
  public readonly tipo: string;
  public readonly reservaId: string;
  public readonly solicitanteId: string;
  public readonly ocorridoEm: Date;

  protected constructor(
    tipo: string,
    {
      reservaId,
      solicitanteId,
      ocorridoEm = new Date(),
    }: { reservaId: string; solicitanteId: string; ocorridoEm?: Date }
  ) {
    this.tipo = tipo;
    this.reservaId = reservaId;
    this.solicitanteId = solicitanteId;
    this.ocorridoEm = ocorridoEm;
  }
}

export class ReservaPendente extends EventoReserva {
  public readonly responsavelId: string;

  constructor({
    reservaId,
    solicitanteId,
    responsavelId,
    ocorridoEm,
  }: {
    reservaId: string;
    solicitanteId: string;
    responsavelId: string;
    ocorridoEm?: Date;
  }) {
    super("ReservaPendente", { reservaId, solicitanteId, ocorridoEm });
    this.responsavelId = responsavelId;
    Object.freeze(this);
  }
}

export class ReservaAprovada extends EventoReserva {
  public readonly aprovadorId: string | null;

  constructor({
    reservaId,
    solicitanteId,
    aprovadorId = null,
    ocorridoEm,
  }: {
    reservaId: string;
    solicitanteId: string;
    aprovadorId?: string | null;
    ocorridoEm?: Date;
  }) {
    super("ReservaAprovada", { reservaId, solicitanteId, ocorridoEm });
    this.aprovadorId = aprovadorId;
    Object.freeze(this);
  }
}

export class ReservaRejeitada extends EventoReserva {
  public readonly aprovadorId: string;

  constructor({
    reservaId,
    solicitanteId,
    aprovadorId,
    ocorridoEm,
  }: {
    reservaId: string;
    solicitanteId: string;
    aprovadorId: string;
    ocorridoEm?: Date;
  }) {
    super("ReservaRejeitada", { reservaId, solicitanteId, ocorridoEm });
    this.aprovadorId = aprovadorId;
    Object.freeze(this);
  }
}

export class ReservaCancelada extends EventoReserva {
  constructor(params: {
    reservaId: string;
    solicitanteId: string;
    ocorridoEm?: Date;
  }) {
    super("ReservaCancelada", params);
    Object.freeze(this);
  }
}

export class ReservaAtivada extends EventoReserva {
  constructor(params: {
    reservaId: string;
    solicitanteId: string;
    ocorridoEm?: Date;
  }) {
    super("ReservaAtivada", params);
    Object.freeze(this);
  }
}

export class ReservaEncerrada extends EventoReserva {
  constructor(params: {
    reservaId: string;
    solicitanteId: string;
    ocorridoEm?: Date;
  }) {
    super("ReservaEncerrada", params);
    Object.freeze(this);
  }
}
