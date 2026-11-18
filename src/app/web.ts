export const PAGINA_WEB_HTML = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DINF Cluster</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      color-scheme: dark;
      --canvas: #30313a;
      --shell: #171821;
      --card: #21222d;
      --inset: #171821;
      --track: #2b2b36;
      --text: #ffffff;
      --muted: #a0a0a0;
      --faint: #87888c;
      --soft: #e8e8e8;
      --hint: #d2d2d2;
      --mint: #a9dfd8;
      --gold: #feb95a;
      --pink: #f2c8ed;
      --blue: #20aef3;
      --line: rgba(255, 255, 255, 0.06);
      --shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, "Segoe UI", sans-serif;
      background: var(--canvas);
      color: var(--text);
      font-size: 14px;
      -webkit-font-smoothing: antialiased;
    }
    button, input, select { font-family: inherit; }
    ::selection { background: rgba(169, 223, 216, 0.28); color: #fff; }
    :focus-visible { outline: 2px solid var(--mint); outline-offset: 2px; }
    * { scrollbar-width: thin; scrollbar-color: var(--track) transparent; }

    .stage {
      width: auto;
      margin: 20px;
      display: flex;
      align-items: stretch;
      gap: 16px;
    }
    .rail {
      width: 280px;
      flex: none;
      padding: 26px 18px;
      background: var(--shell);
      border-radius: 12px;
      box-shadow: var(--shadow);
    }
    .dots {
      display: flex;
      gap: 4px;
      margin: 0 0 18px 8px;
    }
    .win-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .win-dot.red { background: #ea1701; }
    .win-dot.yellow { background: #feb002; }
    .win-dot.green { background: #029f04; }
    .brand {
      padding: 0 10px 8px;
    }
    .brand strong {
      display: block;
      font-size: 18px;
      font-weight: 600;
      line-height: 22px;
      letter-spacing: -0.02em;
    }
    .brand span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
      line-height: 14px;
    }
    .nav {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 18px;
    }
    .nav-item {
      height: 44px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-radius: 8px;
      color: var(--faint);
      font-size: 14px;
      font-weight: 500;
      line-height: 18px;
      text-decoration: none;
    }
    .nav-item svg {
      width: 16px;
      height: 16px;
      flex: none;
    }
    .nav-item:hover { color: var(--text); }
    .nav-item.is-active {
      background: var(--mint);
      color: var(--shell);
      font-weight: 600;
    }
    .nav-item.is-active:hover { color: var(--shell); }

    .shell {
      flex: 1;
      min-width: 0;
      padding: 18px 20px 22px;
      background: var(--shell);
      border-radius: 24px;
      box-shadow: var(--shadow);
    }
    .shell-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .account-bar {
      flex: 1;
      min-width: 0;
      height: 44px;
      padding: 0 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--card);
      border-radius: 8px;
    }
    .account-label {
      flex: none;
      color: var(--hint);
      font-size: 12px;
      font-weight: 500;
    }
    .btn-reset, .btn-quiet, .btn-primary {
      border: none;
      cursor: pointer;
    }
    .btn-reset {
      height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--card);
      color: var(--soft);
      font-size: 12px;
      font-weight: 500;
    }
    .btn-reset:hover, .btn-quiet:hover { color: var(--text); }
    .avatar {
      width: 32px;
      height: 32px;
      flex: none;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--track);
      color: var(--text);
      font-size: 12px;
      font-weight: 600;
    }
    .content {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .panel {
      background: var(--card);
      border-radius: 10px;
      padding: 16px;
      scroll-margin-top: 20px;
    }
    .panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .panel-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      line-height: 18px;
    }
    .panel-sub, .section-meta {
      color: var(--muted);
      font-size: 10px;
      font-weight: 500;
      line-height: 12px;
    }
    .section-meta { flex: none; padding-top: 2px; font-size: 12px; }
    .panel-sub {
      margin: 5px 0 0;
      max-width: 68ch;
      font-size: 12px;
      line-height: 16px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    .metric {
      min-height: 124px;
      padding: 20px;
      paddingHorizontal: 32px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      background: var(--inset);
      border-radius: 10px;
    }
    .metric-icon {
      width: 26px;
      height: 26px;
      margin-bottom: 12px;
      color: var(--accent);
    }
    .metric-icon svg { width: 26px; height: 26px; display: block; }
    .metric-value {
      font-size: 22px;
      font-weight: 600;
      line-height: 26px;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
    }
    .metric-unit {
      margin-left: 6px;
      color: var(--soft);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0;
    }
    .metric-label {
      margin-top: 5px;
      color: var(--soft);
      font-size: 12px;
      font-weight: 500;
      line-height: 14px;
    }
    .metric-note {
      margin-top: 5px;
      color: var(--accent);
      font-size: 11px;
      font-weight: 500;
      line-height: 13px;
    }
    .accent-0 { --accent: #feb95a; }
    .accent-1 { --accent: #a9dfd8; }
    .accent-2 { --accent: #f2c8ed; }
    .accent-3 { --accent: #20aef3; }

    .main-grid {
      display: grid;
      grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
      gap: 14px;
      align-items: start;
    }
    .right-col {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }
    .field { margin-bottom: 12px; }
    .field label {
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 500;
    }
    select, input {
      color: var(--text);
      background-color: var(--inset);
      border: none;
      border-radius: 8px;
      outline: none;
      font-size: 13px;
      font-weight: 500;
    }
    select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%23A0A0A0' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding: 0 32px 0 12px;
    }
    .field select, .field input {
      width: 100%;
      height: 40px;
    }
    .field input { padding: 0 12px; }
    .account-bar select {
      flex: 1;
      min-width: 0;
      width: auto;
      height: 44px;
      padding-left: 0;
      background-color: transparent;
      color: var(--text);
      font-size: 12px;
    }
    option { background: var(--card); color: var(--text); }
    input[type="datetime-local"]::-webkit-calendar-picker-indicator {
      cursor: pointer;
      filter: brightness(0) invert(1);
      opacity: 1;
    }
    .btn-primary {
      width: 100%;
      height: 40px;
      margin-top: 4px;
      border-radius: 8px;
      background: var(--mint);
      color: var(--shell);
      font-size: 13px;
      font-weight: 600;
    }
    .btn-primary:hover { filter: brightness(1.06); }
    .btn-quiet {
      height: 26px;
      padding: 0 10px;
      border-radius: 6px;
      background: var(--inset);
      color: var(--muted);
      font-size: 11px;
      font-weight: 500;
    }

    .quota-cols, .quota-row {
      display: grid;
      grid-template-columns: 32px minmax(0, 1.15fr) minmax(72px, 1fr) auto;
      gap: 12px;
      align-items: center;
    }
    .quota-cols {
      padding: 0 0 8px;
      border-bottom: 0.5px solid var(--line);
      color: var(--faint);
      font-size: 13px;
      font-weight: 500;
    }
    .quota-row {
      min-height: 36px;
      border-bottom: 0.5px solid var(--line);
    }
    .quota-row:last-child { border-bottom: none; }
    .quota-idx {
      color: var(--text);
      font-size: 13px;
      font-weight: 500;
    }
    .quota-name {
      color: var(--text);
      font-size: 12px;
      font-weight: 500;
    }
    .quota-track {
      height: 6px;
      background: var(--track);
      border-radius: 99px;
      overflow: hidden;
    }
    .quota-cols span:last-child,
    .quota-row .badge { justify-self: end; }
    .quota-fill {
      display: block;
      height: 100%;
      border-radius: 99px;
      background: var(--accent);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 0 8px;
      border: 0.5px solid transparent;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      line-height: 12px;
      white-space: nowrap;
    }
    .badge-accent {
      color: var(--accent);
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .badge-mint {
      color: var(--mint);
      border-color: var(--mint);
      background: rgba(169, 223, 216, 0.12);
    }
    .badge-gold {
      color: #fcb859;
      border-color: #fcb859;
      background: rgba(252, 184, 89, 0.12);
    }

    .table-scroll { max-height: 245px; overflow: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px 8px;
      text-align: left;
      border-bottom: 0.5px solid var(--line);
    }
    th {
      position: sticky;
      top: 0;
      background: var(--card);
      color: var(--faint);
      font-size: 13px;
      font-weight: 500;
    }
    td {
      color: var(--text);
      font-size: 12px;
      font-weight: 500;
    }
    td code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      color: var(--text);
    }
    tbody tr:hover td { background: rgba(255, 255, 255, 0.025); }
    .empty { color: var(--muted); }

    .logs-box {
      max-height: 168px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
    }
    .log-line {
      padding: 7px 10px;
      border-radius: 6px;
      background: var(--inset);
      color: var(--soft);
    }
    .log-ok {
      color: #20aef3;
      background: rgba(32, 174, 243, 0.14);
    }
    .log-err {
      color: #ff5c4a;
      background: rgba(234, 23, 1, 0.16);
    }
    .log-notif {
      color: #feb95a;
      background: rgba(254, 185, 90, 0.14);
    }
    .log-time { color: inherit; margin-right: 8px; }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-green { background: var(--mint); }
    .dot-amber { background: var(--gold); }
    .dot-red { background: #ea1701; }

    #toasts {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 30;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(350px, calc(100vw - 32px));
    }
    .toast {
      position: relative;
      overflow: hidden;
      padding: 13px 15px;
      background: var(--card);
      color: var(--text);
      border: 0.5px solid var(--line);
      border-radius: 10px;
      box-shadow: var(--shadow);
      animation: toastSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1);
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
      gap: 6px;
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--inset);
      color: var(--mint);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .toast-close {
      border: none;
      background: none;
      color: var(--muted);
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
      border-radius: 4px;
    }
    .toast-close:hover { color: var(--text); background: var(--inset); }
    .toast-dest {
      margin-bottom: 3px;
      color: var(--text);
      font-size: 12px;
      font-weight: 600;
    }
    .toast-body {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
    }
    .toast-progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 3px;
      width: 100%;
      background: var(--mint);
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

    @media (max-width: 900px) {
      .stage {
        margin: 12px;
        flex-direction: column;
      }
      .rail { width: 100%; }
      .nav { flex-direction: row; flex-wrap: wrap; }
      .shell { border-radius: 18px; }
      .main-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .stats { grid-template-columns: 1fr; }
      .shell-head { flex-wrap: wrap; }
      .account-bar { width: 100%; flex: none; }
      .quota-cols { display: none; }
      .quota-row { grid-template-columns: 28px minmax(0, 1fr); }
      .quota-track, .quota-row .badge { grid-column: 2; }
      #toasts { left: 16px; right: 16px; bottom: 16px; width: auto; }
    }
  </style>
</head>
<body>
  <div id="toasts"></div>
  <div class="stage">
    <aside class="rail">
      <div class="dots" aria-hidden="true">
        <span class="win-dot red"></span>
        <span class="win-dot yellow"></span>
        <span class="win-dot green"></span>
      </div>
      <div class="brand">
        <strong>DINF</strong>
        <span>Cluster</span>
      </div>
      <nav class="nav" aria-label="Seções">
        <a class="nav-item is-active" href="#topo" data-nav>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><rect x="2.2" y="2.2" width="4.6" height="4.6" rx="1"/><rect x="9.2" y="2.2" width="4.6" height="4.6" rx="1"/><rect x="2.2" y="9.2" width="4.6" height="4.6" rx="1"/><rect x="9.2" y="9.2" width="4.6" height="4.6" rx="1"/></svg>
          <span>Painel</span>
        </a>
        <a class="nav-item" href="#recursos" data-nav>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><rect x="4.2" y="4.2" width="7.6" height="7.6" rx="1.4"/><path d="M6.4 1.8v2.2M9.6 1.8v2.2M6.4 12v2.2M9.6 12v2.2M1.8 6.4h2.2M1.8 9.6h2.2M12 6.4h2.2M12 9.6h2.2"/></svg>
          <span>Recursos</span>
        </a>
        <a class="nav-item" href="#reserva" data-nav>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><rect x="2.2" y="3.2" width="11.6" height="10.4" rx="1.4"/><path d="M2.2 6.5h11.6M5.2 1.8v2.4M10.8 1.8v2.4"/></svg>
          <span>Reserva</span>
        </a>
        <a class="nav-item" href="#quotas" data-nav>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M3.2 13V8.2M8 13V3.2M12.8 13V6.2"/></svg>
          <span>Quotas</span>
        </a>
        <a class="nav-item" href="#reservas" data-nav>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M5 4.2h8.2M5 8h8.2M5 11.8h8.2"/><circle cx="2.7" cy="4.2" r="0.7"/><circle cx="2.7" cy="8" r="0.7"/><circle cx="2.7" cy="11.8" r="0.7"/></svg>
          <span>Reservas</span>
        </a>
        <a class="nav-item" href="#logs" data-nav>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.2h5l3.4 3.2V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1z"/><path d="M9 2.4V5.4h3.2M5.2 8.2h5.6M5.2 10.8h4"/></svg>
          <span>Logs</span>
        </a>
      </nav>
    </aside>

    <main class="shell" id="topo">
      <header class="shell-head">
        <div class="account-bar">
          <span class="account-label">Conta</span>
          <select id="usuarioSelect" onchange="trocarUsuario()">
            <option value="aluno-1">aluno-1 (ALUNO)</option>
            <option value="doutorando-1">doutorando-1 (DOUTORANDO)</option>
            <option value="orientador-1">orientador-1 (ORIENTADOR)</option>
          </select>
        </div>
        <button class="btn-reset" onclick="resetarSistema()">Resetar</button>
        <div class="avatar" id="avatarLetra">A</div>
      </header>

      <div class="content">
        <section class="panel" id="recursos">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Recursos</h2>
              <p class="panel-sub">Quanto ainda dá para reservar entre o início e o fim escolhidos.</p>
            </div>
          </div>
          <div class="stats" id="cardsRecursos"></div>
        </section>

        <div class="main-grid">
          <section class="panel" id="reserva">
            <div class="panel-head">
              <div>
                <h2 class="panel-title">Nova Reserva</h2>
                <p class="panel-sub">Até 2 GPUs e 72 horas, a reserva é aprovada na hora. Acima disso, fica pendente para o orientador.</p>
              </div>
            </div>
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
              <label>Início da reserva</label>
              <input type="datetime-local" id="inicio" value="2026-11-20T08:00" onclick="this.showPicker && this.showPicker()" onchange="atualizarPainel()" />
            </div>
            <div class="field">
              <label>Fim da reserva</label>
              <input type="datetime-local" id="fim" value="2026-11-20T18:00" onclick="this.showPicker && this.showPicker()" onchange="atualizarPainel()" />
            </div>
            <button class="btn-primary" onclick="enviarReserva()">Reservar</button>
          </section>

          <div class="right-col">
            <section class="panel" id="quotas">
              <div class="panel-head">
                <div>
                  <h2 class="panel-title">Quotas (proj-ia)</h2>
                  <p class="panel-sub">GPU e servidor gastam horas no mês em que a reserva começa. Armazenamento conta o total simultâneo, em TB.</p>
                </div>
                <span class="section-meta">Responsável: orientador-1</span>
              </div>
              <div class="quota-cols">
                <span>#</span>
                <span>Tipo</span>
                <span>Uso</span>
                <span>Usado / limite</span>
              </div>
              <div id="painelQuotas"></div>
            </section>

            <section class="panel" id="reservas">
              <div class="panel-head">
                <div>
                  <h2 class="panel-title">Reservas</h2>
                  <p class="panel-sub">Aprovada já ocupa a agenda. Pendente espera o orientador.</p>
                </div>
                <span class="section-meta"><span id="contadorReservas"></span> da sua conta</span>
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
            </section>
          </div>
        </div>

        <section class="panel" id="logs">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">Logs</h2>
              <p class="panel-sub">E-mails enviados e o resultado de cada reserva.</p>
            </div>
            <button class="btn-quiet" onclick="limparLogs()">Limpar</button>
          </div>
          <div class="logs-box" id="listaLogs"></div>
        </section>
      </div>
    </main>
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

    const ICONES_RECURSO = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/></svg>',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
    ];

    function fraseDisponivel(tipo, livre, capacidade) {
      if (tipo === "STORAGE") {
        return \`\${livre} de \${capacidade} TB disponíveis nesse horário\`;
      }
      if (tipo === "SERVIDOR") {
        const nome = capacidade === 1 ? "servidor" : "servidores";
        const verbo = capacidade === 1 ? "disponível" : "disponíveis";
        return \`\${livre} de \${capacidade} \${nome} \${verbo} nesse horário\`;
      }
      const nome = capacidade === 1 ? "GPU" : "GPUs";
      const verbo = capacidade === 1 ? "disponível" : "disponíveis";
      return \`\${livre} de \${capacidade} \${nome} \${verbo} nesse horário\`;
    }

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

    function calcularUsado(q, referenciaIso) {
      const c = q.consumosRegistrados || [];
      if (q.modo === "ACUMULADA_MENSAL") {
        const ref = new Date(referenciaIso);
        const ano = ref.getUTCFullYear();
        const mes = ref.getUTCMonth();
        return c.reduce((total, x) => {
          const inicio = new Date(x.inicio);
          if (inicio.getUTCFullYear() !== ano || inicio.getUTCMonth() !== mes) {
            return total;
          }
          const horas = (new Date(x.fim).getTime() - inicio.getTime()) / 3600000;
          return total + x.quantidade * horas;
        }, 0);
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
      const avatar = document.getElementById("avatarLetra");
      if (avatar) avatar.textContent = u.slice(0, 1).toUpperCase();
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
        const acento = i % 4;
        const nota = livre > 0 ? "" : ' style="color:#EA1701"';
        const icone = ICONES_RECURSO[i % ICONES_RECURSO.length];
        return \`
          <article class="metric accent-\${acento}">
            <div class="metric-icon">\${icone}</div>
            <div class="metric-value">\${livre}<span class="metric-unit">livres</span></div>
            <div class="metric-label">\${r.id}</div>
            <div class="metric-note"\${nota}>\${fraseDisponivel(r.tipo, livre, r.capacidade)}</div>
          </article>
        \`;
      }).join("");

      const proj = projetos[0];
      if (proj) {
        document.getElementById("painelQuotas").innerHTML = Object.entries(proj.quotas).map(([tipo, q], i) => {
          const usado = Number(calcularUsado(q, ini).toFixed(1));
          const pct = Math.min(100, Math.round((usado / q.limite) * 100));
          const un = q.modo === "ACUMULADA_MENSAL" ? "h" : "TB";
          const ref = new Date(ini);
          const titulo = q.modo === "ACUMULADA_MENSAL"
            ? tipo + " " + String(ref.getUTCMonth() + 1).padStart(2, "0") + "/" + ref.getUTCFullYear()
            : tipo;
          return \`
            <div class="quota-row accent-\${i % 4}">
              <span class="quota-idx">\${String(i + 1).padStart(2, "0")}</span>
              <span class="quota-name">\${titulo}</span>
              <span class="quota-track"><span class="quota-fill" style="width:\${pct}%"></span></span>
              <span class="badge badge-accent">\${usado} / \${q.limite} \${un}</span>
            </div>
          \`;
        }).join("");
      }

      document.getElementById("contadorReservas").textContent = \`\${reservas.length}\`;
      document.getElementById("tabelaReservas").innerHTML = reservas.length === 0
        ? "<tr><td class='empty' colspan='5'>Sem reservas</td></tr>"
        : reservas.map(r => {
            const badge = r.estado === "APROVADA" ? "badge-mint" : "badge-gold";
            return \`<tr>
              <td><code>\${r.id.slice(0, 6)}</code></td>
              <td>\${r.recursoId}</td>
              <td>\${r.quantidade}</td>
              <td>\${paraBr(r.inicio)} → \${paraBr(r.fim)}</td>
              <td><span class="badge \${badge}">\${r.estado}</span></td>
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

    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        document.querySelectorAll("[data-nav]").forEach((n) => n.classList.remove("is-active"));
        el.classList.add("is-active");
      });
    });

    popularQuantidades();
    log("Pronto.");
    atualizarPainel();
  </script>
</body>
</html>`;
