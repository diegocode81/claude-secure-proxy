import { escapeHtml, renderLayout } from './layout.js';
import { renderLoadingIndicator } from './shared/loading.view.js';

function renderLines(items) {
  return escapeHtml((Array.isArray(items) ? items : []).join('\n'));
}

function renderOption(value, label, currentValue) {
  const selected = value === currentValue ? ' selected' : '';
  return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
}

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

function renderOutputFieldCheckboxes(currentFields) {
  const selectedFields = Array.isArray(currentFields) && currentFields.length > 0
    ? currentFields
    : ['summary', 'data', 'risks', 'recommendations', 'openQuestions'];

  return outputFieldOptions.map(([value, label]) => `
    <label class="checkbox-option">
      <input type="checkbox" name="outputFields" value="${escapeHtml(value)}"${selectedFields.includes(value) ? ' checked' : ''}>
      ${escapeHtml(label)}
    </label>
  `).join('');
}

export function renderAgentEditView(editData) {
  const execution = editData.execution || {};
  const interaction = editData.interaction || {};
  const io = editData.io || {
    inputMode: interaction.inputMode || 'text',
    outputMode: interaction.outputMode || 'screen',
    outputFields: ['summary', 'data', 'risks', 'recommendations', 'openQuestions']
  };
  const llmSettings = editData.llmSettings || {};
  const temperaturePreset = Number(llmSettings.temperature) <= 0.15
    ? 'precise'
    : Number(llmSettings.temperature) >= 0.6
      ? 'creative'
      : 'balanced';
  const agentPath = `/${editData.id}`;
  const content = `
    <header class="page-header">
      <div>
        <h1>Editar agente: ${escapeHtml(editData.name)}</h1>
        <p>Actualiza metadata, skill, prompt, contratos y documentación sin activar ejecución ni llamar LLM.</p>
      </div>
      <a class="button secondary" href="${escapeHtml(agentPath)}">Cancelar</a>
    </header>

    <section class="panel">
      <h2>Datos solo lectura</h2>
      <div class="summary">
        <div>
          <div class="metric-label">Agent ID</div>
          <p><code>${escapeHtml(editData.id)}</code></p>
        </div>
        <div>
          <div class="metric-label">execution.enabled</div>
          <p><code>${escapeHtml(String(Boolean(execution.enabled)))}</code></p>
        </div>
        <div>
          <div class="metric-label">execution.mode</div>
          <p><code>${escapeHtml(execution.mode || 'runtime-disabled')}</code></p>
        </div>
        <div>
          <div class="metric-label">runtimeEndpoint</div>
          <p><code>${escapeHtml(execution.runtimeEndpoint || `/agents/${editData.id}/run`)}</code></p>
        </div>
      </div>
      <p class="form-note">La edición no activa el agente ni llama al LLM. Para activar ejecución usa el botón Activar agente después de completar revisión, pruebas, sanitización y presupuesto.</p>
    </section>

    <section class="panel">
      <form id="agent-edit-form">
        <div id="agent-edit-result" class="form-note"></div>

        <div class="field">
          <label for="name">Nombre del agente</label>
          <input id="name" name="name" value="${escapeHtml(editData.name)}" required>
          <div class="form-note">Nombre visible del agente en navegación, módulos y pantalla.</div>
        </div>

        <div class="field">
          <label for="description">Descripción</label>
          <textarea id="description" name="description" required>${escapeHtml(editData.description)}</textarea>
          <div class="form-note">Describe qué problema QA resuelve el agente.</div>
        </div>

        <div class="field">
          <label for="capabilities">Capacidades</label>
          <textarea id="capabilities" name="capabilities" required>${renderLines(editData.capabilities)}</textarea>
          <div class="form-note">Lista de cosas que el agente puede hacer. Usa una capacidad por línea.</div>
        </div>

        <div class="field">
          <h2>Entrada y salida del agente</h2>
          <div class="form-note">Define cómo el usuario entregará información al agente y qué tipo de respuesta espera. La plataforma generará automáticamente las instrucciones y contratos internos.</div>
        </div>

        <div class="summary field">
          <div>
            <label for="inputMode">Modo de entrada</label>
            <select id="inputMode" name="inputMode">
              ${renderOption('text', 'Texto', io.inputMode || 'text')}
              ${renderOption('file', 'Archivo', io.inputMode || 'text')}
              ${renderOption('text_and_file', 'Texto + archivo', io.inputMode || 'text')}
            </select>
            <div class="form-note">Texto: el usuario escribe la información que el agente debe analizar. Archivo: sube un documento o reporte permitido. Texto + archivo: combina instrucciones y archivo.</div>
          </div>
          <div>
            <label for="outputMode">Modo de salida</label>
            <select id="outputMode" name="outputMode">
              ${renderOption('screen', 'Mostrar en pantalla', io.outputMode || 'screen')}
              ${renderOption('download', 'Descargar archivo', io.outputMode || 'screen')}
              ${renderOption('screen_and_download', 'Mostrar en pantalla y descargar', io.outputMode || 'screen')}
            </select>
            <div class="form-note">Mostrar en pantalla: el resultado se presenta en la vista del agente. Descargar archivo: genera contenido descargable. Mostrar en pantalla y descargar: permite revisar y descargar. Si eliges Mostrar en pantalla, el agente devolverá un documento en texto/Markdown listo para copiar y pegar. La plataforma usará los tipos de respuesta esperada para estructurar el resultado.</div>
          </div>
        </div>

        <div class="field">
          <label for="responsePreset">Tipo de respuesta esperada</label>
          <select id="responsePreset" name="responsePreset">
            ${renderOption('qa_standard', 'Análisis estándar QA', io.responsePreset || 'qa_standard')}
            ${renderOption('qa_acceptance_and_scenarios', 'Criterios y escenarios QA', io.responsePreset || 'qa_standard')}
            ${renderOption('executive_report', 'Informe gerencial', io.responsePreset || 'qa_standard')}
            ${renderOption('technical_analysis', 'Análisis técnico', io.responsePreset || 'qa_standard')}
            ${renderOption('custom', 'Personalizado', io.responsePreset || 'qa_standard')}
          </select>
          <div class="form-note">Selecciona el tipo de respuesta que esperas. La plataforma generará automáticamente los campos internos de salida.</div>
        </div>

        <div class="field" id="custom-output-fields-wrapper"${io.responsePreset === 'custom' ? '' : ' hidden'}>
          <label>Opciones de salida personalizadas</label>
          <div class="checkbox-grid">
            ${renderOutputFieldCheckboxes(io.outputFields)}
          </div>
          <div class="form-note">Selecciona al menos un tipo de contenido esperado para la respuesta del agente.</div>
        </div>

        <div class="field">
          <h2>Configuración de respuesta LLM</h2>
          <div class="form-note">Controla el tamaño, detalle y variación de la respuesta del LLM para este agente.</div>
        </div>

        <div class="summary field">
          <div>
            <label for="responseDetailLevel">Nivel de detalle de respuesta</label>
            <select id="responseDetailLevel" name="responseDetailLevel">
              ${renderOption('brief', 'Breve', llmSettings.responseDetailLevel || 'standard')}
              ${renderOption('standard', 'Estándar', llmSettings.responseDetailLevel || 'standard')}
              ${renderOption('detailed', 'Detallado', llmSettings.responseDetailLevel || 'standard')}
              ${renderOption('extensive', 'Extenso', llmSettings.responseDetailLevel || 'standard')}
            </select>
            <div class="form-note">Más detalle puede consumir más tokens.</div>
          </div>
          <div>
            <label for="maxOutputTokens">Máximo de tokens de respuesta</label>
            <input id="maxOutputTokens" name="maxOutputTokens" type="number" min="300" max="8000" value="${escapeHtml(String(llmSettings.maxOutputTokens || 1500))}">
            <div class="form-note">Debe estar entre 300 y 8000.</div>
          </div>
        </div>

        <div class="field">
          <label for="temperaturePreset">Precisión de respuesta</label>
          <select id="temperaturePreset" name="temperaturePreset">
            ${renderOption('precise', 'Precisa', temperaturePreset)}
            ${renderOption('balanced', 'Balanceada', temperaturePreset)}
            ${renderOption('creative', 'Creativa', temperaturePreset)}
          </select>
          <div class="form-note">Para QA se recomienda Precisa o Balanceada. La política de presupuesto permanece activa.</div>
        </div>

        <div class="field">
          <label for="skillMarkdown">Skill</label>
          <textarea id="skillMarkdown" name="skillMarkdown" required>${escapeHtml(editData.skillMarkdown)}</textarea>
          <div class="form-note">Conocimiento y rol QA del agente. Incluye qué hace, qué no hace, límites, riesgos y criterios de calidad.</div>
        </div>

        <div class="field">
          <label for="promptMarkdown">Prompt oficial</label>
          <textarea id="promptMarkdown" name="promptMarkdown" required>${escapeHtml(editData.promptMarkdown)}</textarea>
          <div class="form-note">Instrucciones que usará el LLM cuando el agente esté activo. Debe indicar formato, idioma, reglas de no invención y evidencia vs hipótesis.</div>
        </div>

        <div class="field">
          <label for="contractMarkdown">Contrato documentado</label>
          <textarea id="contractMarkdown" name="contractMarkdown" required>${escapeHtml(editData.contractMarkdown)}</textarea>
          <div class="form-note">Documentación completa del contrato técnico: requests válidos, inválidos, errores, estados y respuestas.</div>
        </div>

        <div class="field">
          <label for="readmeMarkdown">README del agente</label>
          <textarea id="readmeMarkdown" name="readmeMarkdown" required>${escapeHtml(editData.readmeMarkdown)}</textarea>
          <div class="form-note">Documentación operativa del agente.</div>
        </div>

        <div class="actions">
          <button type="submit">Guardar cambios</button>
          <a class="button secondary" href="${escapeHtml(agentPath)}">Cancelar</a>
        </div>
        ${renderLoadingIndicator({
          id: 'agent-edit-loading',
          message: 'Guardando cambios del agente...',
          detail: 'La plataforma está actualizando la configuración gobernada del agente. Esto puede tardar unos segundos.'
        })}
      </form>
    </section>

    <script>
      (() => {
        const form = document.getElementById('agent-edit-form');
        const result = document.getElementById('agent-edit-result');
        const saveButton = form.querySelector('button[type="submit"]');
        function getLoadingApi() { return window.QAIAPlatform || {}; }
        const responsePresetInput = document.getElementById('responsePreset');
        const customOutputFieldsWrapper = document.getElementById('custom-output-fields-wrapper');

        function lines(value) {
          return String(value || '').split('\\n').map((item) => item.trim()).filter(Boolean);
        }

        function show(message) {
          result.textContent = message;
        }

        function selectedOutputFields() {
          return Array.from(document.querySelectorAll('input[name="outputFields"]:checked'))
            .map((input) => input.value)
            .filter(Boolean);
        }

        function syncCustomOutputFieldsVisibility() {
          customOutputFieldsWrapper.hidden = responsePresetInput.value !== 'custom';
        }

        responsePresetInput.addEventListener('change', syncCustomOutputFieldsVisibility);
        syncCustomOutputFieldsVisibility();

        form.addEventListener('submit', async (event) => {
          event.preventDefault();

          try {
            const payload = {
              name: document.getElementById('name').value.trim(),
              description: document.getElementById('description').value.trim(),
              capabilities: lines(document.getElementById('capabilities').value),
              inputMode: document.getElementById('inputMode').value,
              outputMode: document.getElementById('outputMode').value,
              responsePreset: document.getElementById('responsePreset').value,
              outputFields: document.getElementById('responsePreset').value === 'custom' ? selectedOutputFields() : [],
              responseDetailLevel: document.getElementById('responseDetailLevel').value,
              maxOutputTokens: Number(document.getElementById('maxOutputTokens').value),
              temperaturePreset: document.getElementById('temperaturePreset').value,
              skillMarkdown: document.getElementById('skillMarkdown').value.trim(),
              promptMarkdown: document.getElementById('promptMarkdown').value.trim(),
              contractMarkdown: document.getElementById('contractMarkdown').value.trim(),
              readmeMarkdown: document.getElementById('readmeMarkdown').value.trim()
            };

            if (!payload.name || !payload.description) {
              throw new Error('Nombre y descripción son requeridos.');
            }
            if (!['text', 'file', 'text_and_file'].includes(payload.inputMode)) {
              throw new Error('Si no se selecciona modo de entrada, selecciona una opción válida.');
            }
            if (!['screen', 'download', 'screen_and_download'].includes(payload.outputMode)) {
              throw new Error('Si no se selecciona tipo de salida, selecciona una opción válida.');
            }
            if (!['qa_standard', 'qa_acceptance_and_scenarios', 'executive_report', 'technical_analysis', 'custom'].includes(payload.responsePreset)) {
              throw new Error('Tipo de respuesta esperada no es válido.');
            }
            if (payload.responsePreset === 'custom' && payload.outputFields.length < 1) {
              throw new Error('Selecciona al menos un tipo de contenido esperado para la respuesta del agente.');
            }
            if (payload.skillMarkdown.length < 30 || payload.promptMarkdown.length < 30 || payload.contractMarkdown.length < 30) {
              throw new Error('Skill, prompt y contrato documentado deben tener al menos 30 caracteres.');
            }
            if (!['brief', 'standard', 'detailed', 'extensive'].includes(payload.responseDetailLevel)) {
              throw new Error('responseDetailLevel no es válido.');
            }
            if (!Number.isFinite(payload.maxOutputTokens) || payload.maxOutputTokens < 300 || payload.maxOutputTokens > 8000) {
              throw new Error('maxOutputTokens debe estar entre 300 y 8000.');
            }
            if (!['precise', 'balanced', 'creative'].includes(payload.temperaturePreset)) {
              throw new Error('temperaturePreset no es válido.');
            }

            show('Guardando cambios...');
            getLoadingApi().setButtonLoading?.(saveButton, true, 'Guardando...');
            getLoadingApi().showLoading?.('agent-edit-loading', 'Guardando cambios del agente...', 'La plataforma está actualizando la configuración gobernada del agente. Esto puede tardar unos segundos.');
            const response = await fetch('/agents/${escapeHtml(editData.id)}', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || data.errors) {
              show((data.errors || [data.status || 'Error controlado']).join(' '));
              return;
            }

            show('Cambios guardados correctamente.' + (data.refresh?.message ? ' ' + data.refresh.message : ''));
            window.setTimeout(() => {
              window.location.href = '${escapeHtml(agentPath)}';
            }, 700);
          } catch (error) {
            show(error.message);
          } finally {
            getLoadingApi().hideLoading?.('agent-edit-loading');
            getLoadingApi().setButtonLoading?.(saveButton, false);
          }
        });
      })();
    </script>
  `;

  return renderLayout({
    title: `QA IA Platform - Editar ${editData.name}`,
    activePath: agentPath,
    content
  });
}
