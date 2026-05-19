import { listAgentNavigationItems } from '../agents/registry.js';
import { renderBrandIcon } from './brand-icon.view.js';

export function renderNavigation(activePath = '/dashboard') {
  const normalizedPath = activePath === '/' ? '/dashboard' : activePath;
  const agentItems = listAgentNavigationItems()
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.label.localeCompare(right.label);
    });
  const agentActive = agentItems.some((item) => item.href === normalizedPath);
  function renderMainLink(item) {
    const activeClass = item.href === normalizedPath ? ' active' : '';
    const ariaCurrent = item.href === normalizedPath ? ' aria-current="page"' : '';

    return `<a class="nav-link${activeClass}" href="${item.href}"${ariaCurrent}>${item.label}</a>`;
  }

  const dashboardLink = renderMainLink({ label: 'Dashboard', href: '/dashboard' });
  const modulesLink = renderMainLink({ label: 'Módulos', href: '/modules' });
  const builderLink = renderMainLink({ label: 'Crear agente', href: '/agent-builder' });
  const agentLinks = agentItems.map((item) => {
    const activeClass = item.href === normalizedPath ? ' active' : '';
    const ariaCurrent = item.href === normalizedPath ? ' aria-current="page"' : '';

    return `<a class="agent-menu-link${activeClass}" href="${item.href}"${ariaCurrent}>${item.label}</a>`;
  }).join('');
  const settingsActiveClass = normalizedPath === '/settings' ? ' active' : '';

  return `
    <nav class="top-nav" aria-label="Menú principal">
      <div class="brand">
        ${renderBrandIcon({ size: 40 })}
        <div class="brand-copy">
          <div class="brand-title">QA IA Platform</div>
          <div class="brand-subtitle">Orquesta agentes QA especializados para apoyar procesos de calidad de software</div>
        </div>
      </div>
      <div class="nav-links">
        ${dashboardLink}
        ${modulesLink}
        <details class="agent-menu${agentActive ? ' active' : ''}">
          <summary>Agentes QA</summary>
          <div class="agent-menu-panel">
            ${agentLinks || '<span class="agent-menu-empty">Sin agentes registrados</span>'}
          </div>
        </details>
        ${builderLink}
        <a class="settings-link${settingsActiveClass}" href="/settings" title="Configuración" aria-label="Configuración">⚙</a>
      </div>
    </nav>
  `;
}
