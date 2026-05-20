import { renderNavigation } from './navigation.js';
import { getPlatformRefreshState } from '../platform/platform-refresh.service.js';

const BRAND_FAVICON_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path d="M32 5.5 52.2 17.1c2 1.1 3.2 3.2 3.2 5.5v18.8c0 2.3-1.2 4.4-3.2 5.5L32 58.5 11.8 46.9c-2-1.1-3.2-3.2-3.2-5.5V22.6c0-2.3 1.2-4.4 3.2-5.5L32 5.5Z" fill="#F8FAFC" stroke="#1F2937" stroke-width="3" stroke-linejoin="round"/>
  <path d="M20.4 32.7 28.1 40.4 43.9 23.6" fill="none" stroke="#2563EB" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M23.5 21.5H32l7.2 5.9M32 21.5v-6.7" fill="none" stroke="#0891B2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="23.5" cy="21.5" r="3.8" fill="#FFFFFF" stroke="#1F2937" stroke-width="2.5"/>
  <circle cx="32" cy="14.8" r="3.8" fill="#FFFFFF" stroke="#0891B2" stroke-width="2.5"/>
  <circle cx="39.2" cy="27.4" r="3.8" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.5"/>
</svg>
`);

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderRefreshNotice() {
  const refresh = getPlatformRefreshState();

  if (!refresh.refreshRequired) {
    return '';
  }

  const areas = Array.isArray(refresh.changedAreas) && refresh.changedAreas.length > 0
    ? `<p class="refresh-areas">Áreas: ${escapeHtml(refresh.changedAreas.join(', '))}</p>`
    : '';

  return `
  <section class="refresh-banner" id="platform-refresh-banner">
    <div>
      <h2>Actualización pendiente de aplicar</h2>
      <p>Se detectaron cambios recientes en la plataforma. Refresca manualmente el navegador para ver la información actualizada. Si los cambios no aparecen después de refrescar, reinicia manualmente el servidor local.</p>
      ${areas}
    </div>
    <button type="button" class="secondary" id="mark-refresh-read">Marcar como leído</button>
  </section>`;
}

export function renderLayout({ title, activePath, content }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${BRAND_FAVICON_SVG}">
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

    .top-nav {
      background: #ffffff;
      border-bottom: 1px solid #d7dee7;
      display: flex;
      justify-content: space-between;
      gap: 28px;
      align-items: center;
      padding: 14px 28px;
    }

    .brand {
      align-items: center;
      color: #111827;
      display: flex;
      gap: 14px;
      min-width: 300px;
    }

    .brand-icon {
      color: #1f2937;
      flex: 0 0 auto;
      height: 40px;
      width: 40px;
    }

    .brand-copy {
      display: grid;
      gap: 2px;
      min-width: 0;
    }

    .brand-title {
      color: #101828;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.2;
    }

    .brand-subtitle {
      color: #52616f;
      font-size: 12px;
      font-weight: 700;
      margin-top: 2px;
    }

    .nav-links {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      align-items: center;
    }

    .nav-link,
    .agent-menu summary,
    .settings-link {
      border: 1px solid transparent;
      border-radius: 6px;
      color: #334155;
      font-size: 14px;
      font-weight: 700;
      padding: 9px 11px;
      text-decoration: none;
    }

    .nav-link:hover,
    .agent-menu summary:hover,
    .settings-link:hover {
      background: #eef3f8;
      border-color: #d7dee7;
    }

    .nav-link.active,
    .agent-menu.active summary,
    .settings-link.active {
      background: #1f4e79;
      border-color: #1f4e79;
      color: #ffffff;
    }

    .agent-menu {
      position: relative;
    }

    .agent-menu summary {
      cursor: pointer;
      display: block;
      list-style: none;
    }

    .agent-menu summary::-webkit-details-marker {
      display: none;
    }

    .agent-menu summary::after {
      content: "▾";
      font-size: 11px;
      margin-left: 6px;
    }

    .agent-menu-panel {
      background: #ffffff;
      border: 1px solid #d7dee7;
      border-radius: 8px;
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
      display: grid;
      gap: 4px;
      min-width: 240px;
      padding: 8px;
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      z-index: 10;
    }

    .agent-menu-link {
      border-radius: 6px;
      color: #334155;
      font-size: 14px;
      font-weight: 700;
      padding: 9px 10px;
      text-decoration: none;
      white-space: nowrap;
    }

    .agent-menu-link:hover,
    .agent-menu-link.active {
      background: #eef3f8;
      color: #1f4e79;
    }

    .agent-menu-empty {
      color: #64748b;
      font-size: 13px;
      padding: 8px 10px;
    }

    .settings-link {
      align-items: center;
      display: inline-flex;
      font-size: 18px;
      height: 38px;
      justify-content: center;
      line-height: 1;
      padding: 0;
      width: 38px;
    }

    .refresh-banner {
      align-items: flex-start;
      background: #fff7ed;
      border-bottom: 1px solid #fed7aa;
      color: #7c2d12;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding: 14px 28px;
    }

    .refresh-banner h2 {
      color: #7c2d12;
      font-size: 16px;
      margin: 0 0 4px;
    }

    .refresh-banner p {
      color: #7c2d12;
      font-size: 13px;
    }

    .refresh-areas,
    .refresh-note {
      margin-top: 6px;
    }

    .refresh-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .refresh-badge {
      background: #ffffff;
      border: 1px solid #fdba74;
      border-radius: 999px;
      color: #7c2d12;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 8px;
    }

    .refresh-badge.warning {
      border-color: #f97316;
    }

    #mark-refresh-read {
      flex: 0 0 auto;
    }

    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: flex-end;
      border-bottom: 1px solid #d7dee7;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }

    .agent-header-controls {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 12px;
      align-items: center;
    }

    .agent-header-controls .actions {
      margin-top: 0;
      justify-content: flex-end;
    }

    .agent-header-controls .loading-indicator,
    .agent-header-controls .form-note {
      flex-basis: 100%;
      text-align: right;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.2;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      line-height: 1.3;
    }

    p {
      margin: 0;
      color: #52616f;
      line-height: 1.5;
    }

    ul {
      margin: 0;
      padding-left: 20px;
      color: #334155;
      line-height: 1.6;
    }

    code {
      background: #eef3f8;
      border: 1px solid #d7dee7;
      border-radius: 4px;
      color: #1f4e79;
      padding: 2px 5px;
    }

    label {
      color: #334155;
      display: block;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    input,
    select,
    textarea {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-sizing: border-box;
      color: #17202a;
      font: inherit;
      padding: 10px 12px;
      width: 100%;
    }

    textarea {
      min-height: 160px;
      resize: vertical;
    }

    .month,
    .status-pill {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      background: #e8eef5;
      padding: 8px 12px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .status-pill.active {
      background: #e7f6ee;
      color: #17623d;
    }

    .status-pill.pending {
      background: #fff4dd;
      color: #8a570d;
    }

    .summary {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(240px, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    .agent-detail-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 18px;
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

    .metrics,
    .module-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(160px, 1fr));
      gap: 16px;
    }

    .module-grid {
      grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr);
      align-items: start;
    }

    .metric-label,
    .form-note {
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
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .hidden {
      display: none !important;
    }

    .loading-inline {
      align-items: center;
      color: #52616f;
      display: none;
      font-size: 13px;
      font-weight: 700;
      gap: 8px;
      margin-top: 10px;
    }

    .loading-inline.active {
      display: inline-flex;
    }

    .spinner {
      animation: spin 0.8s linear infinite;
      border: 2px solid #d7dee7;
      border-top-color: #1f4e79;
      border-radius: 999px;
      height: 16px;
      width: 16px;
    }

    .loading-indicator {
      align-items: center;
      background: #f8fafc;
      border: 1px solid #d7dee7;
      border-radius: 8px;
      color: #334155;
      display: flex;
      gap: 12px;
      margin-top: 16px;
      padding: 14px 16px;
    }

    .loading-indicator strong {
      color: #101828;
      display: block;
      font-size: 14px;
      line-height: 1.35;
    }

    .loading-indicator span[data-loading-detail] {
      color: #52616f;
      display: block;
      font-size: 13px;
      line-height: 1.4;
      margin-top: 2px;
    }

    .loading-spinner {
      animation: spin 0.8s linear infinite;
      border: 3px solid #d7dee7;
      border-top-color: #1f4e79;
      border-radius: 999px;
      flex: 0 0 auto;
      height: 22px;
      width: 22px;
    }

    .is-loading {
      cursor: progress;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .field {
      margin-top: 16px;
    }

    button,
    a.button {
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

    button.secondary,
    a.secondary {
      background: #ffffff;
      color: #1f4e79;
    }

    button.danger,
    a.danger {
      background: #b42318;
      border-color: #b42318;
      color: #ffffff;
    }

    button:disabled {
      background: #e2e8f0;
      border-color: #cbd5e1;
      color: #64748b;
      cursor: not-allowed;
    }

    .modal-backdrop {
      align-items: center;
      background: rgba(15, 23, 42, 0.52);
      bottom: 0;
      display: none;
      justify-content: center;
      left: 0;
      padding: 20px;
      position: fixed;
      right: 0;
      top: 0;
      z-index: 40;
    }

    .modal-backdrop.open {
      display: flex;
    }

    .modal {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 24px 56px rgba(15, 23, 42, 0.24);
      max-width: 520px;
      padding: 22px;
      width: 100%;
    }

    .agent-document-result {
      border-top: 1px solid #dfe5ec;
      margin-top: 20px;
      padding-top: 18px;
    }

    .agent-result-box {
      background: #f8fafc;
      border: 1px solid #dfe5ec;
      border-radius: 8px;
      color: #101828;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      line-height: 1.55;
      margin-top: 12px;
      max-height: 520px;
      overflow-x: auto;
      overflow-y: auto;
      padding: 16px;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .technical-result {
      margin-top: 16px;
    }

    .technical-result pre {
      overflow: auto;
      white-space: pre-wrap;
    }

    @media (max-width: 760px) {
      .top-nav,
      .page-header,
      .agent-detail-grid,
      .summary {
        display: grid;
        grid-template-columns: 1fr;
        align-items: start;
      }

      .agent-header-controls,
      .agent-header-controls .actions {
        justify-content: flex-start;
      }

      .agent-header-controls .loading-indicator,
      .agent-header-controls .form-note {
        text-align: left;
      }

      .nav-links {
        justify-content: flex-start;
      }

      .refresh-banner {
        display: grid;
        padding: 14px 20px;
      }

      .brand {
        min-width: 0;
      }

      .agent-menu-panel {
        left: 0;
        right: auto;
      }

      .metrics,
      .module-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 520px) {
      .metrics,
      .module-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  ${renderNavigation(activePath)}
  ${renderRefreshNotice()}
  <main>
    ${content}
  </main>
  <script>
    (() => {
      window.QAIAPlatform = window.QAIAPlatform || {};

      window.QAIAPlatform.showLoading = function showLoading(id, message, detail) {
        const loader = document.getElementById(id);
        if (!loader) return;
        const messageNode = loader.querySelector('[data-loading-message]');
        const detailNode = loader.querySelector('[data-loading-detail]');
        if (messageNode && message) messageNode.textContent = message;
        if (detailNode && detail) detailNode.textContent = detail;
        loader.classList.remove('hidden');
        loader.setAttribute('aria-busy', 'true');
        document.body.classList.add('is-loading');
      };

      window.QAIAPlatform.hideLoading = function hideLoading(id) {
        const loader = document.getElementById(id);
        if (!loader) return;
        loader.classList.add('hidden');
        loader.setAttribute('aria-busy', 'false');
        document.body.classList.remove('is-loading');
      };

      window.QAIAPlatform.setButtonLoading = function setButtonLoading(button, isLoading, loadingText = 'Procesando...') {
        if (!button) return;
        if (isLoading) {
          if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
          }
          button.disabled = true;
          button.textContent = loadingText;
          button.setAttribute('aria-busy', 'true');
          return;
        }

        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
        button.removeAttribute('aria-busy');
        delete button.dataset.originalText;
      };

      const markReadButton = document.getElementById('mark-refresh-read');
      const banner = document.getElementById('platform-refresh-banner');

      markReadButton?.addEventListener('click', async () => {
        markReadButton.disabled = true;
        try {
          const response = await fetch('/platform/refresh-state/clear', { method: 'POST' });
          if (!response.ok) {
            throw new Error('No se pudo marcar el aviso como leído.');
          }
          banner?.remove();
        } catch {
          markReadButton.disabled = false;
        }
      });
    })();
  </script>
</body>
</html>`;
}
