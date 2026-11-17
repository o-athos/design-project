import * as readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { construirServidor } from "./main.ts";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";
const BG_BLUE = "\x1b[44m\x1b[37m";
const DIM = "\x1b[2m";

class CancelarOperacaoError extends Error {
  constructor() {
    super("Operação cancelada pelo usuário.");
  }
}

class EncerrarCliError extends Error {
  constructor() {
    super("Encerrando CLI.");
  }
}

function titulo(texto: string): void {
  console.log(`\n${BOLD}${CYAN}=== ${texto} ===${RESET}`);
}

function bannerResultado(tituloAcao: string): void {
  console.log(
    `\n${BOLD}${MAGENTA}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${RESET}`
  );
  console.log(
    `${BOLD}${MAGENTA}┃ RESULTADO DA ÚLTIMA AÇÃO: ${RESET}${BG_BLUE} ${tituloAcao} ${RESET}`
  );
  console.log(
    `${BOLD}${MAGENTA}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}`
  );
}

function rodapeResultado(): void {
  console.log(
    `${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`
  );
}

// Converte uma data no formato padrão brasileiro ("20/11/2026 08:00")
export function converterDataParaIso(entrada: string): string | null {
  const texto = entrada.trim();

  const brMatch = texto.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+|T)(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?h?$/i
  );
  if (brMatch) {
    const dia = Number(brMatch[1]);
    const mes = Number(brMatch[2]);
    const ano = Number(brMatch[3]);
    const hora = Number(brMatch[4]);
    const min = Number(brMatch[5] ?? "0");
    const seg = Number(brMatch[6] ?? "0");

    if (
      mes < 1 ||
      mes > 12 ||
      dia < 1 ||
      dia > 31 ||
      hora < 0 ||
      hora > 23 ||
      min < 0 ||
      min > 59 ||
      seg < 0 ||
      seg > 59
    ) {
      return null;
    }

    const iso = `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}T${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}Z`;
    const d = new Date(iso);
    if (
      Number.isNaN(d.getTime()) ||
      d.getUTCFullYear() !== ano ||
      d.getUTCMonth() + 1 !== mes ||
      d.getUTCDate() !== dia
    ) {
      return null;
    }
    return iso;
  }

  const isoMatch = texto.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z?$/i
  );
  if (isoMatch) {
    const iso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}:${isoMatch[6] ?? "00"}Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : iso;
  }

  return null;
}

