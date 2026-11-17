export const PAGINA_WEB_HTML = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DINF Cluster</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #09090b;
      --panel: #121215;
      --border: #27272a;
      --border-subtle: #1f1f22;
      --text: #fafafa;
      --muted: #a1a1aa;
      --accent: #fafafa;
      --accent-fg: #09090b;
      --green: #22c55e;
      --amber: #eab308;
      --red: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }

    /* Navbar refinada */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 60px;
      border-bottom: 1px solid var(--border);
      background: rgba(18, 18, 21, 0.88);
      backdrop-filter: blur(12px);
    }
    .topbar-inner {
      max-width: 1120px;
      height: 100%;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
    }
    .brand-title {
      font-weight: 700;
      font-size: 22px;
      letter-spacing: -0.03em;
      color: var(--text);
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 4px 6px 4px 10px;
    }
    .user-pill-label {
      font-size: 11px;
      color: var(--muted);
      font-weight: 500;
    }
    .user-pill select {
      border: none;
      background: transparent;
      padding: 4px 6px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text);
    }
    .user-pill select:focus {
      outline: none;
    }

    select, input {
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 13px;
      outline: none;
      cursor: pointer;
    }
    select:focus, input:focus {
      border-color: #52525b;
    }
    input[type="datetime-local"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.8;
    }
    .btn {
      background: var(--accent);
      color: var(--accent-fg);
      border: 1px solid var(--accent);
      border-radius: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn:hover { opacity: 0.9; }
    .btn-ghost {
      background: var(--bg);
      color: #d4d4d8;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px 12px;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-ghost:hover {
      color: var(--text);
      background: #18181b;
      border-color: #3f3f46;
    }

    .container {
      max-width: 1120px;
      margin: 24px auto;
      padding: 0 24px 40px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .stat-head {
      display: flex;
      justify-content: space-between;
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 8px;
    }
    .stat-val {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .main-grid {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 16px;
      align-items: start;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin: 0 0 14px;
      color: var(--text);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .field {
      margin-bottom: 12px;
    }
    .field label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 5px;
    }
    .field input, .field select {
      width: 100%;
    }
    .right-col {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .quotas-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .quota-box {
      border: 1px solid var(--border-subtle);
      background: var(--bg);
      border-radius: 6px;
      padding: 10px 12px;
    }
    .quota-top {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }
    .bar-bg {
      height: 4px;
      background: #27272a;
      border-radius: 99px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      background: var(--text);
      transition: width 0.2s;
    }
    .table-scroll {
      max-height: 245px;
      overflow-y: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      padding: 9px 8px;
      border-bottom: 1px solid var(--border-subtle);
    }
    th {
      color: var(--muted);
      font-weight: 500;
      font-size: 12px;
      position: sticky;
      top: 0;
      background: var(--panel);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 99px;
      border: 1px solid var(--border);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .dot-green { background: var(--green); }
    .dot-amber { background: var(--amber); }
    .dot-red { background: var(--red); }

    .logs-box {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      max-height: 150px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .log-line {
      padding: 5px 8px;
      border-radius: 4px;
      background: var(--bg);
      color: #d4d4d8;
      border-left: 2px solid #3f3f46;
    }
    .log-ok { border-left-color: var(--green); }
    .log-err { border-left-color: var(--red); color: #fca5a5; }
    .log-notif { border-left-color: #a1a1aa; }
    .log-time { color: #71717a; margin-right: 8px; }

    /* Pop-ups de Notificação Cinza Claro e Elegante */
    #toasts {
      position: fixed;
      top: 72px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 350px;
    }
    .toast {
      background: #e4e4e7;
      color: #09090b;
      border: 1px solid #f4f4f5;
      border-radius: 10px;
      padding: 13px 15px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
      animation: toastSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }
    .toast-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .toast-tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 7px;
      border-radius: 4px;
      background: #d4d4d8;
      color: #18181b;
    }
    .toast-close {
      background: none;
      border: none;
      color: #52525b;
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .toast-close:hover {
      background: #d4d4d8;
      color: #09090b;
    }
    .toast-dest {
      font-size: 12.5px;
      font-weight: 600;
      color: #18181b;
      margin-bottom: 3px;
    }
    .toast-body {
      font-size: 12px;
      color: #3f3f46;
      line-height: 1.4;
    }
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: #52525b;
      width: 100%;
      animation: toastTimer 4.5s linear forwards;
    }
    @keyframes toastSlide {
      from { opacity: 0; transform: translateX(24px) scale(0.98); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes toastTimer {
      from { width: 100%; }
      to { width: 0%; }
    }
  </style>
</head>
<body>
  <div id="toasts"></div>

  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <span class="brand-title">DINF</span>
      </div>
      <div class="actions">
        <div class="user-pill">
          <span class="user-pill-label">Conta</span>
          <select id="usuarioSelect" onchange="trocarUsuario()">
            <option value="aluno-1">aluno-1 (ALUNO)</option>
            <option value="doutorando-1">doutorando-1 (DOUTORANDO)</option>
            <option value="orientador-1">orientador-1 (ORIENTADOR)</option>
          </select>
        </div>
        <button class="btn-ghost" onclick="resetarSistema()">Resetar</button>
      </div>
    </div>
  </header>

  <div class="container">
    <div class="stats" id="cardsRecursos"></div>

    <div class="main-grid">
      <div class="card">
        <div class="section-title">Nova Reserva</div>

        <div class="field">
          <label>Recurso</label>
          <select id="recursoId" onchange="aoMudarRecurso()">
            <option value="gpu-a100">gpu-a100 (4 GPUs)</option>
            <option value="srv-dgx">srv-dgx (1 Servidor)</option>
            <option value="stg-ceph">stg-ceph (50 TB)</option>
          </select>
        </div>

        <div class="field">
          <label>Projeto</label>
          <select id="projetoId">
            <option value="proj-ia">proj-ia</option>
          </select>
        </div>

        <div class="field">
          <label>Quantidade</label>
          <select id="quantidade"></select>
        </div>

        <div class="field">
          <label>Início</label>
          <input
            type="datetime-local"
            id="inicio"
            value="2026-11-20T08:00"
            onclick="this.showPicker && this.showPicker()"
            onchange="atualizarPainel()"
          />
        </div>

        <div class="field">
          <label>Fim</label>
          <input
            type="datetime-local"
            id="fim"
            value="2026-11-20T18:00"
            onclick="this.showPicker && this.showPicker()"
            onchange="atualizarPainel()"
          />
        </div>

        <button class="btn" style="width:100%; margin-top:4px;" onclick="enviarReserva()">Reservar</button>
      </div>

      <div class="right-col">
        <div class="card">
          <div class="section-title">
            <span>Quotas (proj-ia)</span>
            <span style="color:var(--muted); font-weight:400; font-size:12px;">orientador-1</span>
          </div>
          <div class="quotas-grid" id="painelQuotas"></div>
        </div>

        <div class="card">
          <div class="section-title">
            <span>Reservas</span>
            <span id="contadorReservas" style="color:var(--muted); font-weight:400; font-size:12px;"></span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Recurso</th>
                  <th>Qtd</th>
                  <th>Período</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="tabelaReservas"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-title">
        <span>Logs</span>
        <button class="btn-ghost" style="padding:4px 10px; font-size:11.5px;" onclick="limparLogs()">Limpar</button>
      </div>
      <div class="logs-box" id="listaLogs"></div>
    </div>
  </div>

  <script>
    let qtdNotificacoesConhecidas = 0;

    const OPCOES_QUANTIDADE = {
      "gpu-a100": [
        { val: 1, texto: "1 GPU" },
        { val: 2, texto: "2 GPUs" },
        { val: 3, texto: "3 GPUs" },
        { val: 4, texto: "4 GPUs" },
      ],
      "srv-dgx": [
        { val: 1, texto: "1 Servidor" },
      ],
      "stg-ceph": [
        { val: 5, texto: "5 TB" },
        { val: 10, texto: "10 TB" },
        { val: 15, texto: "15 TB" },
        { val: 20, texto: "20 TB" },
        { val: 25, texto: "25 TB" },
      ],
    };

    function popularQuantidades() {
      const rec = document.getElementById("recursoId").value;
      const sel = document.getElementById("quantidade");
      const lista = OPCOES_QUANTIDADE[rec] || [{ val: 1, texto: "1" }];
      sel.innerHTML = lista
        .map(o => \`<option value="\${o.val}">\${o.texto}</option>\`)
        .join("");
    }

    async function aoMudarRecurso() {
      popularQuantidades();
      await atualizarPainel();
    }

    function hora() {
      return new Date().toTimeString().slice(0, 8);
    }

    function log(msg, tipo = "info") {
      const box = document.getElementById("listaLogs");
      const el = document.createElement("div");
      const cls = tipo === "ok" ? "log-ok" : tipo === "err" ? "log-err" : tipo === "notif" ? "log-notif" : "";
      el.className = \`log-line \${cls}\`;
      el.innerHTML = \`<span class="log-time">\${hora()}</span>\${msg}\`;
      box.prepend(el);
    }

    function limparLogs() {
      document.getElementById("listaLogs").innerHTML = "";
    }

    function formatarMensagemReal(n) {
      const idCurto = (n.mensagem.match(/[0-9a-f]{8}-[0-9a-f-]{27}/i) || [""])[0].slice(0, 6);
      const ref = idCurto ? \`#\${idCurto}\` : "";
      if (n.mensagem.includes("aguarda sua aprovação")) {
        const sol = (n.mensagem.match(/solicitante:\\s*([^)]+)/i) || ["", "aluno"])[1];
        return \`Nova solicitação de reserva \${ref} enviada por \${sol} aguarda sua aprovação como orientador responsável.\`;
      }
      if (n.mensagem.includes("ReservaAprovada")) {
        return \`Sua reserva \${ref} foi aprovada automaticamente e o recurso já está alocado na agenda do cluster.\`;
      }
      return n.mensagem;
    }

    function popup(n) {
      const wrap = document.getElementById("toasts");
      const el = document.createElement("div");
      const dot = n.papel === "ORIENTADOR" ? "dot-amber" : "dot-green";
      const textoReal = formatarMensagemReal(n);
      el.className = "toast";
      el.innerHTML = \`
        <div class="toast-head">
          <span class="toast-tag"><span class="dot \${dot}"></span>E-mail enviado · \${n.papel}</span>
          <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
        </div>
        <div class="toast-dest">Para: \${n.contato}</div>
        <div class="toast-body">\${textoReal}</div>
        <div class="toast-progress"></div>
      \`;
      wrap.appendChild(el);
      setTimeout(() => {
        if (el.parentElement) el.remove();
      }, 4500);
    }

    function paraIso(val) {
      const limpo = String(val || "").trim();
      if (!limpo) return null;
      const iso = limpo.endsWith("Z") ? limpo : \`\${limpo}:00Z\`;
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }

    function paraBr(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return \`\${String(d.getUTCDate()).padStart(2,'0')}/\${String(d.getUTCMonth()+1).padStart(2,'0')} \${String(d.getUTCHours()).padStart(2,'0')}:\${String(d.getUTCMinutes()).padStart(2,'0')}\`;
    }

    function calcularUsado(q) {
      const c = q.consumosRegistrados || [];
      if (q.modo === "ACUMULADA_MENSAL") {
        return c.reduce((a, x) => a + x.quantidade * ((new Date(x.fim) - new Date(x.inicio)) / 3600000), 0);
      }
      let p = 0;
      for (const x of c) {
        const t = new Date(x.inicio).getTime();
        const s = c.filter(y => new Date(y.inicio).getTime() <= t && t < new Date(y.fim).getTime()).reduce((a, y) => a + y.quantidade, 0);
        if (s > p) p = s;
      }
      return p;
    }

    async function trocarUsuario() {
      const u = document.getElementById("usuarioSelect").value;
      log(\`Usuário: \${u}\`);
      await atualizarPainel();
    }

    async function resetarSistema() {
      await fetch("/reset", { method: "POST" });
      qtdNotificacoesConhecidas = 0;
      document.getElementById("toasts").innerHTML = "";
      limparLogs();
      log("Estado resetado.");
      await atualizarPainel();
    }

    async function atualizarPainel() {
      const u = document.getElementById("usuarioSelect").value;
      const ini = paraIso(document.getElementById("inicio").value) || "2026-11-20T08:00:00.000Z";
      const fim = paraIso(document.getElementById("fim").value) || "2026-11-20T18:00:00.000Z";

      const [recursos, projetos, reservas, notificacoes] = await Promise.all([
        fetch("/recursos").then(r => r.json()),
        fetch("/projetos").then(r => r.json()),
        fetch("/reservas", { headers: { "x-usuario-id": u } }).then(r => r.json()),
        fetch("/notificacoes").then(r => r.json()),
      ]);

      if (notificacoes.length > qtdNotificacoesConhecidas) {
        const novas = notificacoes.slice(qtdNotificacoesConhecidas);
        qtdNotificacoesConhecidas = notificacoes.length;
        for (const n of novas) {
          popup(n);
          log(\`E-mail enviado para \${n.contato}: "\${formatarMensagemReal(n)}"\`, "notif");
        }
      }

      const agendas = await Promise.all(
        recursos.map(r =>
          fetch(\`/recursos/\${r.id}/agenda?inicio=\${encodeURIComponent(ini)}&fim=\${encodeURIComponent(fim)}\`)
            .then(res => res.ok ? res.json() : null)
        )
      );

      document.getElementById("cardsRecursos").innerHTML = recursos.map((r, i) => {
        const livre = agendas[i] ? agendas[i].capacidadeLivre : r.capacidade;
        const dot = livre > 0 ? "dot-green" : "dot-red";
        return \`
          <div class="card">
            <div class="stat-head">
              <span>\${r.id}</span>
              <span class="pill"><span class="dot \${dot}"></span>\${r.tipo}</span>
            </div>
            <div class="stat-val">\${livre} / \${r.capacidade} <span style="font-size:12px; color:var(--muted); font-weight:400;">livres</span></div>
          </div>
        \`;
      }).join("");

      const proj = projetos[0];
      if (proj) {
        document.getElementById("painelQuotas").innerHTML = Object.entries(proj.quotas).map(([tipo, q]) => {
          const usado = Number(calcularUsado(q).toFixed(1));
          const pct = Math.min(100, Math.round((usado / q.limite) * 100));
          const un = q.modo === "ACUMULADA_MENSAL" ? "h" : "TB";
          return \`
            <div class="quota-box">
              <div class="quota-top">
                <span style="color:var(--muted)">\${tipo}</span>
                <span>\${usado} / \${q.limite} \${un}</span>
              </div>
              <div class="bar-bg"><div class="bar-fill" style="width:\${pct}%"></div></div>
            </div>
          \`;
        }).join("");
      }

      document.getElementById("contadorReservas").textContent = \`\${reservas.length}\`;
      document.getElementById("tabelaReservas").innerHTML = reservas.length === 0
        ? "<tr><td colspan='5' style='color:var(--muted);'>Sem reservas</td></tr>"
        : reservas.map(r => {
            const dot = r.estado === "APROVADA" ? "dot-green" : "dot-amber";
            return \`<tr>
              <td><code>\${r.id.slice(0, 6)}</code></td>
              <td>\${r.recursoId}</td>
              <td>\${r.quantidade}</td>
              <td>\${paraBr(r.inicio)} → \${paraBr(r.fim)}</td>
              <td><span class="pill"><span class="dot \${dot}"></span>\${r.estado}</span></td>
            </tr>\`;
          }).join("");
    }

    async function enviarReserva() {
      const u = document.getElementById("usuarioSelect").value;
      const recursoId = document.getElementById("recursoId").value;
      const projetoId = document.getElementById("projetoId").value;
      const quantidade = Number(document.getElementById("quantidade").value);
      const ini = paraIso(document.getElementById("inicio").value);
      const fim = paraIso(document.getElementById("fim").value);

      if (!ini || !fim) {
        log("Erro: selecione as datas de início e fim", "err");
        return;
      }

      const resp = await fetch("/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-usuario-id": u },
        body: JSON.stringify({ projetoId, recursoId, quantidade, inicio: ini, fim }),
      });
      const d = await resp.json();

      if (resp.status === 201) {
        log(\`201 Created - \${d.recursoId} (\${d.quantidade}) [\${d.estado}]\`, "ok");
      } else {
        log(\`\${resp.status} - \${d.erro}\`, "err");
      }
      await atualizarPainel();
    }

    popularQuantidades();
    log("Pronto.");
    atualizarPainel();
  </script>
</body>
</html>`;
