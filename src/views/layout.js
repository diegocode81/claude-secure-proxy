import { renderNavigation } from './navigation.js';

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderLayout({ title, activePath, content }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
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
      gap: 20px;
      align-items: center;
      padding: 14px 24px;
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
    }

    .nav-link {
      border: 1px solid transparent;
      border-radius: 6px;
      color: #334155;
      font-size: 14px;
      font-weight: 700;
      padding: 9px 11px;
      text-decoration: none;
    }

    .nav-link:hover {
      background: #eef3f8;
      border-color: #d7dee7;
    }

    .nav-link.active {
      background: #1f4e79;
      border-color: #1f4e79;
      color: #ffffff;
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

    button:disabled {
      background: #e2e8f0;
      border-color: #cbd5e1;
      color: #64748b;
      cursor: not-allowed;
    }

    @media (max-width: 760px) {
      .top-nav,
      .page-header,
      .summary {
        display: grid;
        grid-template-columns: 1fr;
        align-items: start;
      }

      .nav-links {
        justify-content: flex-start;
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
  <main>
    ${content}
  </main>
</body>
</html>`;
}
