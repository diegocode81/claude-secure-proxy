import test from 'node:test';
import assert from 'node:assert/strict';

import { renderAgentBuilderView } from '../../src/views/agent-builder.view.js';
import { renderAgentDetailView } from '../../src/views/agent-detail.view.js';
import { renderAgentEditView } from '../../src/views/agent-edit.view.js';
import { renderSettingsView } from '../../src/views/settings.view.js';

const hiddenSectionTitle = ['Gober', 'nanza'].join('');
const hiddenInternalNote = ['Reglas internas impuestas por la plata', 'forma'].join('');
const hiddenEditableNote = ['No son editables desde el formulario del ag', 'ente'].join('');
const hiddenInputContractTitle = ['Input ', 'contract'].join('');
const hiddenOutputSchemaTitle = ['Output ', 'schema'].join('');
const hiddenInputContractNote = ['Contrato técnico generado automática', 'mente'].join('');
const hiddenOutputSchemaNote = ['Esquema técnico generado automática', 'mente'].join('');
const hiddenActionsCardTitle = ['Acciones del ', 'agente'].join('');
const hiddenActionsCardNote = ['Estas acciones cambian el estado ', 'operativo'].join('');
const hiddenIoSectionTitle = ['Entrada y salida del ', 'agente'].join('');
const hiddenInputModeLabel = ['Modo de ', 'entrada'].join('');
const hiddenOutputModeLabel = ['Modo de ', 'salida'].join('');
const hiddenDownloadEnabledLabel = ['Descarga ', 'habilitada'].join('');
const hiddenExpectedFieldsLabel = ['Campos esperados de ', 'respuesta'].join('');
const responsePresetLabel = ['Tipo de respuesta ', 'esperada'].join('');
const hiddenExecutionTitle = ['Eje', 'cución'].join('');

function countMatches(value, pattern) {
  return Array.from(value.matchAll(pattern)).length;
}

function buildProfile(overrides = {}) {
  return {
    id: 'qa-example',
    name: 'QA Example Agent',
    description: 'Analiza evidencia funcional y técnica para QA.',
    status: 'draft',
    statusLabel: 'Borrador',
    navigation: {
      path: '/qa-example'
    },
    capabilities: [
      'Analizar evidencia funcional',
      'Detectar riesgos de regresión'
    ],
    execution: {
      enabled: false,
      mode: 'runtime-disabled',
      runtimeEndpoint: '/agents/qa-example/run'
    },
    io: {
      inputMode: 'text',
      outputMode: 'screen',
      responsePreset: 'qa_standard',
      outputFields: ['summary', 'risks', 'recommendations']
    },
    interaction: {
      acceptedInputTypes: ['text'],
      instructions: 'Ingresa evidencia QA.'
    },
    inputContract: {
      required: ['text'],
      fields: {
        text: {
          type: 'string'
        }
      }
    },
    outputSchema: {
      fields: ['summary', 'risks', 'recommendations']
    },
    llmSettings: {
      responseDetailLevel: 'extensive',
      maxOutputTokens: 5000,
      temperature: 0.1,
      budgetPolicy: {
        enforceMonthlyBudget: true,
        rejectIfEstimatedCostExceedsRemainingBudget: true
      }
    },
    governance: [
      'Regla interna de seguridad'
    ],
    ...overrides
  };
}

test('agent detail hides internal governance while preserving functional agent information', () => {
  const html = renderAgentDetailView(buildProfile());

  assert.doesNotMatch(html, new RegExp(hiddenSectionTitle));
  assert.doesNotMatch(html, new RegExp(hiddenInternalNote));
  assert.doesNotMatch(html, new RegExp(hiddenEditableNote));

  assert.match(html, /QA Example Agent/);
  assert.match(html, /Analiza evidencia funcional y técnica para QA/);
  assert.match(html, /Analizar evidencia funcional/);
  assert.match(html, /Ejecutar agente/);
  assert.match(html, /Resultado del agente/);
});

