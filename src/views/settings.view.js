import { renderLayout } from './layout.js';
import { renderLoadingIndicator } from './shared/loading.view.js';

export function renderSettingsView() {
  const content = `
    <header class="page-header">
      <div>
        <h1>Configuración de plataforma</h1>
        <p>Administra parámetros base de presupuesto y LLM sin modificar agentes ni endpoints productivos.</p>
      </div>
      <div class="status-pill pending">Gobernado</div>
    </header>

    <section class="module-grid">
      <div class="panel">
        <h2>Dashboard</h2>
        <p class="form-note">El presupuesto mensual se usa para controlar el consumo estimado de tokens y costos de la plataforma.</p>
        <form id="dashboard-settings-form">
          <div class="field">
            <label for="monthlyBudgetUsd">Presupuesto mensual USD</label>
            <input id="monthlyBudgetUsd" name="monthlyBudgetUsd" type="number" min="0.01" max="100000" step="0.01" required>
          </div>
          <div class="field">
            <label for="alertThresholdUsd">Valor mensual de alerta USD</label>
            <input id="alertThresholdUsd" name="alertThresholdUsd" type="number" min="0.01" max="100000" step="0.01" required>
            <p class="form-note">La alerta se activa cuando el gasto estimado alcanza este valor mensual.</p>
          </div>
          <div class="actions">
            <button type="submit">Guardar configuración de dashboard</button>
          </div>
          ${renderLoadingIndicator({
            id: 'dashboard-settings-loading',
            message: 'Guardando configuración...',
            detail: 'La plataforma está guardando la configuración del dashboard. Esto puede tardar unos segundos.'
          })}
          <p class="form-note" id="dashboard-settings-message" role="status"></p>
        </form>
      </div>

      <div class="panel">
        <h2>LLM</h2>
        <p class="form-note">El LLM configurado representa el cerebro de la plataforma. Esta configuración prepara soporte multi-proveedor, pero no cambia todavía la lógica real de llamadas existentes.</p>
        <form id="llm-settings-form">
          <div class="field">
            <label for="provider">Proveedor LLM</label>
            <select id="provider" name="provider" required>
              <option value="claude">claude</option>
              <option value="gemini">gemini</option>
              <option value="deepseek">deepseek</option>
              <option value="openai">openai</option>
              <option value="other">other</option>
            </select>
          </div>
          <div class="field">
            <label for="displayName">Nombre visible del LLM</label>
            <input id="displayName" name="displayName" type="text" minlength="2" maxlength="80" required>
          </div>
          <div class="field">
            <label for="apiKey">API key</label>
            <input id="apiKey" name="apiKey" type="password" autocomplete="off" maxlength="500" placeholder="Ingresa una nueva API key solo si quieres reemplazarla">
            <p class="form-note">Estado de API key: <span id="apiKeyStatus">No configurada</span></p>
            <p class="form-note">API key actual: <span id="apiKeyPreview">No configurada</span></p>
            <p class="form-note">Fuente actual de API key: <span id="apiKeySource">not-configured</span></p>
            <p class="form-note" id="apiKeySourceHelp">No hay API key válida configurada. Las funciones que llamen al LLM no podrán ejecutarse.</p>
            <p class="form-note">No compartas ni pegues API keys reales en ambientes no seguros. La API key no se muestra completa después de guardarse.</p>
          </div>
          <div class="actions">
            <button type="submit">Guardar configuración LLM</button>
          </div>
          ${renderLoadingIndicator({
            id: 'llm-settings-loading',
            message: 'Guardando configuración...',
            detail: 'La plataforma está guardando la configuración LLM. Esto puede tardar unos segundos.'
          })}
          <p class="form-note" id="llm-settings-message" role="status"></p>
        </form>
      </div>

      <div class="panel">
        <h2>Proxy</h2>
        <p class="form-note">El proxy centraliza las solicitudes hacia el LLM, aplica sanitización, bloqueo de secretos y control de presupuesto antes de permitir cualquier ejecución de IA.</p>
        <form id="proxy-settings-form">
          <div class="field">
            <label for="publicBaseUrl">URL pública del proxy</label>
            <input id="publicBaseUrl" name="publicBaseUrl" type="url" maxlength="300" required>
            <p class="form-note">URL donde los clientes, extensiones o usuarios acceden a la plataforma. Cambia este valor cuando la plataforma se publique en un dominio.</p>
            <p class="form-note">Ejemplos: <code>http://localhost:3000</code>, <code>https://qa-platform.miempresa.com</code></p>
          </div>

          <div class="field">
            <label for="port">Puerto del servidor</label>
            <input id="port" name="port" type="number" min="1" max="65535" step="1" required>
            <p class="form-note">Puerto donde corre el proxy localmente. Normalmente es 3000 en desarrollo.</p>
          </div>

          <div class="field">
            <label for="allowedOrigins">Orígenes permitidos</label>
            <textarea id="allowedOrigins" name="allowedOrigins" required></textarea>
            <p class="form-note">Lista de dominios autorizados para consumir el proxy desde navegador o frontend. Usa una URL por línea o separada por coma.</p>
            <p class="form-note">Ejemplos: <code>http://localhost:3000</code>, <code>https://qa-platform.miempresa.com</code></p>
          </div>

          <div class="field">
            <label for="maxRequestBodyKb">Tamaño máximo de request KB</label>
            <input id="maxRequestBodyKb" name="maxRequestBodyKb" type="number" min="1" max="10240" step="1" required>
            <p class="form-note">Límite máximo del cuerpo de una solicitud enviada al proxy. Ayuda a evitar payloads demasiado grandes.</p>
          </div>

          <div class="field">
            <label for="maxContextChars">Máximo de caracteres de contexto</label>
            <input id="maxContextChars" name="maxContextChars" type="number" min="1000" max="500000" step="1" required>
            <p class="form-note">Límite de caracteres de contexto técnico que puede procesar la plataforma. Ayuda a controlar costo, ruido y tamaño enviado al LLM.</p>
          </div>

          <div class="summary">
            <div class="panel">
              <div class="metric-label">Sanitización</div>
              <div class="metric-value" id="sanitizeEnabled">Activa</div>
              <p class="form-note">La sanitización limpia o bloquea contenido sensible antes de que una solicitud pueda llegar al LLM. No se puede desactivar desde UI.</p>
            </div>
            <div class="panel">
              <div class="metric-label">Bloqueo de secretos</div>
              <div class="metric-value" id="secretBlockingEnabled">Activo</div>
              <p class="form-note">Bloquea passwords, tokens, API keys, credenciales y secretos detectados. No se puede desactivar desde UI.</p>
            </div>
            <div class="panel">
              <div class="metric-label">Control de presupuesto</div>
              <div class="metric-value" id="budgetGuardEnabled">Activo</div>
              <p class="form-note">Evita ejecuciones sin control de uso, tokens o presupuesto. No se puede desactivar desde UI.</p>
            </div>
          </div>

          <div class="field">
            <div class="metric-label">Endpoints protegidos</div>
            <ul id="protectedEndpoints"></ul>
            <p class="form-note">Rutas que deben pasar por validaciones de seguridad, sanitización o control de ejecución.</p>
          </div>

          <div class="field">
            <div class="metric-label">Tipos de hallazgos bloqueados</div>
            <ul id="blockedFindingTypes"></ul>
            <p class="form-note">Tipos de contenido sensible que el proxy puede detectar o bloquear.</p>
          </div>

          <div class="field">
            <p class="form-note">Algunos cambios, como puerto o URL pública, pueden requerir reiniciar o redeplegar la plataforma para tomar efecto fuera de esta pantalla.</p>
          </div>

          <div class="actions">
            <button type="submit">Guardar configuración de proxy</button>
          </div>
          ${renderLoadingIndicator({
            id: 'proxy-settings-loading',
            message: 'Guardando configuración...',
            detail: 'La plataforma está guardando la configuración de proxy. Esto puede tardar unos segundos.'
          })}
          <p class="form-note" id="proxy-settings-message" role="status"></p>
        </form>
      </div>
    </section>

    <script>
      const configUrl = '/settings/config';
      const dashboardUrl = '/settings/dashboard';
      const llmUrl = '/settings/llm';
      const proxyUrl = '/settings/proxy';

      const dashboardMessage = document.getElementById('dashboard-settings-message');
      const llmMessage = document.getElementById('llm-settings-message');
      const proxyMessage = document.getElementById('proxy-settings-message');
      function getLoadingApi() { return window.QAIAPlatform || {}; }

      function setMessage(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? '#b42318' : '#17623d';
      }

      function renderList(id, items) {
        const node = document.getElementById(id);
        node.innerHTML = '';
        for (const item of items || []) {
          const li = document.createElement('li');
          li.textContent = item;
          node.appendChild(li);
        }
      }

      function parseOrigins(value) {
        return value
          .split(/\\n|,/)
          .map((item) => item.trim())
          .filter(Boolean);
      }

      async function loadSettings() {
        const response = await fetch(configUrl);
        const config = await response.json();
        const proxy = config.proxy || {};

        document.getElementById('monthlyBudgetUsd').value = config.dashboard.monthlyBudgetUsd;
        document.getElementById('alertThresholdUsd').value = config.dashboard.alertThresholdUsd;
        document.getElementById('provider').value = config.llm.provider;
        document.getElementById('displayName').value = config.llm.displayName;
        document.getElementById('apiKey').value = '';
        document.getElementById('apiKeyStatus').textContent = config.llm.apiKeyConfigured
          ? 'Configurada'
          : 'No configurada';
        document.getElementById('apiKeyPreview').textContent = config.llm.apiKeyConfigured
          ? config.llm.apiKeyPreview
          : 'No configurada';
        document.getElementById('apiKeySource').textContent = config.llm.apiKeySource || 'not-configured';
        const sourceHelp = {
          settings: 'La plataforma usará la API key guardada en configuración local.',
          env: 'La plataforma usará la API key definida en variables de entorno porque no hay una key válida guardada en configuración.',
          'not-configured': 'No hay API key válida configurada. Las funciones que llamen al LLM no podrán ejecutarse.'
        };
        document.getElementById('apiKeySourceHelp').textContent = sourceHelp[config.llm.apiKeySource] || sourceHelp['not-configured'];
        document.getElementById('publicBaseUrl').value = proxy.publicBaseUrl || '';
        document.getElementById('port').value = proxy.port || 3000;
        document.getElementById('allowedOrigins').value = (proxy.allowedOrigins || []).join('\\n');
        document.getElementById('maxRequestBodyKb').value = proxy.maxRequestBodyKb || 512;
        document.getElementById('maxContextChars').value = proxy.maxContextChars || 60000;
        document.getElementById('sanitizeEnabled').textContent = proxy.sanitizeEnabled ? 'Activa' : 'Inactiva';
        document.getElementById('secretBlockingEnabled').textContent = proxy.secretBlockingEnabled ? 'Activo' : 'Inactivo';
        document.getElementById('budgetGuardEnabled').textContent = proxy.budgetGuardEnabled ? 'Activo' : 'Inactivo';
        renderList('protectedEndpoints', proxy.protectedEndpoints);
        renderList('blockedFindingTypes', proxy.blockedFindingTypes);
      }

      document.getElementById('dashboard-settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button[type="submit"]');
        const payload = {
          monthlyBudgetUsd: Number(document.getElementById('monthlyBudgetUsd').value),
          alertThresholdUsd: Number(document.getElementById('alertThresholdUsd').value)
        };

        getLoadingApi().setButtonLoading?.(button, true, 'Guardando...');
        getLoadingApi().showLoading?.('dashboard-settings-loading', 'Guardando configuración...', 'La plataforma está guardando la configuración del dashboard. Esto puede tardar unos segundos.');
        try {
          const response = await fetch(dashboardUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();

          if (!response.ok) {
            setMessage(dashboardMessage, result.errors?.join(' ') || 'No se pudo guardar la configuración.', true);
            return;
          }

          setMessage(dashboardMessage, 'Configuración de dashboard guardada.' + (result.refresh?.message ? ' ' + result.refresh.message : ''));
          await loadSettings();
        } finally {
          getLoadingApi().hideLoading?.('dashboard-settings-loading');
          getLoadingApi().setButtonLoading?.(button, false);
        }
      });

      document.getElementById('llm-settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button[type="submit"]');
        const apiKey = document.getElementById('apiKey').value;
        const payload = {
          provider: document.getElementById('provider').value,
          displayName: document.getElementById('displayName').value,
          apiKey
        };

        getLoadingApi().setButtonLoading?.(button, true, 'Guardando...');
        getLoadingApi().showLoading?.('llm-settings-loading', 'Guardando configuración...', 'La plataforma está guardando la configuración LLM. Esto puede tardar unos segundos.');
        try {
          const response = await fetch(llmUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();

          if (!response.ok) {
            setMessage(llmMessage, result.errors?.join(' ') || 'No se pudo guardar la configuración LLM.', true);
            return;
          }

          setMessage(llmMessage, 'Configuración LLM guardada.' + (result.refresh?.message ? ' ' + result.refresh.message : ''));
          await loadSettings();
        } finally {
          getLoadingApi().hideLoading?.('llm-settings-loading');
          getLoadingApi().setButtonLoading?.(button, false);
        }
      });

      document.getElementById('proxy-settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button[type="submit"]');
        const payload = {
          publicBaseUrl: document.getElementById('publicBaseUrl').value.trim(),
          port: Number(document.getElementById('port').value),
          allowedOrigins: parseOrigins(document.getElementById('allowedOrigins').value),
          maxRequestBodyKb: Number(document.getElementById('maxRequestBodyKb').value),
          maxContextChars: Number(document.getElementById('maxContextChars').value)
        };

        getLoadingApi().setButtonLoading?.(button, true, 'Guardando...');
        getLoadingApi().showLoading?.('proxy-settings-loading', 'Guardando configuración...', 'La plataforma está guardando la configuración de proxy. Esto puede tardar unos segundos.');
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();

          if (!response.ok) {
            setMessage(proxyMessage, result.errors?.join(' ') || 'No se pudo guardar la configuración de proxy.', true);
            return;
          }

          setMessage(proxyMessage, 'Configuración de proxy guardada.' + (result.refresh?.message ? ' ' + result.refresh.message : ''));
          await loadSettings();
        } finally {
          getLoadingApi().hideLoading?.('proxy-settings-loading');
          getLoadingApi().setButtonLoading?.(button, false);
        }
      });

      loadSettings().catch((error) => {
        setMessage(dashboardMessage, 'No se pudo cargar la configuración.', true);
        setMessage(llmMessage, error.message, true);
        setMessage(proxyMessage, error.message, true);
      });
    </script>
  `;

  return renderLayout({
    title: 'QA IA Platform - Configuración',
    activePath: '/settings',
    content
  });
}
