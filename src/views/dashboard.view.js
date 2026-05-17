import { escapeHtml, renderLayout } from './layout.js';

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

export function renderDashboardView(summary) {
  const trafficLight = getTrafficLight(summary.usagePercent);
  const safePercent = Math.min(Number(summary.usagePercent || 0), 100);
  const warningUsd = Number(summary.alertThresholdUsd || 0);
  const content = `
    <header class="page-header">
      <div>
        <h1>Consumo de Tokens APIs</h1>
        <p>Centro de control operativo para presupuesto, tokens y uso estimado.</p>
      </div>
      <div class="month">Mes: ${escapeHtml(summary.month)}</div>
    </header>

    <section class="summary">
      <div class="panel">
        <div class="metric-label">Presupuesto mensual configurado</div>
        <div class="big-number">${formatUsd(summary.budgetUsd)}</div>
        <p>Alerta desde: ${formatUsd(warningUsd)}</p>
      </div>
      <div class="panel">
        <div class="metric-label">Gasto estimado acumulado del mes</div>
        <div class="big-number">${formatUsd(summary.estimatedCostUsd)}</div>
        <div class="progress" aria-label="Porcentaje usado">
          <span class="${trafficLight.className}" style="width: ${safePercent}%"></span>
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
        <div class="metric-label">Requests enviados a APIs</div>
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
      <form method="post" action="/usage/reset">
        <button type="submit">Resetear consumo del mes</button>
      </form>
    </div>
  `;

  return renderLayout({
    title: 'Claude Secure Proxy - Dashboard',
    activePath: '/dashboard',
    content
  });
}
