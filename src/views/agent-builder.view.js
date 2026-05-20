import { escapeHtml, renderLayout } from './layout.js';
import { renderLoadingIndicator } from './shared/loading.view.js';
import { DEFAULT_AGENT_CAPABILITIES } from '../agents/shared/agent-defaults.js';

const defaultCapabilities = DEFAULT_AGENT_CAPABILITIES.join('\n');

const outputFieldOptions = [
  ['summary', 'Resumen'],
  ['data', 'Datos analizados'],
  ['risks', 'Riesgos'],
  ['recommendations', 'Recomendaciones'],
  ['openQuestions', 'Preguntas abiertas'],
  ['acceptanceCriteria', 'Criterios de aceptación'],
  ['testScenarios', 'Escenarios de prueba'],
  ['executiveReport', 'Informe gerencial']
];

const defaultOutputFields = ['summary', 'data', 'risks', 'recommendations', 'openQuestions'];

function renderOutputFieldCheckboxes() {
  return outputFieldOptions.map(([value, label]) => `
    <label class="checkbox-option">
      <input type="checkbox" name="outputFields" value="${escapeHtml(value)}"${defaultOutputFields.includes(value) ? ' checked' : ''}>
      ${escapeHtml(label)}
    </label>
  `).join('');
}

export function renderAgentBuilderView() {
  const content = `
    <header class="page-header">
      <div>
        <h1>Crear agentes</h1>
        <p>Crear estructura base de agentes QA con gobernanza, documentación y ejecución deshabilitada.</p>
      </div>
      <div class="status-pill active">Estado: Creación gobernada habilitada</div>
    </header>

    <section class="panel">
      <h2>Formulario de agente QA</h2>
      <p>El agente se creará con <code>execution.enabled = false</code> y <code>mode = runtime-disabled</code>. No llamará LLM hasta que pase checklist, pruebas, sanitización, presupuesto y revisión humana.</p>

      <form id="agent-builder-form">
        <div class="field">
          <label for="name">Nombre del agente</label>
          <input id="name" name="name" type="text" required placeholder="QA Requirements Analyst">
          <p class="form-note">Nombre legible del agente. Se mostrará en navegación, módulos y pantalla del agente.</p>
        </div>

        <div class="field">
          <label for="id">ID del agente</label>
          <input id="id" name="id" type="text" required placeholder="qa-requirements-analyst">
          <p class="form-note">Identificador técnico en kebab-case. Se usará para la carpeta <code>src/agents/&lt;agent-id&gt;/</code> y la ruta <code>/&lt;agent-id&gt;</code>.</p>
        </div>

        <div class="field">
          <label for="description">Descripción</label>
          <textarea id="description" name="description" required placeholder="Analiza requerimientos de negocio y genera criterios de aceptación y escenarios QA."></textarea>
          <p class="form-note">Explica en una frase qué problema QA resuelve este agente.</p>
        </div>

        <div class="field">
          <button type="button" class="secondary" id="ai-suggestion-button">Sugerencia IA</button>
          ${renderLoadingIndicator({
            id: 'ai-suggestion-loading',
            message: 'Generando sugerencia IA...',
            detail: 'El LLM está preparando la propuesta del agente. Esto puede tardar unos segundos.'
          })}
          <p class="form-note">Para usar Sugerencia IA debes completar primero: Nombre del agente, ID del agente y Descripción.</p>
          <p class="form-note">Usa el LLM configurado para proponer rol, capacidades, skill, prompt y estructura funcional del agente. La sugerencia no crea el agente ni activa ejecución.</p>
          <p class="form-note">La sugerencia IA solo prepara contenido. No crea archivos, no registra agentes, no activa runtime y no llama al LLM durante la ejecución del agente.</p>
        </div>

        <div class="field">
          <label for="role">Rol QA del agente</label>
          <textarea id="role" name="role" required></textarea>
          <p class="form-note">Describe el rol especializado del agente. Por ejemplo: analista QA de requerimientos, analista de performance, analista de logs o generador de casos de prueba.</p>
        </div>

        <div class="field">
          <label for="useCases">Casos de uso</label>
          <textarea id="useCases" name="useCases" required></textarea>
          <p class="form-note">Lista de casos de uso, uno por línea. Debe tener al menos un caso antes de crear el agente.</p>
        </div>

        <div class="field">
          <h2>Configuración funcional del agente</h2>
          <p class="form-note">Define cómo el usuario entregará información al agente y qué tipo de respuesta espera. La plataforma generará automáticamente las instrucciones y contratos internos.</p>
        </div>

        <div class="summary field">
          <div>
            <label for="inputMode">Modo de entrada</label>
            <select id="inputMode" name="inputMode">
              <option value="text" selected>Texto</option>
              <option value="file">Archivo</option>
              <option value="text_and_file">Texto + archivo</option>
            </select>
            <p class="form-note">Texto: el usuario escribe la información que el agente debe analizar. Archivo: el usuario sube un documento o reporte permitido. Texto + archivo: combina instrucciones y archivo.</p>
          </div>
          <div>
            <label for="outputMode">Modo de salida</label>
            <select id="outputMode" name="outputMode">
              <option value="screen" selected>Mostrar en pantalla</option>
              <option value="download">Descargar archivo</option>
              <option value="screen_and_download">Mostrar en pantalla y descargar</option>
            </select>
            <p class="form-note">Mostrar en pantalla: el resultado se presenta en la vista del agente. Descargar archivo: genera contenido descargable. Mostrar en pantalla y descargar: permite revisar y descargar. Si eliges Mostrar en pantalla, el agente devolverá un documento en texto/Markdown listo para copiar y pegar. La plataforma usará los tipos de respuesta esperada para estructurar el resultado.</p>
          </div>
        </div>

        <div class="field">
          <label for="responsePreset">Tipo de respuesta esperada</label>
          <select id="responsePreset" name="responsePreset">
            <option value="qa_standard" selected>Análisis estándar QA</option>
            <option value="qa_acceptance_and_scenarios">Criterios y escenarios QA</option>
            <option value="executive_report">Informe gerencial</option>
            <option value="technical_analysis">Análisis técnico</option>
            <option value="custom">Personalizado</option>
          </select>
          <p class="form-note">Selecciona el tipo de respuesta que esperas. La plataforma generará automáticamente los campos internos de salida.</p>
        </div>

        <div class="field" id="custom-output-fields-wrapper" hidden>
          <label>Opciones de salida personalizadas</label>
          <div class="checkbox-grid">
            ${renderOutputFieldCheckboxes()}
          </div>
          <p class="form-note">Selecciona al menos un tipo de contenido esperado para la respuesta del agente.</p>
        </div>

        <div class="field">
          <h2>Configuración de respuesta LLM</h2>
          <p class="form-note">Controla el tamaño, detalle y variación de la respuesta del LLM para este agente.</p>
        </div>

        <div class="summary field">
          <div>
            <label for="responseDetailLevel">Nivel de detalle de respuesta</label>
            <select id="responseDetailLevel" name="responseDetailLevel">
              <option value="brief">Breve</option>
              <option value="standard">Estándar</option>
              <option value="detailed">Detallado</option>
              <option value="extensive" selected>Extenso</option>
            </select>
            <p class="form-note">Define qué tan completa debe ser la respuesta. Por defecto se usa Extenso para priorizar análisis QA completos y listos para revisión.</p>
          </div>
          <div>
            <label for="maxOutputTokens">Máximo de tokens de respuesta</label>
            <input id="maxOutputTokens" name="maxOutputTokens" type="number" min="300" max="8000" value="5000">
            <p class="form-note">Controla la longitud máxima de la respuesta. El default de 5000 permite informes QA completos; puedes bajarlo si deseas reducir consumo.</p>
          </div>
        </div>

        <div class="field">
          <label for="temperaturePreset">Precisión de respuesta</label>
          <select id="temperaturePreset" name="temperaturePreset">
            <option value="precise" selected>Precisa</option>
            <option value="balanced">Balanceada</option>
            <option value="creative">Creativa</option>
          </select>
          <p class="form-note">Define la variación de la respuesta. Para QA se usa Precisa por defecto para mejorar consistencia, trazabilidad y reducir invención.</p>
        </div>

        <div class="field">
          <label for="capabilities">Capacidades</label>
          <textarea id="capabilities" name="capabilities" required>${escapeHtml(defaultCapabilities)}</textarea>
          <p class="form-note">Lista las capacidades principales del agente. La plataforma propone capacidades QA robustas por defecto; puedes ajustarlas según el objetivo del agente.</p>
        </div>

        <div class="actions">
          <button type="submit">Crear agente</button>
        </div>
        ${renderLoadingIndicator({
          id: 'agent-create-loading',
          message: 'Procesando creación del agente...',
          detail: 'La plataforma está creando la estructura gobernada del agente. Esto puede tardar unos segundos.'
        })}
        <p class="form-note" id="agent-builder-message" role="status"></p>
      </form>
    </section>

    <script>
      const form = document.getElementById('agent-builder-form');
      const nameInput = document.getElementById('name');
      const idInput = document.getElementById('id');
      const message = document.getElementById('agent-builder-message');
      const aiSuggestionButton = document.getElementById('ai-suggestion-button');
      const createButton = form.querySelector('button[type="submit"]');
      function getLoadingApi() { return window.QAIAPlatform || {}; }
      const responsePresetInput = document.getElementById('responsePreset');
      const customOutputFieldsWrapper = document.getElementById('custom-output-fields-wrapper');
      let idEdited = false;

      function toKebabCase(value) {
        return value
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase();
      }

      function setMessage(text, isError = false) {
        message.textContent = text;
        message.style.color = isError ? '#b42318' : '#17623d';
      }

      function linesFrom(id) {
        return document.getElementById(id).value
          .split('\\n')
          .map((item) => item.trim())
          .filter(Boolean);
      }

      function selectedOutputFields() {
        return Array.from(document.querySelectorAll('input[name="outputFields"]:checked'))
          .map((input) => input.value)
          .filter(Boolean);
      }

      function setOutputFields(fields) {
        const selected = Array.isArray(fields) && fields.length > 0
          ? fields
          : ['summary', 'data', 'risks', 'recommendations', 'openQuestions'];
        document.querySelectorAll('input[name="outputFields"]').forEach((input) => {
          input.checked = selected.includes(input.value);
        });
      }

      function syncCustomOutputFieldsVisibility() {
        customOutputFieldsWrapper.hidden = responsePresetInput.value !== 'custom';
      }

      function getSuggestionPrerequisiteErrors() {
        const errors = [];
        const name = nameInput.value.trim();
        const agentId = idInput.value.trim();
        const description = document.getElementById('description').value.trim();

        if (!name || name.length < 5) errors.push('Nombre del agente es obligatorio.');
        if (!agentId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agentId)) errors.push('ID del agente es obligatorio y debe estar en kebab-case.');
        if (!description || description.length < 20) errors.push('Descripción es obligatoria y debe tener al menos 20 caracteres.');

        return errors;
      }

      function updateSuggestionButtonState() {
        const hasErrors = getSuggestionPrerequisiteErrors().length > 0;
        aiSuggestionButton.disabled = hasErrors;
        if (hasErrors) {
          aiSuggestionButton.title = 'Completa nombre, ID y descripción antes de solicitar Sugerencia IA.';
        } else {
          aiSuggestionButton.title = '';
        }
      }

      idInput.addEventListener('input', () => {
        idEdited = true;
        updateSuggestionButtonState();
      });

      nameInput.addEventListener('input', () => {
        if (!idEdited) {
          idInput.value = toKebabCase(nameInput.value);
        }
        updateSuggestionButtonState();
      });

      document.getElementById('description').addEventListener('input', updateSuggestionButtonState);
      responsePresetInput.addEventListener('change', syncCustomOutputFieldsVisibility);
      updateSuggestionButtonState();
      syncCustomOutputFieldsVisibility();

      aiSuggestionButton.addEventListener('click', async () => {
        const prerequisiteErrors = getSuggestionPrerequisiteErrors();

        if (prerequisiteErrors.length > 0) {
          setMessage('Completa Nombre del agente, ID del agente y Descripción antes de solicitar Sugerencia IA. ' + prerequisiteErrors.join(' '), true);
          return;
        }

        const name = nameInput.value.trim();
        const agentId = idInput.value.trim();
        const description = document.getElementById('description').value.trim();
        getLoadingApi().setButtonLoading?.(aiSuggestionButton, true, 'Generando sugerencia...');
        getLoadingApi().showLoading?.('ai-suggestion-loading', 'Generando sugerencia IA...', 'El LLM está preparando la propuesta del agente. Esto puede tardar unos segundos.');
        setMessage('El LLM está generando la propuesta del agente. Esto puede tardar unos segundos.');

        try {
          const response = await fetch('/agent-builder/suggest', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              name,
              agentId,
              description,
              role: document.getElementById('role').value.trim()
            })
          });
          const result = await response.json();

          if (!response.ok || result.status !== 'AGENT_AI_SUGGESTION_READY') {
            setMessage((result.errors || [result.summary || 'No se pudo obtener la sugerencia IA. Verifica configuración LLM y servidor.']).join(' '), true);
            return;
          }

          const data = result.data || {};
          document.getElementById('role').value = data.role || document.getElementById('role').value;
          document.getElementById('useCases').value = Array.isArray(data.useCases) ? data.useCases.join('\\n') : document.getElementById('useCases').value;
          document.getElementById('capabilities').value = Array.isArray(data.capabilities) ? data.capabilities.join('\\n') : document.getElementById('capabilities').value;
          if (data.inputMode) document.getElementById('inputMode').value = data.inputMode;
          if (data.outputMode) document.getElementById('outputMode').value = data.outputMode;
          if (data.responsePreset) document.getElementById('responsePreset').value = data.responsePreset;
          if (document.getElementById('responsePreset').value === 'custom') setOutputFields(data.outputFields);
          syncCustomOutputFieldsVisibility();
          if (data.llmSettings) {
            document.getElementById('responseDetailLevel').value = data.llmSettings.responseDetailLevel || document.getElementById('responseDetailLevel').value;
            document.getElementById('maxOutputTokens').value = data.llmSettings.maxOutputTokens || document.getElementById('maxOutputTokens').value;
            const temperature = Number(data.llmSettings.temperature);
            document.getElementById('temperaturePreset').value = temperature <= 0.15 ? 'precise' : temperature >= 0.6 ? 'creative' : 'balanced';
          }
          if (result.usage?.usageRegistered) {
            setMessage('Sugerencia IA aplicada. Consumo estimado: ' + result.usage.inputTokens + ' input tokens, ' + result.usage.outputTokens + ' output tokens, costo estimado USD ' + result.usage.estimatedCostUsd + '.');
          } else {
            setMessage('Sugerencia IA aplicada. No se recibió detalle de consumo.');
          }
        } catch {
          setMessage('No se pudo obtener la sugerencia IA. Verifica configuración LLM y servidor.', true);
        } finally {
          getLoadingApi().hideLoading?.('ai-suggestion-loading');
          getLoadingApi().setButtonLoading?.(aiSuggestionButton, false);
          updateSuggestionButtonState();
        }
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const errors = [];
        const agentId = idInput.value.trim();
        const role = document.getElementById('role').value.trim();
        const useCases = linesFrom('useCases');
        const capabilities = linesFrom('capabilities');
        const inputMode = document.getElementById('inputMode').value;
        const outputMode = document.getElementById('outputMode').value;
        const responsePreset = document.getElementById('responsePreset').value;
        const outputFields = selectedOutputFields();
        const responseDetailLevel = document.getElementById('responseDetailLevel').value;
        const maxOutputTokens = Number(document.getElementById('maxOutputTokens').value);
        const temperaturePreset = document.getElementById('temperaturePreset').value;

        if (!nameInput.value.trim()) errors.push('name requerido.');
        if (!agentId) errors.push('id requerido.');
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agentId)) errors.push('El ID del agente debe estar en kebab-case.');
        if (!document.getElementById('description').value.trim()) errors.push('description requerido.');
        if (!role) errors.push('role requerido.');
        if (useCases.length < 1) errors.push('useCases debe tener al menos un caso.');
        if (capabilities.length < 1) errors.push('capabilities debe tener al menos una capacidad.');
        if (!['text', 'file', 'text_and_file'].includes(inputMode)) errors.push('Si no se selecciona modo de entrada, selecciona una opción válida.');
        if (!['screen', 'download', 'screen_and_download'].includes(outputMode)) errors.push('Si no se selecciona tipo de salida, selecciona una opción válida.');
        if (!['qa_standard', 'qa_acceptance_and_scenarios', 'executive_report', 'technical_analysis', 'custom'].includes(responsePreset)) errors.push('Tipo de respuesta esperada no es válido.');
        if (responsePreset === 'custom' && outputFields.length < 1) errors.push('Selecciona al menos un tipo de contenido esperado para la respuesta del agente.');
        if (!['brief', 'standard', 'detailed', 'extensive'].includes(responseDetailLevel)) errors.push('responseDetailLevel no es válido.');
        if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 300 || maxOutputTokens > 8000) errors.push('maxOutputTokens debe estar entre 300 y 8000.');
        if (!['precise', 'balanced', 'creative'].includes(temperaturePreset)) errors.push('temperaturePreset no es válido.');

        if (errors.length > 0) {
          setMessage(errors.join(' '), true);
          return;
        }

        const payload = {
          name: nameInput.value.trim(),
          id: agentId,
          description: document.getElementById('description').value.trim(),
          role,
          useCases,
          capabilities,
          inputMode,
          outputMode,
          responsePreset,
          outputFields: responsePreset === 'custom' ? outputFields : [],
          responseDetailLevel,
          maxOutputTokens,
          temperaturePreset
        };

        getLoadingApi().setButtonLoading?.(createButton, true, 'Creando...');
        getLoadingApi().showLoading?.('agent-create-loading', 'Procesando creación del agente...', 'La plataforma está creando la estructura gobernada del agente. Esto puede tardar unos segundos.');
        try {
          const response = await fetch('/agent-builder/create', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();

          if (!response.ok) {
            setMessage(result.errors?.join(' ') || 'No se pudo crear el agente.', true);
            return;
          }

          setMessage('Agente creado: ' + result.agentId + '. Ruta: ' + result.route + (result.refresh?.message ? ' ' + result.refresh.message : ''));
        } finally {
          getLoadingApi().hideLoading?.('agent-create-loading');
          getLoadingApi().setButtonLoading?.(createButton, false);
        }
      });
    </script>
  `;

  return renderLayout({
    title: 'QA IA Platform - Crear agentes',
    activePath: '/agent-builder',
    content
  });
}
