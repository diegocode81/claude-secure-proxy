function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getTrafficLight(usagePercent) {
  if (usagePercent > 85) {
    return {
      label: 'Rojo',
      className: 'danger',
      message: 'Mayor al 85% del presupuesto mensual.'
    };
  }

  if (usagePercent >= 60) {
    return {
      label: 'Amarillo',
      className: 'warning',
      message: 'Entre 60% y 85% del presupuesto mensual.'
    };
  }

  return {
    label: 'Verde',
    className: 'success',
    message: 'Menor al 60% del presupuesto mensual.'
  };
}

function getBudgetWarningPercent() {
  return Number(process.env.BUDGET_WARNING_PERCENT || 85);
}

function formatUsd(value) {
  return Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

export function renderDashboard(summary) {
  const trafficLight = getTrafficLight(summary.usagePercent);
  const safePercent = Math.min(Number(summary.usagePercent || 0), 100);
  const warningPercent = getBudgetWarningPercent();
  const warningUsd = Number(summary.budgetUsd || 0) * warningPercent / 100;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Claude Secure Proxy - Consumo</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Arial, Helvetica, sans-serif;
      background: #f4f6f8;
      color: #17202a;
    }

    body {
      margin: 0;
      min-height: 100vh;
    }

    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-end;
      border-bottom: 1px solid #d7dee7;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.2;
    }

    p {
      margin: 0;
      color: #52616f;
    }

    .month {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      background: #e8eef5;
      padding: 8px 12px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .summary {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(240px, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    .panel {
      background: #ffffff;
      border: 1px solid #dfe5ec;
      border-radius: 8px;
      padding: 20px;
    }

    .big-number {
      font-size: 34px;
      font-weight: 800;
      margin-top: 10px;
      color: #101828;
    }

    .progress {
      height: 14px;
      background: #e7edf3;
      border-radius: 999px;
      overflow: hidden;
      margin: 18px 0 10px;
    }

    .progress span {
      display: block;
      height: 100%;
      width: ${safePercent}%;
      background: #1f7a4d;
    }

    .progress span.warning {
      background: #b7791f;
    }

    .progress span.danger {
      background: #b42318;
    }

    .traffic {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      font-weight: 700;
    }

    .dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1f7a4d;
    }

    .dot.warning {
      background: #b7791f;
    }

    .dot.danger {
      background: #b42318;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(160px, 1fr));
      gap: 16px;
    }

    .metric-label {
      color: #52616f;
      font-size: 13px;
      line-height: 1.35;
    }

    .metric-value {
      margin-top: 8px;
      font-size: 24px;
      font-weight: 800;
      color: #101828;
    }

    .actions {
      margin-top: 20px;
      display: flex;
      gap: 12px;
      align-items: center;
    }

    button, a.button {
      appearance: none;
      border: 1px solid #1f4e79;
      background: #1f4e79;
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }

    button.secondary, a.secondary {
      background: #ffffff;
      color: #1f4e79;
    }

    @media (max-width: 760px) {
      header, .summary {
        grid-template-columns: 1fr;
        display: grid;
        align-items: start;
      }

      .metrics {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 520px) {
      .metrics {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Consumo Claude API</h1>
        <p>Dashboard local de presupuesto y uso estimado.</p>
      </div>
      <div class="month">Mes: ${escapeHtml(summary.month)}</div>
    </header>

    <section class="summary">
      <div class="panel">
        <div class="metric-label">Presupuesto mensual configurado</div>
        <div class="big-number">${formatUsd(summary.budgetUsd)}</div>
        <p>Alerta desde ${warningPercent}%: ${formatUsd(warningUsd)}</p>
      </div>
      <div class="panel">
        <div class="metric-label">Gasto estimado acumulado del mes</div>
        <div class="big-number">${formatUsd(summary.estimatedCostUsd)}</div>
        <div class="progress" aria-label="Porcentaje usado">
          <span class="${trafficLight.className}"></span>
        </div>
        <div>${summary.usagePercent}% usado</div>
        <div class="traffic">
          <span class="dot ${trafficLight.className}"></span>
          <span>Semáforo: ${trafficLight.label}</span>
        </div>
        <p>${trafficLight.message}</p>
      </div>
    </section>

    <section class="metrics">
      <div class="panel">
        <div class="metric-label">Tokens de entrada acumulados</div>
        <div class="metric-value">${formatNumber(summary.inputTokens)}</div>
      </div>
      <div class="panel">
        <div class="metric-label">Tokens de salida acumulados</div>
        <div class="metric-value">${formatNumber(summary.outputTokens)}</div>
      </div>
      <div class="panel">
        <div class="metric-label">Requests enviados a Claude</div>
        <div class="metric-value">${formatNumber(summary.totalRequests)}</div>
      </div>
      <div class="panel">
        <div class="metric-label">Requests bloqueados por seguridad</div>
        <div class="metric-value">${formatNumber(summary.blockedRequests)}</div>
      </div>
      <div class="panel">
        <div class="metric-label">Requests sanitizados</div>
        <div class="metric-value">${formatNumber(summary.sanitizedRequests)}</div>
      </div>
      <div class="panel">
        <div class="metric-label">Requests permitidos</div>
        <div class="metric-value">${formatNumber(summary.allowedRequests)}</div>
      </div>
      <div class="panel">
        <div class="metric-label">Costo entrada por 1M tokens</div>
        <div class="metric-value">$${escapeHtml(process.env.INPUT_COST_PER_1M_TOKENS || 3)}</div>
      </div>
      <div class="panel">
        <div class="metric-label">Costo salida por 1M tokens</div>
        <div class="metric-value">$${escapeHtml(process.env.OUTPUT_COST_PER_1M_TOKENS || 15)}</div>
      </div>
    </section>

    <div class="actions">
      <a class="button secondary" href="/usage">Ver JSON</a>
      <form method="post" action="/usage/reset">
        <button type="submit">Resetear consumo del mes</button>
      </form>
    </div>
  </main>
</body>
</html>`;
}
