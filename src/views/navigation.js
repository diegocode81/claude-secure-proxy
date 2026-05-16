import { listPlatformNavigationItems } from '../agents/registry.js';

export function renderNavigation(activePath = '/dashboard') {
  const navItems = listPlatformNavigationItems();
  const links = navItems.map((item) => {
    const activeClass = item.href === activePath ? ' active' : '';
    const ariaCurrent = item.href === activePath ? ' aria-current="page"' : '';

    return `<a class="nav-link${activeClass}" href="${item.href}"${ariaCurrent}>${item.label}</a>`;
  }).join('');

  return `
    <nav class="top-nav" aria-label="Menú principal">
      <div class="brand">
        <div class="brand-title">QA AI Platform</div>
        <div class="brand-subtitle">Claude Secure Proxy</div>
      </div>
      <div class="nav-links">
        ${links}
      </div>
    </nav>
  `;
}
