import { escapeHtml } from '../layout.js';

export function renderLoadingIndicator({
  id,
  message = 'Trabajando...',
  detail = 'La plataforma está procesando la solicitud. Esto puede tardar unos segundos.'
} = {}) {
  return `
    <div id="${escapeHtml(id)}" class="loading-indicator hidden" role="status" aria-live="polite" aria-busy="false">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>
        <strong data-loading-message>${escapeHtml(message)}</strong>
        <span data-loading-detail>${escapeHtml(detail)}</span>
      </span>
    </div>
  `;
}