test('agent detail hides technical contracts while preserving functional agent information', () => {
  const html = renderAgentDetailView(buildProfile());

  assert.doesNotMatch(html, new RegExp(hiddenInputContractTitle));
  assert.doesNotMatch(html, new RegExp(hiddenOutputSchemaTitle));
  assert.doesNotMatch(html, new RegExp(hiddenInputContractNote));
  assert.doesNotMatch(html, new RegExp(hiddenOutputSchemaNote));

  assert.match(html, /QA Example Agent/);
  assert.match(html, /Analiza evidencia funcional y técnica para QA/);
  assert.match(html, /Analizar evidencia funcional/);
});

test('agent detail hides input and output metadata while keeping the run form', () => {
  const html = renderAgentDetailView(buildProfile());

  assert.doesNotMatch(html, new RegExp(hiddenIoSectionTitle));
  assert.doesNotMatch(html, new RegExp(hiddenInputModeLabel));
  assert.doesNotMatch(html, new RegExp(hiddenOutputModeLabel));
  assert.doesNotMatch(html, new RegExp(hiddenDownloadEnabledLabel));
  assert.doesNotMatch(html, new RegExp(hiddenExpectedFieldsLabel));
  assert.doesNotMatch(html, new RegExp(responsePresetLabel));
  assert.doesNotMatch(html, /qa_standard/);

  assert.match(html, /Ingresa evidencia QA/);
  assert.match(html, /id="agent-text-input"/);
  assert.match(html, /Ejecutar agente/);
  assert.match(html, /agent-run-loading/);
  assert.match(html, /Resultado del agente/);
});

test('agent detail result container supports internal scrolling for long responses', () => {
  const html = renderAgentDetailView(buildProfile());

  assert.match(html, /Resultado del agente/);
  assert.match(html, /id="agent-visible-result-content"/);
  assert.match(html, /agent-result-box/);
  assert.match(html, /max-height: 520px/);
  assert.match(html, /overflow-y: auto/);
  assert.match(html, /overflow-x: auto/);
  assert.match(html, /white-space: pre-wrap/);
  assert.match(html, /word-break: break-word/);
  assert.match(html, /Ejecutar agente/);
});

