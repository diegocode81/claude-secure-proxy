import { renderLayout } from './layout.js';

export function renderAgentBuilderView() {
  const content = `
    <header class="page-header">
      <div>
        <h1>Crear agentes</h1>
        <p>Preparar la futura creación gobernada de agentes QA desde la plataforma.</p>
      </div>
      <div class="status-pill pending">Estado: No habilitado</div>
    </header>

    <section class="module-grid">
      <div class="panel">
        <h2>Alcance actual</h2>
        <p>La creación de agentes desde UI todavía no está habilitada. Actualmente todos los agentes deben definirse por código, cumplir la gobernanza, tener contrato de entrada, contrato de salida, prompt oficial, skill documentado, checklist de readiness y registro explícito en <code>src/agents/registry.js</code>.</p>
      </div>

      <div class="panel">
        <h2>Placeholder visual</h2>
        <p>Este módulo existe únicamente como placeholder visual para la evolución futura de la plataforma. No crea, edita, activa ni elimina agentes.</p>
      </div>

      <div class="panel">
        <h2>Requisitos futuros</h2>
        <ul>
          <li>Schema formal de agente.</li>
          <li>Validación estricta.</li>
          <li>Control de permisos.</li>
          <li>Revisión humana.</li>
          <li>Versionamiento de prompts.</li>
          <li>Auditoría.</li>
          <li>Pruebas automáticas.</li>
          <li>Rollback.</li>
          <li>Separación entre draft, review, active, disabled.</li>
        </ul>
      </div>

      <div class="panel">
        <h2>Restricciones vigentes</h2>
        <ul>
          <li>No hay formulario funcional.</li>
          <li>No hay endpoint de creación.</li>
          <li>No hay persistencia de agentes dinámicos.</li>
          <li>No hay llamadas a Claude desde esta página.</li>
        </ul>
      </div>
    </section>
  `;

  return renderLayout({
    title: 'Claude Secure Proxy - Crear agentes',
    activePath: '/agent-builder',
    content
  });
}
