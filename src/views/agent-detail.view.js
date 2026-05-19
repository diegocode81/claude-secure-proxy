import { escapeHtml, renderLayout } from './layout.js';
import { buildExpectedOutputSections } from '../agents/shared/runtime/agent-output-document.js';
import { renderLoadingIndicator } from './shared/loading.view.js';

function normalizeLlmSettings(profile) {
  const settings = profile.llmSettings || {};
  const budgetPolicy = settings.budgetPolicy || {};

  return {
    responseDetailLevel: settings.responseDetailLevel || 'standard',
    maxOutputTokens: Number(settings.maxOutputTokens || 1500),
    temperature: Number(settings.temperature ?? 0.2),
    budgetPolicy: {
      enforceMonthlyBudget: budgetPolicy.enforceMonthlyBudget !== false,
      rejectIfEstimatedCostExceedsRemainingBudget: budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget !== false
    }
  };
}

function renderJson(value) {
  return escapeHtml(JSON.stringify(value || {}, null, 2));
}

function renderList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<li>${escapeHtml(emptyText)}</li>`;
  }

  return items.map((item) => `<li>${escapeHtml(String(item).replaceAll('Claude', 'LLM'))}</li>`).join('');
}

function renderVisibleText(value) {
  return escapeHtml(String(value || '').replaceAll('Claude', 'LLM'));
}

function normalizeInteraction(profile) {
  const interaction = profile.interaction || {};
  const io = profile.io || {};
  const inputMode = io.inputMode === 'text_and_file'
    ? 'text-and-file'
    : io.inputMode || interaction.inputMode || 'text';
  const outputMode = io.outputMode === 'download'
    ? 'downloadable-report'
    : io.outputMode === 'screen_and_download'
      ? 'screen-and-download'
      : io.outputMode || interaction.outputMode || 'screen';
  const outputFields = Array.isArray(io.outputFields) && io.outputFields.length > 0
    ? io.outputFields
    : profile.outputSchema?.fields || profile.outputContract || ['summary', 'data', 'risks', 'recommendations', 'openQuestions'];
  return {
    inputMode,
    acceptedInputTypes: Array.isArray(interaction.acceptedInputTypes) && interaction.acceptedInputTypes.length > 0
      ? interaction.acceptedInputTypes
      : ['text'],
    outputMode,
    responsePreset: io.responsePreset || 'qa_standard',
    outputFields,
    downloadableOutput: Boolean(interaction.downloadableOutput) || ['downloadable-report', 'screen-and-download'].includes(outputMode),
    outputFileNamePattern: interaction.outputFileNamePattern || '',
    instructions: interaction.instructions || 'Ingresa la información que el agente debe analizar.'
  };
}

function fileAcceptAttribute(inputTypes) {
  const extensionMap = {
    text: ['.txt'],
    json: ['.json'],
    csv: ['.csv'],
    html: ['.html', '.htm'],
    markdown: ['.md'],
    pdf: ['.pdf']
  };

  return inputTypes
    .flatMap((type) => extensionMap[type] || [])
    .join(',');
}

function renderAgentActions(profile) {
  const isProtected = profile.id === 'qa-log-analyst';

  if (isProtected) {
    return `
      <section class="panel">
        <h2>Acciones del agente</h2>
        <p>Agente base protegido por la plataforma. Sus acciones administrativas están bloqueadas.</p>
      </section>
    `;
  }

  const isActive = profile.status === 'active';
  const primaryAction = isActive
    ? {
        label: 'Desactivar agente',
        endpoint: `/agents/${profile.id}/deactivate`,
        method: 'POST'
      }
    : {
        label: 'Activar agente',
        endpoint: `/agents/${profile.id}/activate`,
        method: 'POST'
      };

  return `
    <section class="panel">
      <h2>Acciones del agente</h2>
      <p>Estas acciones cambian el estado operativo del agente sin llamar LLM ni modificar otros agentes.</p>
      <div id="agent-action-result" class="field form-note"></div>
      ${renderLoadingIndicator({
        id: 'agent-action-loading',
        message: 'Actualizando estado del agente...',
        detail: 'La plataforma está procesando la acción solicitada. Esto puede tardar unos segundos.'
      })}
      <div class="actions">
        <a class="button secondary" href="/${escapeHtml(profile.id)}/edit">Editar agente</a>
        <button type="button" data-agent-action="${escapeHtml(primaryAction.endpoint)}" data-method="${primaryAction.method}">
          ${escapeHtml(primaryAction.label)}
        </button>
        <button type="button" class="danger" id="open-delete-agent-modal">Eliminar agente</button>
      </div>
    </section>

    <div class="modal-backdrop" id="delete-agent-modal" role="dialog" aria-modal="true" aria-labelledby="delete-agent-title">
      <div class="modal">
        <h2 id="delete-agent-title">Confirmar eliminación de agente</h2>
        <p>Esta acción eliminará el agente de la plataforma y quitará su registro. No se puede deshacer desde la interfaz.</p>
        <div class="field">
          <div class="metric-label">Agente</div>
          <p><strong>${escapeHtml(profile.name)}</strong> <code>${escapeHtml(profile.id)}</code></p>
        </div>
        <div class="actions">
          <button type="button" class="secondary" id="cancel-delete-agent">Cancelar</button>
          <button type="button" class="danger" id="confirm-delete-agent">Eliminar definitivamente</button>
        </div>
      </div>
    </div>

    <script>
      (() => {
        const result = document.getElementById('agent-action-result');
        const actionButton = document.querySelector('[data-agent-action]');
        const modal = document.getElementById('delete-agent-modal');
        const openDelete = document.getElementById('open-delete-agent-modal');
        const cancelDelete = document.getElementById('cancel-delete-agent');
        const confirmDelete = document.getElementById('confirm-delete-agent');
        function getLoadingApi() { return window.QAIAPlatform || {}; }

        function showResult(message) {
          if (result) {
            result.textContent = message;
          }
        }

        async function runAction(endpoint, method, button, loadingText, messageText) {
          showResult('Procesando acción...');
          getLoadingApi().setButtonLoading?.(button, true, loadingText || 'Procesando...');
          getLoadingApi().showLoading?.('agent-action-loading', messageText || 'Actualizando estado del agente...', 'La plataforma está procesando la acción solicitada. Esto puede tardar unos segundos.');
          try {
            const response = await fetch(endpoint, { method });
            const payload = await response.json();
            if (!response.ok || payload.errors) {
              showResult((payload.errors || [payload.status || 'Error controlado']).join(' '));
              return payload;
            }

            showResult((payload.status || 'Acción completada') + (payload.refresh?.message ? ' ' + payload.refresh.message : ''));
            return payload;
          } finally {
            getLoadingApi().hideLoading?.('agent-action-loading');
            getLoadingApi().setButtonLoading?.(button, false);
          }
        }

        actionButton?.addEventListener('click', async () => {
          const payload = await runAction(actionButton.dataset.agentAction, actionButton.dataset.method || 'POST', actionButton, 'Actualizando...', 'Actualizando estado del agente...');
          if (payload?.status === 'AGENT_ACTIVATED' || payload?.status === 'AGENT_DEACTIVATED') {
            window.setTimeout(() => window.location.reload(), 700);
          }
        });

        openDelete?.addEventListener('click', () => modal?.classList.add('open'));
        cancelDelete?.addEventListener('click', () => modal?.classList.remove('open'));
        modal?.addEventListener('click', (event) => {
          if (event.target === modal) {
            modal.classList.remove('open');
          }
        });
        confirmDelete?.addEventListener('click', async () => {
          const payload = await runAction('/agents/${escapeHtml(profile.id)}', 'DELETE', confirmDelete, 'Eliminando...', 'Eliminando agente...');
          if (payload?.status === 'AGENT_DELETED') {
            window.setTimeout(() => {
              window.location.href = '/modules';
            }, 700);
          }
        });
      })();
    </script>
  `;
}

function renderInteractionInputs(interaction) {
  const accept = fileAcceptAttribute(interaction.acceptedInputTypes);
  const textArea = `
    <div class="field" id="agent-text-input-wrapper">
      <label for="agent-text-input">${interaction.inputMode === 'json' ? 'JSON de entrada' : 'Texto de entrada'}</label>
      <textarea id="agent-text-input" rows="8" placeholder="${interaction.inputMode === 'json' ? '{\\n  &quot;campo&quot;: &quot;valor&quot;\\n}' : 'Ingresa el contenido que el agente debe analizar.'}"></textarea>
      <p class="form-note">${interaction.inputMode === 'json' ? 'Debe ser JSON válido antes de ejecutar el agente.' : 'Contenido textual que se enviará al runtime del agente.'}</p>
    </div>
  `;
  const fileInput = `
    <div class="field" id="agent-file-input-wrapper">
      <label for="agent-file-input">Subir archivo</label>
      <input id="agent-file-input" type="file" accept="${escapeHtml(accept)}"${interaction.inputMode === 'multiple-files' ? ' multiple' : ''}>
      <p class="form-note">Tamaño máximo: 2 MB por archivo. Tipos aceptados: ${escapeHtml(interaction.acceptedInputTypes.join(', '))}.</p>
    </div>
  `;

  if (interaction.inputMode === 'file' || interaction.inputMode === 'multiple-files') {
    return fileInput;
  }

  if (interaction.inputMode === 'text-and-file') {
    return `${textArea}${fileInput}`;
  }

  return textArea;
}

function renderAgentInteraction(profile) {
  const interaction = normalizeInteraction(profile);
  const execution = profile.execution || {};
  const expectedSections = buildExpectedOutputSections(interaction.outputFields);
  const shouldOfferDownload = interaction.downloadableOutput
    || ['downloadable-report', 'screen-and-download'].includes(interaction.outputMode);

  return `
    <section class="panel">
      <h2>Entrada y salida del agente</h2>
      <div class="summary">
        <div>
          <div class="metric-label">Modo de entrada</div>
          <p><code>${escapeHtml(interaction.inputMode)}</code></p>
        </div>
        <div>
          <div class="metric-label">Tipos aceptados</div>
          <p>${escapeHtml(interaction.acceptedInputTypes.join(', '))}</p>
        </div>
        <div>
          <div class="metric-label">Modo de salida</div>
          <p><code>${escapeHtml(interaction.outputMode)}</code></p>
        </div>
        <div>
          <div class="metric-label">Tipo de respuesta esperada</div>
          <p><code>${escapeHtml(interaction.responsePreset)}</code></p>
        </div>
        <div>
          <div class="metric-label">Descarga habilitada</div>
          <p><code>${escapeHtml(String(shouldOfferDownload))}</code></p>
        </div>
        <div>
          <div class="metric-label">Campos esperados de respuesta</div>
          <p>${escapeHtml(interaction.outputFields.join(', '))}</p>
        </div>
      </div>
      <p>${renderVisibleText(interaction.instructions)}</p>
      <div id="agent-run-message" class="form-note" role="status"></div>
      ${renderLoadingIndicator({
        id: 'agent-run-loading',
        message: 'Ejecutando agente...',
        detail: 'El LLM está procesando la solicitud. Esto puede tardar unos segundos.'
      })}
      ${renderInteractionInputs(interaction)}
      <div class="actions">
        <button type="button" id="execute-agent-button">Ejecutar agente</button>
        <button type="button" class="secondary" id="download-agent-report" hidden>Descargar reporte</button>
      </div>
      <div id="agent-visible-result" class="agent-document-result" hidden>
        <h2>Resultado del agente</h2>
        <div id="agent-visible-result-content"></div>
      </div>
      <details id="agent-technical-result" class="technical-result" hidden>
        <summary>Ver respuesta técnica</summary>
        <pre><code></code></pre>
      </details>
    </section>

    <script>
      (() => {
        const agentId = ${JSON.stringify(profile.id)};
        const agentName = ${JSON.stringify(profile.name)};
        const interaction = ${JSON.stringify(interaction)};
        const expectedSections = ${JSON.stringify(expectedSections)};
        const executionEnabled = ${JSON.stringify(Boolean(execution.enabled))};
        const shouldOfferDownload = ${JSON.stringify(shouldOfferDownload)};
        const maxFileBytes = 2 * 1024 * 1024;
        const blockedFileExtensions = ['.exe', '.sh', '.bat', '.cmd', '.js', '.ts', '.mjs', '.cjs', '.zip', '.rar', '.7z', '.tar', '.gz', '.env', '.pem', '.key'];
        const acceptedTypeExtensions = {
          text: ['.txt'],
          json: ['.json'],
          csv: ['.csv'],
          html: ['.html', '.htm'],
          markdown: ['.md'],
          pdf: ['.pdf']
        };
        const message = document.getElementById('agent-run-message');
        const executeButton = document.getElementById('execute-agent-button');
        function getLoadingApi() { return window.QAIAPlatform || {}; }
        const visibleResult = document.getElementById('agent-visible-result');
        const visibleResultContent = document.getElementById('agent-visible-result-content');
        const technicalResult = document.getElementById('agent-technical-result');
        const technicalResultCode = technicalResult?.querySelector('code');
        const downloadButton = document.getElementById('download-agent-report');
        let lastRunResult = null;

        function showMessage(text, isError = false) {
          if (!message) return;
          message.textContent = text;
          message.style.color = isError ? '#b42318' : '#17623d';
        }

        function fileExtension(fileName) {
          const normalized = String(fileName || '').trim().toLowerCase();
          const lastDot = normalized.lastIndexOf('.');
          return lastDot >= 0 ? normalized.slice(lastDot) : '';
        }

        function allowedFileExtensions() {
          const extensions = (interaction.acceptedInputTypes || [])
            .flatMap((type) => acceptedTypeExtensions[type] || []);
          return extensions.length > 0 ? extensions : acceptedTypeExtensions.text;
        }

        function validateFile(file) {
          if (!file?.name) throw new Error('El nombre del archivo es requerido.');
          if (!Number.isFinite(Number(file.size))) throw new Error('El tamaño del archivo es requerido.');
          if (file.size > maxFileBytes) throw new Error('El archivo supera el tamaño máximo permitido de 2 MB.');

          const extension = fileExtension(file.name);
          if (blockedFileExtensions.includes(extension)) {
            throw new Error('Este tipo de archivo está bloqueado por seguridad.');
          }

          if (!allowedFileExtensions().includes(extension)) {
            throw new Error('La extensión del archivo no está permitida para este agente.');
          }
        }

        function readFileAsText(file) {
          return new Promise((resolve, reject) => {
            if (!file) {
              resolve(null);
              return;
            }
            try {
              validateFile(file);
            } catch (error) {
              reject(error);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve({
              fileName: file.name,
              fileType: file.name.split('.').pop()?.toLowerCase() || '',
              sizeBytes: file.size,
              fileContent: String(reader.result || '')
            });
            reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
            reader.readAsText(file);
          });
        }

        async function buildInput() {
          const textInput = document.getElementById('agent-text-input');
          const fileInput = document.getElementById('agent-file-input');

          if (interaction.inputMode === 'json') {
            try {
              const parsed = JSON.parse(textInput?.value || '');
              if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
                throw new Error('El JSON de entrada debe ser un objeto.');
              }
              return parsed;
            } catch (error) {
              throw new Error(error.message || 'El JSON de entrada no es válido.');
            }
          }

          if (interaction.inputMode === 'file') {
            const fileData = await readFileAsText(fileInput?.files?.[0]);
            if (!fileData) throw new Error('Selecciona un archivo antes de ejecutar el agente.');
            return { file: fileData };
          }

          if (interaction.inputMode === 'multiple-files') {
            const files = Array.from(fileInput?.files || []);
            if (files.length === 0) throw new Error('Selecciona al menos un archivo antes de ejecutar el agente.');
            const fileData = await Promise.all(files.map(readFileAsText));
            return { files: fileData };
          }

          if (interaction.inputMode === 'text-and-file') {
            const text = String(textInput?.value || '').trim();
            const fileData = fileInput?.files?.[0] ? await readFileAsText(fileInput.files[0]) : null;
            if (!text && !fileData) throw new Error('Ingresa texto o selecciona un archivo antes de ejecutar el agente.');
            return fileData ? { text, file: fileData } : { text };
          }

          const text = String(textInput?.value || '').trim();
          if (!text) throw new Error('Ingresa texto antes de ejecutar el agente.');
          return { text };
        }

        function formatSection(title, value) {
          if (value === undefined || value === null || value === '') return '';
          const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
          return '## ' + title + '\\n\\n' + content + '\\n\\n';
        }

        function valueToMarkdown(value) {
          if (Array.isArray(value)) {
            return value.length > 0
              ? value.map((item) => '- ' + (typeof item === 'string' ? item : JSON.stringify(item))).join('\\n')
              : 'No se cuenta con información suficiente para determinarlo.';
          }
          if (value && typeof value === 'object') return JSON.stringify(value, null, 2);
          const text = String(value || '').trim();
          return text || 'No se cuenta con información suficiente para determinarlo.';
        }

        function parseJsonOutput(text) {
          const trimmed = String(text || '').trim();
          if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
          try {
            const parsed = JSON.parse(trimmed);
            return parsed && !Array.isArray(parsed) && typeof parsed === 'object' ? parsed : null;
          } catch {
            return null;
          }
        }

        function containsSection(markdown, title) {
          const normalizedTitle = String(title || '').trim().toLowerCase();
          return String(markdown || '').split('\\n').some((line) => {
            return line.replace(/^#{1,6}\\s+/, '').trim().toLowerCase() === normalizedTitle;
          });
        }

        function normalizeVisibleOutput(text) {
          const rawText = String(text || '').trim();
          const parsed = parseJsonOutput(rawText);
          let markdown = '';

          if (parsed) {
            markdown = expectedSections.map((section) => {
              return '## ' + section.title + '\\n\\n' + valueToMarkdown(parsed[section.field]);
            }).join('\\n\\n');
          } else {
            markdown = rawText || 'El agente no devolvió contenido visible.';
          }

          for (const section of expectedSections) {
            if (!containsSection(markdown, section.title)) {
              markdown += (markdown ? '\\n\\n' : '') + '## ' + section.title + '\\n\\nNo se cuenta con información suficiente para determinarlo.';
            }
          }

          return markdown;
        }

        function getVisiblePayloadOutput(payload) {
          return normalizeVisibleOutput(payload?.llmResponse || payload?.claudeResponse || payload?.rawModelText || '');
        }

        function buildReportMarkdown(result) {
          const timestamp = new Date().toISOString();
          return '# ' + agentName + '\\n\\n'
            + 'Fecha/hora: ' + timestamp + '\\n\\n'
            + formatSection('summary', result.summary)
            + formatSection('data', result.data)
            + formatSection('risks', result.risks)
            + formatSection('recommendations', result.recommendations)
            + formatSection('openQuestions', result.openQuestions)
            + (result.rawModelText ? formatSection('rawModelText', result.rawModelText) : '');
        }

        function reportFileName() {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const pattern = interaction.outputFileNamePattern || '<agent-id>-report-<timestamp>.md';
          return pattern
            .replaceAll('<agent-id>', agentId)
            .replaceAll('<timestamp>', timestamp)
            .replace(/[^a-zA-Z0-9._-]/g, '-');
        }

        executeButton?.addEventListener('click', async () => {
          if (!executionEnabled) {
            showMessage('Este agente está deshabilitado. Actívalo antes de ejecutarlo.', true);
            return;
          }

          try {
            getLoadingApi().setButtonLoading?.(executeButton, true, 'Ejecutando...');
            getLoadingApi().showLoading?.('agent-run-loading', 'Ejecutando agente...', 'El LLM está procesando la solicitud. Esto puede tardar unos segundos.');
            showMessage('Ejecutando agente...');
            const input = await buildInput();
            const response = await fetch('/agents/' + agentId + '/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ input })
            });
            const payload = await response.json();
            lastRunResult = payload;
            if (visibleResult && visibleResultContent) {
              visibleResultContent.textContent = getVisiblePayloadOutput(payload);
              visibleResult.hidden = false;
            }
            if (technicalResultCode && technicalResult) {
              technicalResultCode.textContent = JSON.stringify(payload, null, 2);
              technicalResult.hidden = false;
            }
            if (!response.ok || payload.errors) {
              showMessage((payload.errors || [payload.status || 'Error controlado']).join(' '), true);
            } else {
              showMessage(payload.status || 'Resultado recibido.');
            }
            if (downloadButton) {
              downloadButton.hidden = !shouldOfferDownload;
            }
          } catch (error) {
            showMessage(error.message, true);
          } finally {
            getLoadingApi().hideLoading?.('agent-run-loading');
            getLoadingApi().setButtonLoading?.(executeButton, false);
          }
        });

        downloadButton?.addEventListener('click', () => {
          if (!lastRunResult) return;
          const blob = new Blob([buildReportMarkdown(lastRunResult)], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = reportFileName();
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        });
      })();
    </script>
  `;
}

function renderAgentLlmSettings(profile) {
  const settings = normalizeLlmSettings(profile);

  return `
    <section class="panel">
      <h2>Configuración de respuesta LLM</h2>
      <p class="form-note">Esta configuración controla el tamaño y comportamiento de las respuestas del LLM para este agente.</p>
      <div class="summary">
        <div>
          <div class="metric-label">Nivel de detalle</div>
          <p><code>${escapeHtml(settings.responseDetailLevel)}</code></p>
        </div>
        <div>
          <div class="metric-label">Máximo tokens respuesta</div>
          <p><code>${escapeHtml(String(settings.maxOutputTokens))}</code></p>
        </div>
        <div>
          <div class="metric-label">Temperatura</div>
          <p><code>${escapeHtml(String(settings.temperature))}</code></p>
        </div>
        <div>
          <div class="metric-label">Presupuesto mensual aplicado</div>
          <p><code>${settings.budgetPolicy.enforceMonthlyBudget ? 'sí' : 'no'}</code></p>
        </div>
        <div>
          <div class="metric-label">Bloqueo si excede presupuesto</div>
          <p><code>${settings.budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget ? 'sí' : 'no'}</code></p>
        </div>
      </div>
      <p class="form-note">Para modificar estos valores usa Editar agente.</p>
    </section>
  `;
}

export function renderAgentDetailView(profile) {
  const execution = profile.execution || {};
  const content = `
    <header class="page-header">
      <div>
        <h1>${escapeHtml(profile.name)}</h1>
        <p>${renderVisibleText(profile.description)}</p>
      </div>
      <div class="status-pill pending">Estado: ${escapeHtml(profile.statusLabel || profile.status)}</div>
    </header>

    ${renderAgentActions(profile)}

    ${renderAgentInteraction(profile)}

    ${renderAgentLlmSettings(profile)}

    <section class="module-grid">
      <div class="panel">
        <h2>Capacidades</h2>
        <ul>${renderList(profile.capabilities, 'Capacidades no definidas')}</ul>
      </div>

      <div class="panel">
        <h2>Ejecución</h2>
        <ul>
          <li>enabled: <code>${escapeHtml(String(Boolean(execution.enabled)))}</code></li>
          <li>mode: <code>${escapeHtml(execution.mode || 'runtime-disabled')}</code></li>
          <li>endpoint: <code>${escapeHtml(execution.runtimeEndpoint || `/agents/${profile.id}/run`)}</code></li>
        </ul>
        <p class="form-note">Ejecución deshabilitada hasta completar checklist, pruebas, sanitización, presupuesto y revisión humana.</p>
      </div>

      <div class="panel">
        <h2>Input contract</h2>
        <p class="form-note">Contratos técnicos generados automáticamente por la plataforma a partir de la configuración de entrada y salida. No son editables desde el formulario del agente.</p>
        <pre><code>${renderJson(profile.inputContract)}</code></pre>
      </div>

      <div class="panel">
        <h2>Output schema</h2>
        <p class="form-note">Contratos técnicos generados automáticamente por la plataforma a partir de la configuración de entrada y salida. No son editables desde el formulario del agente.</p>
        <pre><code>${renderJson(profile.outputSchema || profile.outputContract)}</code></pre>
      </div>

      <div class="panel">
        <h2>Gobernanza</h2>
        <p class="form-note">Reglas internas impuestas por la plataforma. No son editables desde el formulario del agente.</p>
        <ul>${renderList(profile.governance, 'Reglas de gobierno no definidas')}</ul>
      </div>
    </section>
  `;

  return renderLayout({
    title: `QA IA Platform - ${profile.name}`,
    activePath: profile.navigation?.path || `/${profile.id}`,
    content
  });
}
