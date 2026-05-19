import { renderLayout } from './layout.js';
import { qaLogAnalystProfile } from '../agents/qa-log-analyst/profile.js';

function renderTextList(items) {
  return items.map((item) => `<li>${String(item).replaceAll('Claude', 'LLM')}</li>`).join('');
}

function renderCodeList(items) {
  return items.map((item) => `<li><code>${item}</code></li>`).join('');
}

function renderLlmSettings(profile) {
  const settings = profile.llmSettings || {};
  const budgetPolicy = settings.budgetPolicy || {};

  return `
    <div class="panel">
      <h2>Configuración de respuesta LLM</h2>
      <p class="form-note">Esta configuración controla el tamaño y comportamiento de las respuestas del LLM para este agente.</p>
      <ul>
        <li>Nivel de detalle: <code>${settings.responseDetailLevel || 'standard'}</code></li>
        <li>Máximo tokens respuesta: <code>${Number(settings.maxOutputTokens || 1500)}</code></li>
        <li>Temperatura: <code>${Number(settings.temperature ?? 0.2)}</code></li>
        <li>Presupuesto mensual aplicado: <code>${budgetPolicy.enforceMonthlyBudget === false ? 'no' : 'sí'}</code></li>
        <li>Bloqueo si excede presupuesto: <code>${budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget === false ? 'no' : 'sí'}</code></li>
      </ul>
    </div>
  `;
}

export function renderQaLogAnalystView() {
  const profile = qaLogAnalystProfile;
  const content = `
    <header class="page-header">
      <div>
        <h1>${profile.name}</h1>
        <p>${profile.description.replaceAll('Claude', 'LLM')}</p>
      </div>
      <div class="actions">
        <a class="button" href="${profile.download.path}">${profile.download.label}</a>
        <div class="status-pill ${profile.status}">Estado: ${profile.statusLabel}</div>
      </div>
    </header>

    <section class="module-grid">
      <div class="panel">
        <h2>Uso actual</h2>
        <p>${profile.usage}</p>
      </div>

      <div class="panel">
        <h2>Extensión VS Code</h2>
        <p>QA Log Analyst puede usarse desde Visual Studio Code mediante la extensión existente. Desde esta sección puedes acceder al módulo de gestión de la extensión.</p>
        <div class="actions">
          <a class="button secondary" href="/qa-log-analyst/extension">Gestionar extensión</a>
        </div>
      </div>

      <div class="panel">
        <h2>Endpoints relacionados</h2>
        <ul>
          ${renderCodeList(profile.relatedEndpoints)}
        </ul>
      </div>

      <div class="panel">
        <h2>Cómo usarlo</h2>
        <ul>
          <li>Instalar la extensión VS Code desde el archivo <code>.vsix</code>.</li>
          <li>Abrir un proyecto en VS Code.</li>
          <li>Seleccionar un error, log o stacktrace.</li>
          <li>Ejecutar el comando del QA Log Analyst desde VS Code.</li>
          <li>Revisar el análisis generado por el LLM configurado.</li>
        </ul>
      </div>

      <div class="panel">
        <h2>Skill del agente</h2>
        <ul>
          ${renderTextList(profile.capabilities)}
        </ul>
      </div>

      <div class="panel">
        <h2>Contrato de salida esperado</h2>
        <ul>
          ${renderTextList(profile.outputContract)}
        </ul>
      </div>

      <div class="panel">
        <h2>Responsabilidad del módulo</h2>
        <ul>
          ${renderTextList(profile.capabilities)}
        </ul>
      </div>

      <div class="panel">
        <h2>Gobierno de IA</h2>
        <ul>
          ${renderTextList(profile.governance)}
        </ul>
      </div>

      ${renderLlmSettings(profile)}
    </section>
  `;

  return renderLayout({
    title: 'QA IA Platform - QA Log Analyst',
    activePath: '/qa-log-analyst',
    content
  });
}