function formatarDataBr(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return iso;
  }
  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const ano = data.getUTCFullYear();
  const hora = String(data.getUTCHours()).padStart(2, "0");
  const min = String(data.getUTCMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

function verificarComandosSaida(
  texto: string,
  emSubmenu: boolean
): void {
  const cmd = texto.trim().toLowerCase();
  if (cmd === "exit" || cmd === "sair" || cmd === "quit") {
    throw new EncerrarCliError();
  }
  if (
    emSubmenu &&
    (cmd === "0" || cmd === "voltar" || cmd === "cancelar")
  ) {
    throw new CancelarOperacaoError();
  }
}

function criarLeitor() {
  const rl = readline.createInterface({
    input,
    output,
    terminal: Boolean(input.isTTY),
    prompt: "",
  });
  const filaLinhas: string[] = [];
  let resolvedorAtual: ((linha: string | null) => void) | null = null;
  let fechado = false;

  rl.on("line", (linha) => {
    if (resolvedorAtual) {
      const fn = resolvedorAtual;
      resolvedorAtual = null;
      fn(linha);
    } else {
      filaLinhas.push(linha);
    }
  });

  rl.on("close", () => {
    fechado = true;
    if (resolvedorAtual) {
      const fn = resolvedorAtual;
      resolvedorAtual = null;
      fn(null);
    }
  });

  return {
    async perguntar(promptSemAnsi: string, emSubmenu = false): Promise<string> {
      if (filaLinhas.length > 0) {
        output.write(promptSemAnsi);
        const linha = filaLinhas.shift()!;
        if (!input.isTTY) {
          output.write(`${linha}\n`);
        }
        verificarComandosSaida(linha, emSubmenu);
        return linha;
      }
      if (fechado) {
        throw new EncerrarCliError();
      }
      rl.setPrompt(promptSemAnsi);
      rl.prompt();
      const resposta = await new Promise<string | null>((resolve) => {
        resolvedorAtual = resolve;
      });
      if (resposta === null) {
        throw new EncerrarCliError();
      }
      verificarComandosSaida(resposta, emSubmenu);
      return resposta;
    },
    fechar() {
      rl.close();
    },
  };
}

async function iniciarCli(): Promise<void> {
  const app = construirServidor();
  const endereco = await app.listen({ port: 0, host: "127.0.0.1" });
  const leitor = criarLeitor();

  let usuarioAtual = "aluno-1";

  async function req(
    method: string,
    rota: string,
    body?: Record<string, unknown>
  ): Promise<{ status: number; dados: any }> {
    const headers: Record<string, string> = {
      "x-usuario-id": usuarioAtual,
    };
    if (body) {
      headers["Content-Type"] = "application/json";
    }
    const resp = await fetch(`${endereco}${rota}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const dados = await resp.json();
    return { status: resp.status, dados };
  }

  async function escolherDaLista<T extends { id: string; label: string }>(
    tituloCampo: string,
    opcoes: T[],
    padraoIndex = 0
  ): Promise<T> {
    while (true) {
      console.log(`\n${BOLD}${tituloCampo}:${RESET} ${DIM}(digite 0 para voltar ou 'exit' para sair)${RESET}`);
      opcoes.forEach((op, idx) => {
        const marcadorPadrao =
          idx === padraoIndex ? ` ${DIM}(padrão no Enter)${RESET}` : "";
        console.log(`  ${BOLD}[${idx + 1}]${RESET} ${op.label}${marcadorPadrao}`);
      });
      const resp = await leitor.perguntar(
        `  Escolha o número [1-${opcoes.length}] (Enter = ${padraoIndex + 1} | 0 = voltar): `,
        true
      );
      const limpo = resp.trim();
      if (limpo === "") {
        return opcoes[padraoIndex];
      }
      const num = Number(limpo);
      if (Number.isInteger(num) && num >= 1 && num <= opcoes.length) {
        return opcoes[num - 1];
      }
      const porId = opcoes.find(
        (o) => o.id.toLowerCase() === limpo.toLowerCase()
      );
      if (porId) {
        return porId;
      }
      console.log(
        `  ${RED}✖ Opção inválida ('${limpo}'). Digite um número de 1 a ${opcoes.length} (ou 0 para voltar).${RESET}`
      );
    }
  }

  async function lerQuantidadeValida(padrao = 2): Promise<number> {
    while (true) {
      console.log(
        `\n${BOLD}Quantidade desejada${RESET} ${DIM}(<= 2 GPUs aprova direto | > 2 GPUs fica PENDENTE | 0 = voltar)${RESET}`
      );
      const resp = await leitor.perguntar(
        `  Informe um inteiro positivo (Enter = ${padrao}): `,
        true
      );
      const limpo = resp.trim();
      if (limpo === "") {
        return padrao;
      }
      const qtd = Number(limpo);
      if (Number.isInteger(qtd) && qtd > 0) {
        return qtd;
      }
      console.log(
        `  ${RED}✖ Quantidade inválida ('${limpo}'). Digite um número inteiro maior que zero (ou 0 para voltar).${RESET}`
      );
    }
  }

  async function lerDataValida(
    rotulo: string,
    exemploPadrao: string
  ): Promise<{ br: string; iso: string }> {
    while (true) {
      console.log(
        `\n${BOLD}${rotulo}${RESET} - Formato: ${CYAN}DD/MM/AAAA HH:MM${RESET} ${DIM}(ex.: ${exemploPadrao} | 0 = voltar | exit = sair)${RESET}`
      );
      const resp = await leitor.perguntar(
        `  Digite a data/hora (Enter = ${exemploPadrao}): `,
        true
      );
      const texto = resp.trim() || exemploPadrao;
      const iso = converterDataParaIso(texto);
      if (iso) {
        return { br: formatarDataBr(iso), iso };
      }
      console.log(
        `  ${RED}✖ Data inválida ('${texto}'). Use o formato DD/MM/AAAA HH:MM (ex.: ${exemploPadrao}) ou 0 para voltar.${RESET}`
      );
    }
  }

  try {
    let rodando = true;
    while (rodando) {
      try {
        const { dados: eu } = await req("GET", "/eu");
        console.log(
          `\n${BOLD}${CYAN}┌──────────────────────────────────────────────────────────────┐${RESET}`
        );
        console.log(
          `${BOLD}${CYAN}│   CLI - Cluster DINF/UFPR (Cliente HTTP -> API REST)         │${RESET}`
        );
        console.log(
          `${BOLD}${CYAN}└──────────────────────────────────────────────────────────────┘${RESET}`
        );
        console.log(
          `${DIM}Servidor API: ${endereco} | Usuário ativo: ${RESET}${BOLD}${GREEN}${eu.id}${RESET} (${eu.papel} - ${eu.contato})`
        );
        console.log(`
  ${BOLD}[1]${RESET} Consultar Catálogo de Recursos e Agenda (${DIM}GET /recursos & /agenda${RESET})
  ${BOLD}[2]${RESET} Consultar Quotas e Consumos do Projeto  (${DIM}GET /projetos${RESET})
  ${BOLD}[3]${RESET} Solicitar Reserva                       (${DIM}POST /reservas${RESET})
  ${BOLD}[4]${RESET} Listar Minhas Reservas                  (${DIM}GET /reservas${RESET})
  ${BOLD}[5]${RESET} Ver Notificações Enviadas Pós-Commit    (${DIM}GET /notificacoes${RESET})
  ${BOLD}[6]${RESET} Simular Concorrência ASR1 (20 pedidos simultâneos em banco isolado)
  ${BOLD}[7]${RESET} Trocar Usuário Autenticado
  ${BOLD}[0]${RESET} Sair ${DIM}(ou digite 'exit' em qualquer tela)${RESET}
`);

        const respostaOpcao = await leitor.perguntar(
          "Escolha uma opção [0-7]: ",
          false
        );
        const opcao = respostaOpcao.trim();

        if (opcao === "1") {
          let ini!: { br: string; iso: string };
          let fim!: { br: string; iso: string };
          while (true) {
            ini = await lerDataValida(
              "Início da janela de consulta",
              "20/11/2026 08:00"
            );
            fim = await lerDataValida(
              "Fim da janela de consulta",
              "20/11/2026 18:00"
            );
            if (new Date(fim.iso).getTime() <= new Date(ini.iso).getTime()) {
              console.log(
                `  ${RED}✖ O horário de fim (${fim.br}) deve ser posterior ao início (${ini.br})! Tente novamente.${RESET}`
              );
              continue;
            }
            break;
          }

          bannerResultado(
            `[1] Catálogo e Disponibilidade (${ini.br} até ${fim.br})`
          );
          const { dados: recursos } = await req("GET", "/recursos");
          const tabela = [];
          for (const r of recursos) {
            const { status, dados: ag } = await req(
              "GET",
              `/recursos/${r.id}/agenda?inicio=${encodeURIComponent(ini.iso)}&fim=${encodeURIComponent(fim.iso)}`
            );
            if (status !== 200) {
              console.log(
                `${RED}✖ Erro ao consultar agenda: ${ag.erro}${RESET}`
              );
              break;
            }
            tabela.push({
              ID: r.id,
              Tipo: r.tipo,
              Nome: r.nome,
              CapacidadeTotal: r.capacidade,
              LivreNoPeriodo: ag.capacidadeLivre,
              ReservasNoPeriodo: ag.reservas.length,
            });
          }
          if (tabela.length > 0) {
            console.table(tabela);
          }
          rodapeResultado();
        } else if (opcao === "2") {
          bannerResultado("[2] Quotas e Consumos do Projeto");
          const { dados: projetos } = await req("GET", "/projetos");
          for (const p of projetos) {
            console.log(
              `Projeto: ${BOLD}${p.projetoId}${RESET} | Orientador Responsável: ${BOLD}${p.responsavelId}${RESET}`
            );
            const linhas = Object.entries(p.quotas).map(
              ([tipo, q]: [string, any]) => {
                const consumos: Array<{ inicio: string; fim: string; quantidade: number }> =
                  q.consumosRegistrados ?? [];
                let totalConsumido = 0;
                if (q.modo === "ACUMULADA_MENSAL") {
                  totalConsumido = consumos.reduce(
                    (acc, c) =>
                      acc +
                      c.quantidade *
                      ((new Date(c.fim).getTime() -
                        new Date(c.inicio).getTime()) /
                        3600000),
                    0
                  );
                } else {
                  const pontos = consumos.map((c) => new Date(c.inicio).getTime());
                  for (const t of pontos) {
                    const simultaneo = consumos
                      .filter(
                        (c) =>
                          new Date(c.inicio).getTime() <= t &&
                          t < new Date(c.fim).getTime()
                      )
                      .reduce((acc, c) => acc + c.quantidade, 0);
                    if (simultaneo > totalConsumido) {
                      totalConsumido = simultaneo;
                    }
                  }
                }
                return {
                  Recurso: tipo,
                  Modo: q.modo,
                  Limite: q.limite,
                  TotalConsumido: Number(totalConsumido.toFixed(2)),
                  ConsumosRegistrados: consumos.length,
                };
              }
            );
            console.table(linhas);
          }
          rodapeResultado();
        } else if (opcao === "3") {
          titulo("Nova Solicitação de Reserva (POST /reservas)");
          const { dados: recursos } = await req("GET", "/recursos");
          const { dados: projetos } = await req("GET", "/projetos");

          const recEscolhido = await escolherDaLista(
            "Selecione o Recurso Computacional",
            recursos.map((r: any) => ({
              id: r.id,
              label: `${r.id} - ${r.nome} (Tipo: ${r.tipo} | Capacidade: ${r.capacidade})`,
            })),
            0
          );

          const projEscolhido = await escolherDaLista(
            "Selecione o Projeto de Pesquisa",
            projetos.map((p: any) => ({
              id: p.projetoId,
              label: `${p.projetoId} (Responsável: ${p.responsavelId})`,
            })),
            0
          );

          const quantidade = await lerQuantidadeValida(2);

          let ini!: { br: string; iso: string };
          let fim!: { br: string; iso: string };
          while (true) {
            ini = await lerDataValida(
              "Data/Hora de Início",
              "20/11/2026 08:00"
            );
            fim = await lerDataValida("Data/Hora de Fim", "20/11/2026 18:00");
            if (new Date(fim.iso).getTime() <= new Date(ini.iso).getTime()) {
              console.log(
                `  ${RED}✖ O horário de fim (${fim.br}) deve ser posterior ao início (${ini.br})! Tente novamente.${RESET}`
              );
              continue;
            }
            break;
          }

          const { status, dados } = await req("POST", "/reservas", {
            recursoId: recEscolhido.id,
            projetoId: projEscolhido.id,
            quantidade,
            inicio: ini.iso,
            fim: fim.iso,
          });

          bannerResultado(`[3] Solicitar Reserva em ${recEscolhido.id}`);
          if (status === 201) {
            const cor = dados.estado === "APROVADA" ? GREEN : YELLOW;
            console.log(
              `${GREEN}✔ HTTP ${status} Created${RESET} - Estado da Reserva: ${BOLD}${cor}${dados.estado}${RESET}`
            );
            console.table([
              {
                ID: dados.id.slice(0, 8),
                Recurso: dados.recursoId,
                Projeto: dados.projetoId,
                Solicitante: dados.solicitanteId,
                Qtd: dados.quantidade,
                Inicio: formatarDataBr(dados.inicio),
                Fim: formatarDataBr(dados.fim),
                DuracaoHoras: dados.duracaoHoras,
                Estado: dados.estado,
              },
            ]);
          } else {
            console.log(`${RED}✖ HTTP ${status} - ${dados.erro}${RESET}`);
          }
          rodapeResultado();
        } else if (opcao === "4") {
          bannerResultado(`[4] Reservas do Usuário (${usuarioAtual})`);
          const { dados } = await req("GET", "/reservas");
          if (dados.length === 0) {
            console.log(
              `${YELLOW}Nenhuma reserva encontrada para ${usuarioAtual}.${RESET}`
            );
          } else {
            console.table(
              dados.map((r: any) => ({
                ID: r.id.slice(0, 8),
                Recurso: r.recursoId,
                Projeto: r.projetoId,
                Qtd: r.quantidade,
                Inicio: formatarDataBr(r.inicio),
                Fim: formatarDataBr(r.fim),
                Estado: r.estado,
              }))
            );
          }
          rodapeResultado();
        } else if (opcao === "5") {
          bannerResultado(
            "[5] Notificações Enviadas Pós-Commit (NotificadorFake)"
          );
          const { dados } = await req("GET", "/notificacoes");
          if (dados.length === 0) {
            console.log(
              `${YELLOW}Nenhuma notificação enviada até o momento.${RESET}`
            );
          } else {
            console.table(
              dados.map((n: any) => ({
                Destinatario: n.destinatarioId,
                Papel: n.papel,
                Contato: n.contato,
                Mensagem: n.mensagem,
              }))
            );
          }
          rodapeResultado();
        } else if (opcao === "6") {
          bannerResultado(
            "[6] Simulação ASR1 (Banco Isolado): 20 pedidos simultâneos disputando 1 GPU livre"
          );
          const appIsolado = construirServidor();
          try {
            await appIsolado.inject({
              method: "POST",
              url: "/reservas",
              headers: { "x-usuario-id": "doutorando-1" },
              payload: {
                recursoId: "gpu-a100",
                projetoId: "proj-ia",
                quantidade: 2,
                inicio: "2026-12-01T14:00:00Z",
                fim: "2026-12-01T16:00:00Z",
              },
            });
            await appIsolado.inject({
              method: "POST",
              url: "/reservas",
              headers: { "x-usuario-id": "doutorando-1" },
              payload: {
                recursoId: "gpu-a100",
                projetoId: "proj-ia",
                quantidade: 1,
                inicio: "2026-12-01T14:00:00Z",
                fim: "2026-12-01T16:00:00Z",
              },
            });

            const respostas = await Promise.all(
              Array.from({ length: 20 }, () =>
                appIsolado.inject({
                  method: "POST",
                  url: "/reservas",
                  headers: { "x-usuario-id": "aluno-1" },
                  payload: {
                    recursoId: "gpu-a100",
                    projetoId: "proj-ia",
                    quantidade: 1,
                    inicio: "2026-12-01T14:00:00Z",
                    fim: "2026-12-01T16:00:00Z",
                  },
                })
              )
            );
            const aprovadas = respostas.filter(
              (r) => r.statusCode === 201
            ).length;
            const recusadas409 = respostas.filter(
              (r) => r.statusCode === 409
            ).length;
            console.log(
              `${DIM}(Executado em banco SQLite isolado para não adicionar reservas falsas na sua sessão)${RESET}`
            );
            console.table([
              {
                Cenario: "1 GPU livre + 20 pedidos simultâneos de 1 GPU",
                "Aprovadas (HTTP 201)": aprovadas,
                "Recusadas por Indisponibilidade (HTTP 409)": recusadas409,
              },
            ]);
          } finally {
            await appIsolado.close();
          }
          rodapeResultado();
        } else if (opcao === "7") {
          const escolhido = await escolherDaLista(
            "Selecione o Usuário Autenticado",
            [
              {
                id: "aluno-1",
                label: "aluno-1 (Papel: ALUNO - aluno1@inf.ufpr.br)",
              },
              {
                id: "doutorando-1",
                label:
                  "doutorando-1 (Papel: DOUTORANDO - doutorando1@inf.ufpr.br)",
              },
              {
                id: "orientador-1",
                label: "orientador-1 (Papel: ORIENTADOR - orientador@inf.ufpr.br)",
              },
            ],
            0
          );
          usuarioAtual = escolhido.id;
          bannerResultado(`[7] Usuário alterado para: ${usuarioAtual}`);
          rodapeResultado();
        } else if (opcao === "0") {
          rodando = false;
        } else {
          bannerResultado("Opção Inválida");
          console.log(
            `${RED}✖ A opção '${opcao}' não existe. Escolha um número entre 0 e 7 (ou 'exit' para sair).${RESET}`
          );
          rodapeResultado();
        }
      } catch (err) {
        if (err instanceof CancelarOperacaoError) {
          bannerResultado("Operação cancelada - retornando ao menu principal");
          rodapeResultado();
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof EncerrarCliError) {
      console.log(`\n${CYAN}Encerrando CLI. ${RESET}`);
    } else {
      throw err;
    }
  } finally {
    leitor.fechar();
    await app.close();
  }
}

const isMain =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("src/app/cli.ts");

if (isMain) {
  iniciarCli();
}
