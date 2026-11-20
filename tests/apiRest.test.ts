import { describe, expect, it } from "vitest";
import { construirServidor } from "../src/app/main.ts";
import {
  PoliticaGpuApenasDoutorandos,
  PoliticaLimiteGpuDuracao,
} from "../src/quotas/index.ts";

function aguardarEntregaAssincrona(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

describe("Integração HTTP — Controlador REST (POST /reservas, GET /reservas, GET /recursos/:id/agenda)", () => {
  it("POST /reservas cria reserva APROVADA (201), permite consultas e dispara notificação assíncrona pós-commit", async () => {
    const app = construirServidor();

    try {
      const postResp = await app.inject({
        method: "POST",
        url: "/reservas",
        headers: { "x-usuario-id": "aluno-1" },
        payload: {
          recursoId: "gpu-a100",
          projetoId: "proj-ia",
          quantidade: 2,
          inicio: "2026-11-20T08:00:00Z",
          fim: "2026-11-20T18:00:00Z",
        },
      });

      expect(postResp.statusCode).toBe(201);
      expect(postResp.json().estado).toBe("APROVADA");

      const getReservas = await app.inject({
        method: "GET",
        url: "/reservas",
        headers: { "x-usuario-id": "aluno-1" },
      });
      expect(getReservas.statusCode).toBe(200);
      expect(getReservas.json()).toHaveLength(1);

      const getAgenda = await app.inject({
        method: "GET",
        url: "/recursos/gpu-a100/agenda?inicio=2026-11-20T08:00:00Z&fim=2026-11-20T18:00:00Z",
      });
      expect(getAgenda.statusCode).toBe(200);
      expect(getAgenda.json().capacidadeLivre).toBe(2);

      await aguardarEntregaAssincrona();

      const getNotif = await app.inject({
        method: "GET",
        url: "/notificacoes",
      });
      expect(getNotif.statusCode).toBe(200);
      expect(getNotif.json()).toHaveLength(1);
      expect(getNotif.json()[0].destinatarioId).toBe("aluno-1");
    } finally {
      await app.close();
    }
  });

  it("retorna os códigos de erro esperados: 400 (período inválido), 403 (política NEGAR), 404 (inexistente), 409 (indisponível) e 422 (quota)", async () => {
    const app = construirServidor({
      politicas: [
        new PoliticaLimiteGpuDuracao(),
        new PoliticaGpuApenasDoutorandos(["gpu-a100"]),
      ],
    });

    try {
      // 400: início posterior ao fim
      const r400 = await app.inject({
        method: "POST",
        url: "/reservas",
        headers: { "x-usuario-id": "doutorando-1" },
        payload: {
          recursoId: "gpu-a100",
          projetoId: "proj-ia",
          quantidade: 1,
          inicio: "2026-11-20T18:00:00Z",
          fim: "2026-11-20T08:00:00Z",
        },
      });
      expect(r400.statusCode).toBe(400);

      // 403: aluno comum tentando reservar GPU com PoliticaGpuApenasDoutorandos ativa
      const r403 = await app.inject({
        method: "POST",
        url: "/reservas",
        headers: { "x-usuario-id": "aluno-1" },
        payload: {
          recursoId: "gpu-a100",
          projetoId: "proj-ia",
          quantidade: 1,
          inicio: "2026-11-20T08:00:00Z",
          fim: "2026-11-20T12:00:00Z",
        },
      });
      expect(r403.statusCode).toBe(403);

      // 404: recurso inexistente na agenda
      const r404 = await app.inject({
        method: "GET",
        url: "/recursos/recurso-inexistente/agenda",
      });
      expect(r404.statusCode).toBe(404);

      // 409: quantidade maior que a capacidade do recurso
      const r409 = await app.inject({
        method: "POST",
        url: "/reservas",
        headers: { "x-usuario-id": "doutorando-1" },
        payload: {
          recursoId: "srv-dgx",
          projetoId: "proj-ia",
          quantidade: 2,
          inicio: "2026-11-20T08:00:00Z",
          fim: "2026-11-20T12:00:00Z",
        },
      });
      expect(r409.statusCode).toBe(409);

      // 422: pedido excede a quota mensal de GPU-horas (200h)
      const r422 = await app.inject({
        method: "POST",
        url: "/reservas",
        headers: { "x-usuario-id": "doutorando-1" },
        payload: {
          recursoId: "gpu-a100",
          projetoId: "proj-ia",
          quantidade: 4,
          inicio: "2026-11-20T08:00:00Z",
          fim: "2026-11-23T08:00:00Z",
        },
      });
      expect(r422.statusCode).toBe(422);
    } finally {
      await app.close();
    }
  });
});