test('agent detail downloadable reports use docx instead of markdown files', () => {
  const html = renderAgentDetailView(buildProfile({
    io: {
      inputMode: 'text',
      outputMode: 'screen_and_download',
      responsePreset: 'qa_standard',
      outputFields: ['summary', 'risks', 'recommendations']
    },
    interaction: {
      acceptedInputTypes: ['text'],
      downloadableOutput: true,
      outputFileNamePattern: '<agent-id>-report-<timestamp>.md',
      instructions: 'Ingresa evidencia QA.'
    }
  }));

  assert.match(html, /Descargar reporte/);
  assert.match(html, /buildReportDocxBlob/);
  assert.match(html, /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
  assert.match(html, /word\/document\.xml/);
  assert.match(html, /link\.download = reportFileName\(\)/);
  assert.match(html, /return withoutExtension \+ '.docx'/);
  assert.doesNotMatch(html, /text\/markdown/);
  assert.doesNotMatch(html, /new Blob\(\[buildReportMarkdown\(lastRunResult\)\]/);
});

test('agent detail includes safe blocked-state rendering without relying on LLM output', () => {
  const html = renderAgentDetailView(buildProfile());

  assert.match(html, /Solicitud bloqueada/);
  assert.match(html, /posibles datos sensibles, credenciales, tokens, datos financieros o información personal y no fue enviada al LLM/);
  assert.match(html, /CUENTA_REMOVIDA/);
  assert.match(html, /TARJETA_REMOVIDA/);
  assert.match(html, /TOKEN_REMOVIDO/);
  assert.match(html, /Hallazgos/);
  assert.match(html, /Recomendaciones/);
  assert.match(html, /payload\?\.status === 'BLOCKED'/);
});

test('agent edit keeps functional input and output configuration fields', () => {
  const html = renderAgentEditView(buildProfile());

  assert.match(html, new RegExp(hiddenInputModeLabel));
  assert.match(html, new RegExp(hiddenOutputModeLabel));
  assert.match(html, new RegExp(responsePresetLabel));
  assert.match(html, /Configuración de respuesta LLM/);
  assert.match(html, /Capacidades/);
  assert.match(html, /Descripción/);
});

test('agent detail hides execution metadata and keeps capabilities plus LLM settings', () => {
  const html = renderAgentDetailView(buildProfile());

  assert.doesNotMatch(html, new RegExp(`<h[1-6][^>]*>${hiddenExecutionTitle}</h[1-6]>`));
  assert.doesNotMatch(html, /enabled:/);
  assert.doesNotMatch(html, /runtimeEndpoint/);
  assert.doesNotMatch(html, /endpoint:/);
  assert.doesNotMatch(html, /runtime-disabled/);

  assert.match(html, /agent-detail-grid/);
  assert.match(html, /Capacidades/);
  assert.match(html, /Configuración de respuesta LLM/);
  assert.match(html, /Nivel de detalle/);
  assert.match(html, /Máximo tokens respuesta/);
  assert.match(html, /Temperatura/);
  assert.match(html, /Presupuesto mensual aplicado/);
  assert.match(html, /Bloqueo si excede presupuesto/);
  assert.match(html, /Para modificar estos valores usa Editar agente/);
  assert.match(html, /Ejecutar agente/);
});

test('agent detail renders action buttons in header without the old actions card', () => {
  const html = renderAgentDetailView(buildProfile());

  assert.doesNotMatch(html, new RegExp(hiddenActionsCardTitle));
  assert.doesNotMatch(html, new RegExp(hiddenActionsCardNote));

  assert.equal(countMatches(html, />Editar agente</g), 1);
  assert.equal(countMatches(html, />\s*Activar agente/g), 1);
  assert.equal(countMatches(html, />Eliminar agente</g), 1);
  assert.match(html, /agent-header-controls/);
  assert.match(html, /Estado: Borrador/);
});

test('agent detail keeps deactivate action for active agents without duplicating buttons', () => {
  const html = renderAgentDetailView(buildProfile({
    status: 'active',
    statusLabel: 'Activo'
  }));

  assert.equal(countMatches(html, />Editar agente</g), 1);
  assert.equal(countMatches(html, />\s*Desactivar agente/g), 1);
  assert.equal(countMatches(html, />Eliminar agente</g), 1);
  assert.doesNotMatch(html, />\s*Activar agente/g);
  assert.match(html, /Estado: Activo/);
});

test('agent creation and edit views do not expose governance as an editable or informational section', () => {
  const builderHtml = renderAgentBuilderView();
  const editHtml = renderAgentEditView(buildProfile());

  for (const html of [builderHtml, editHtml]) {
    assert.doesNotMatch(html, new RegExp(hiddenSectionTitle));
    assert.doesNotMatch(html, new RegExp(hiddenInternalNote));
    assert.doesNotMatch(html, new RegExp(hiddenEditableNote));
    assert.doesNotMatch(html, /name="governance"/);
    assert.doesNotMatch(html, /id="governance"/);
  }
});

test('agent creation and edit views do not expose technical contracts as editable or informational sections', () => {
  const builderHtml = renderAgentBuilderView();
  const editHtml = renderAgentEditView(buildProfile());

  for (const html of [builderHtml, editHtml]) {
    assert.doesNotMatch(html, new RegExp(hiddenInputContractTitle));
    assert.doesNotMatch(html, new RegExp(hiddenOutputSchemaTitle));
    assert.doesNotMatch(html, new RegExp(hiddenInputContractNote));
    assert.doesNotMatch(html, new RegExp(hiddenOutputSchemaNote));
    assert.doesNotMatch(html, /name="inputContract"/);
    assert.doesNotMatch(html, /id="inputContract"/);
    assert.doesNotMatch(html, /name="outputSchema"/);
    assert.doesNotMatch(html, /id="outputSchema"/);
  }
});

test('settings view exposes LLM model selector and keeps apiKey input empty', () => {
  const html = renderSettingsView();

  assert.match(html, /Proveedor LLM/);
  assert.match(html, /Modelo LLM/);
  assert.match(html, /id="model"/);
  assert.match(html, /Nombre visible del LLM/);
  assert.match(html, /Ingresa una nueva API key solo si quieres reemplazarla/);
  assert.match(html, /La API key no se carga completa en pantalla por seguridad/);
  assert.match(html, /document\.getElementById\('apiKey'\)\.value = ''/);
  assert.match(html, /apiKeyMasked/);
  assert.doesNotMatch(html, /value="sk-/);
});
