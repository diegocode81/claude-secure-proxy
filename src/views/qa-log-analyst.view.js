import { renderLayout } from './layout.js';
import { qaLogAnalystProfile } from '../agents/qa-log-analyst/profile.js';

function renderTextList(items) {
  return items.map((item) => `<li>${item}</li>`).join('');
}

function renderCodeList(items) {
  return items.map((item) => `<li><code>${item}</code></li>`).join('');
}

export function renderQaLogAnalystView() {
  const profile = qaLogAnalystProfile;
  const content = `
    <header class="page-header">
      <div>
        <h1>${profile.name}</h1>
        <p>${profile.description}</p>
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
          <li>Revisar el análisis generado por Claude.</li>
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
    </section>
  `;

  return renderLayout({
    title: 'Claude Secure Proxy - QA Log Analyst',
    activePath: '/qa-log-analyst',
    content
  });
}
