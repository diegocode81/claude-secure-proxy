import { listPlatformNavigationItems } from '../agents/registry.js';

export function renderNavigation(activePath = '/dashboard') {
  const navItems = [
    ...listPlatformNavigationItems(),
    {
      label: 'Configuración',
      href: '/settings',
      order: 30,
      moduleId: 'settings',
      type: 'system'
    }
  ].sort((left, right) => left.order - right.order);
  const links = navItems.map((item) => {
    const activeClass = item.href === activePath ? ' active' : '';
    const ariaCurrent = item.href === activePath ? ' aria-current="page"' : '';

    return `<a class="nav-link${activeClass}" href="${item.href}"${ariaCurrent}>${item.label}</a>`;
  }).join('');

  return `
    <nav class="top-nav" aria-label="Menú principal">
      <div class="brand">
        <div class="brand-title">QA IA Platform</div>
        <div class="brand-subtitle">Claude Secure Proxy</div>
      </div>
      <div class="nav-links">
        ${links}
      </div>
    </nav>
  `;
}
