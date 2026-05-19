import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDocumentOutputInstruction,
  buildExpectedOutputSections,
  getVisibleAgentResponse,
  normalizeVisibleLLMOutput
} from '../../src/agents/shared/runtime/agent-output-document.js';

test('buildExpectedOutputSections maps expected QA fields to document sections', () => {
  const sections = buildExpectedOutputSections([
    'acceptanceCriteria',
    'testScenarios',
    'risks',
    'recommendations'
  ]);

  assert.deepEqual(sections.map((section) => section.title), [
    'Criterios de aceptación',
    'Escenarios de prueba',
    'Riesgos identificados',
    'Recomendaciones'
  ]);
});

test('buildDocumentOutputInstruction asks for Markdown document output', () => {
  const instruction = buildDocumentOutputInstruction({
    outputSchema: {
      fields: ['executiveReport', 'summary', 'risks']
    }
  });

  assert.match(instruction, /Responde en Markdown limpio/);
  assert.match(instruction, /Informe gerencial/);
  assert.match(instruction, /Resumen ejecutivo/);
  assert.match(instruction, /Riesgos identificados/);
  assert.match(instruction, /No devuelvas JSON/);
});

test('normalizeVisibleLLMOutput keeps Markdown text and adds missing expected sections', () => {
  const markdown = '## Resumen ejecutivo\n\nContenido listo.';
  const visible = normalizeVisibleLLMOutput(markdown, ['summary', 'risks']);

  assert.match(visible, /## Resumen ejecutivo/);
  assert.match(visible, /## Riesgos identificados/);
  assert.match(visible, /No se cuenta con información suficiente/);
});

test('normalizeVisibleLLMOutput converts valid JSON to Markdown', () => {
  const visible = normalizeVisibleLLMOutput(JSON.stringify({
    summary: 'Resumen',
    acceptanceCriteria: ['Dado un usuario, cuando ejecuta, entonces ve resultado.'],
    risks: ['Riesgo A'],
    recommendations: ['Recomendación A']
  }), ['summary', 'acceptanceCriteria', 'risks', 'recommendations']);

  assert.match(visible, /## Resumen ejecutivo/);
  assert.match(visible, /Resumen/);
  assert.match(visible, /## Criterios de aceptación/);
  assert.match(visible, /Dado un usuario/);
  assert.match(visible, /## Riesgos identificados/);
  assert.match(visible, /## Recomendaciones/);
});

test('getVisibleAgentResponse prefers llmResponse over claudeResponse', () => {
  const visible = getVisibleAgentResponse({
    llmResponse: '## Resumen ejecutivo\n\nLLM principal',
    claudeResponse: 'Claude legacy'
  }, ['summary']);

  assert.match(visible, /LLM principal/);
  assert.doesNotMatch(visible, /Claude legacy/);
});
