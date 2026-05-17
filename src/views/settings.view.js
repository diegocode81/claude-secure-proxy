import { renderLayout } from './layout.js';

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
            <p class="form-note">API key actual: <span id="apiKeyPreview">No configurada</span></p>
            <p class="form-note">No compartas ni pegues API keys reales en ambientes no seguros. La API key no se muestra completa después de guardarse.</p>
          </div>
          <div class="actions">
            <button type="submit">Guardar configuración LLM</button>
          </div>
          <p class="form-note" id="llm-settings-message" role="status"></p>
        </form>
      </div>
    </section>

    <script>
      const configUrl = '/settings/config';
      const dashboardUrl = '/settings/dashboard';
      const llmUrl = '/settings/llm';

      const dashboardMessage = document.getElementById('dashboard-settings-message');
      const llmMessage = document.getElementById('llm-settings-message');

      function setMessage(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? '#b42318' : '#17623d';
      }

      async function loadSettings() {
        const response = await fetch(configUrl);
        const config = await response.json();

        document.getElementById('monthlyBudgetUsd').value = config.dashboard.monthlyBudgetUsd;
        document.getElementById('alertThresholdUsd').value = config.dashboard.alertThresholdUsd;
        document.getElementById('provider').value = config.llm.provider;
        document.getElementById('displayName').value = config.llm.displayName;
        document.getElementById('apiKey').value = '';
        document.getElementById('apiKeyPreview').textContent = config.llm.apiKeyConfigured
          ? config.llm.apiKeyPreview
          : 'No configurada';
      }

      document.getElementById('dashboard-settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
          monthlyBudgetUsd: Number(document.getElementById('monthlyBudgetUsd').value),
          alertThresholdUsd: Number(document.getElementById('alertThresholdUsd').value)
        };

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

        setMessage(dashboardMessage, 'Configuración de dashboard guardada.');
        await loadSettings();
      });

      document.getElementById('llm-settings-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const apiKey = document.getElementById('apiKey').value;
        const payload = {
          provider: document.getElementById('provider').value,
          displayName: document.getElementById('displayName').value,
          apiKey
        };

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

        setMessage(llmMessage, 'Configuración LLM guardada.');
        await loadSettings();
      });

      loadSettings().catch((error) => {
        setMessage(dashboardMessage, 'No se pudo cargar la configuración.', true);
        setMessage(llmMessage, error.message, true);
      });
    </script>
  `;

  return renderLayout({
    title: 'QA IA Platform - Configuración',
    activePath: '/settings',
    content
  });
}
