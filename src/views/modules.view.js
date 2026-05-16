import { listModuleCatalogItems } from '../agents/registry.js';
import { escapeHtml, renderLayout } from './layout.js';

function renderList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<li>${escapeHtml(emptyText)}</li>`;
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function getStatusClass(status) {
  if (status === 'active') {
    return 'active';
  }

  return 'pending';
}

function getTypeLabel(module) {
  if (module.type === 'agent') {
    return 'Agente registrado';
  }

  if (module.type === 'visual-placeholder') {
    return 'Placeholder visual';
  }

  return 'Módulo de plataforma';
}

function renderPlaceholderNote(module) {
  if (module.type !== 'visual-placeholder') {
    return '';
  }

  return `
      <div class="field">
        <div class="metric-label">Nota</div>
        <p>No es un agente registrado. No crea agentes todavía.</p>
      </div>
  `;
}

function renderModuleCard(module) {
  const typeLabel = getTypeLabel(module);

  return `
    <article class="panel">
      <div class="actions">
        <span class="status-pill ${getStatusClass(module.status)}">${escapeHtml(module.statusLabel)}</span>
        <span class="metric-label">${escapeHtml(typeLabel)}</span>
      </div>
      <h2>${escapeHtml(module.name)}</h2>
      <p>${escapeHtml(module.description)}</p>
      <div class="field">
        <div class="metric-label">Ruta visual</div>
        <a href="${escapeHtml(module.path)}"><code>${escapeHtml(module.path)}</code></a>
      </div>
      ${renderPlaceholderNote(module)}
      <div class="field">
        <div class="metric-label">Capacidades principales</div>
        <ul>
          ${renderList(module.capabilities, 'Capacidades no definidas')}
        </ul>
      </div>
      <div class="field">
        <div class="metric-label">Reglas básicas de gobierno</div>
        <ul>
          ${renderList(module.governance, 'Reglas de gobierno no definidas')}
        </ul>
      </div>
    </article>
  `;
}

export function renderModulesView() {
  const modules = listModuleCatalogItems();
  const activeAgents = modules.filter((module) => module.type === 'agent').length;
  const platformModules = modules.filter((module) => module.type !== 'agent').length;
  const content = `
    <header class="page-header">
      <div>
        <h1>Módulos QA</h1>
        <p>Catálogo central para gobernar agentes activos y capacidades visuales de la plataforma.</p>
      </div>
      <div class="status-pill active">${activeAgents} agente(s) activo(s) · ${platformModules} placeholder(s)</div>
    </header>

    <section class="summary">
      <div class="panel">
        <div class="metric-label">Agentes activos registrados</div>
        <div class="big-number">${activeAgents}</div>
        <p>Agentes con perfil formal en <code>agentRegistry</code>.</p>
      </div>
      <div class="panel">
        <div class="metric-label">Plataforma</div>
        <div class="big-number">${platformModules}</div>
        <p>Capacidades visuales que todavía no son agentes registrados ni funcionalidad activa.</p>
      </div>
    </section>

    <section class="panel">
      <h2>Gestión futura de agentes</h2>
      <p>Esta página actúa como catálogo de gobierno. La creación o configuración de agentes desde UI está fuera del alcance actual.</p>
      <div class="field">
        <div class="metric-label">Regla actual</div>
        <p>Todos los agentes deben definirse por código, mantener documentación formal y registrarse explícitamente en <code>src/agents/registry.js</code>.</p>
      </div>
      <div class="field">
        <div class="metric-label">Antes de habilitar creación desde UI se requerirá</div>
        <ul>
          <li>Schema formal de agente y validación estricta de perfil, entrada y salida.</li>
          <li>Control de permisos, revisión humana, auditoría, versionamiento de prompts y rollback.</li>
          <li>Reglas que impidan llamadas a Claude sin sanitización o control de presupuesto.</li>
          <li>Estados de publicación: draft, review, active, disabled.</li>
        </ul>
      </div>
    </section>

    <section class="module-grid">
      ${modules.map(renderModuleCard).join('')}
    </section>
  `;

  return renderLayout({
    title: 'Claude Secure Proxy - Módulos QA',
    activePath: '/modules',
    content
  });
}
