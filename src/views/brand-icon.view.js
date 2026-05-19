import { escapeHtml } from './layout.js';

export function renderBrandIcon({ className = 'brand-icon', size = 40 } = {}) {
  const safeSize = Number.isFinite(Number(size)) ? Number(size) : 40;

  return `
    <svg
      class="${escapeHtml(className)}"
      width="${safeSize}"
      height="${safeSize}"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="QA IA Platform logo"
    >
      <path
        d="M32 5.5L52.2 17.1C54.2 18.2 55.4 20.3 55.4 22.6V41.4C55.4 43.7 54.2 45.8 52.2 46.9L32 58.5L11.8 46.9C9.8 45.8 8.6 43.7 8.6 41.4V22.6C8.6 20.3 9.8 18.2 11.8 17.1L32 5.5Z"
        fill="#F8FAFC"
        stroke="currentColor"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M20.4 32.7L28.1 40.4L43.9 23.6"
        stroke="#2563EB"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M23.5 21.5H32L39.2 27.4"
        stroke="#1F2937"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.88"
      />
      <path
        d="M32 21.5V14.8"
        stroke="#0891B2"
        stroke-width="3"
        stroke-linecap="round"
      />
      <circle cx="23.5" cy="21.5" r="3.8" fill="#FFFFFF" stroke="#1F2937" stroke-width="2.5" />
      <circle cx="32" cy="14.8" r="3.8" fill="#FFFFFF" stroke="#0891B2" stroke-width="2.5" />
      <circle cx="39.2" cy="27.4" r="3.8" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.5" />
      <path
        d="M18.2 46.8C23.6 50.3 28.1 51.9 32 51.9C35.9 51.9 40.4 50.3 45.8 46.8"
        stroke="#CBD5E1"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  `;
}
