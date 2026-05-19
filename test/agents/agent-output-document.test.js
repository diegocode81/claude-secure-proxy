import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDocumentOutputInstruction,
  buildExpectedOutputSections,
  buildMissingContextInstruction,
  getVisibleAgentResponse,
  isClarificationFirstResponse,
  isPlaceholderInsufficientInfo,
  removeEmptyOrPlaceholderSections,
  normalizeVisibleLLMOutput
} from '../../src/agents/shared/runtime/agent-output-document.js';
import { buildPromptWithAgent } from '../../src/agents/shared/runtime/prompt.js';

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

test('buildDocumentOutputInstruction includes ask-first rule for missing context', () => {
  const instruction = buildDocumentOutputInstruction({
    interaction: {
      outputMode: 'screen'
    },
    outputSchema: {
      fields: ['executiveReport', 'acceptanceCriteria', 'openQuestions']
    }
  });

  assert.match(instruction, /Si falta contexto crítico, pregunta primero/);
  assert.match(instruction, /Necesito más información/);
  assert.match(instruction, /máximo 5 preguntas concretas y accionables/);
  assert.match(instruction, /no generes un informe completo todavía/i);
});

test('generic runtime prompt includes missing-context rule without requiring a full report first', () => {
  const prompt = buildPromptWithAgent({
    id: 'qa-test',
    name: 'QA Test',
    description: 'Agente QA de prueba.',
    execution: {
      enabled: true,
      mode: 'runtime-enabled'
    },
    interaction: {
      inputMode: 'text',
      outputMode: 'screen'
    },
    outputSchema: {
      fields: ['executiveReport', 'acceptanceCriteria', 'openQuestions']
    }
  }, {
    text: 'Necesito una recomendación.'
  });

  assert.match(prompt.instruction, /Regla de contexto insuficiente/);
  assert.match(prompt.instruction, /Primero responde con una sección llamada "Necesito más información" o "Preguntas abiertas"/);
  assert.match(prompt.instruction, /no generes un informe completo todavía/i);
  assert.match(prompt.instruction, /Responde en Markdown limpio/);
});

test('normalizeVisibleLLMOutput keeps Markdown text and adds missing expected sections', () => {
  const markdown = '## Resumen ejecutivo\n\nContenido listo.';
  const visible = normalizeVisibleLLMOutput(markdown, ['summary', 'risks']);

  assert.match(visible, /## Resumen ejecutivo/);
  assert.match(visible, /## Riesgos identificados/);
  assert.match(visible, /Se recomienda proporcionar más contexto específico/);
});

test('normalizeVisibleLLMOutput removes generic open questions without real questions', () => {
  const visible = normalizeVisibleLLMOutput([
    '## Resumen ejecutivo',
    '',
    'Contenido preliminar.',
    '',
    '## Preguntas abiertas',
    '',
    'No se cuenta con información suficiente para determinarlo.'
  ].join('\n'), ['summary', 'openQuestions']);

  assert.match(visible, /## Resumen ejecutivo/);
  assert.doesNotMatch(visible, /## Preguntas abiertas\s+No se cuenta con información suficiente/is);
});

test('removeEmptyOrPlaceholderSections keeps clarification content and removes empty report sections', () => {
  const visible = removeEmptyOrPlaceholderSections([
    '## Necesito más información',
    '',
    '- ¿Quién será la audiencia principal?',
    '- ¿Cuál es el objetivo del análisis?',
    '',
    '## Análisis preliminar',
    '',
    'Con la información actual solo se puede validar que falta audiencia, tono y objetivo.',
    '',
    '## Informe gerencial',
    '',
    'No se cuenta con información suficiente para determinarlo.',
    '',
    '## Recomendaciones',
    '',
    'No se cuenta con información suficiente para determinarlo.'
  ].join('\n'));

  assert.match(visible, /## Necesito más información/);
  assert.match(visible, /¿Quién será la audiencia principal\?/);
  assert.match(visible, /## Análisis preliminar/);
  assert.doesNotMatch(visible, /## Informe gerencial/);
  assert.doesNotMatch(visible, /## Recomendaciones/);
});

test('removeEmptyOrPlaceholderSections preserves real open questions and removes placeholder open questions', () => {
  const withQuestions = removeEmptyOrPlaceholderSections([
    '## Preguntas abiertas',
    '',
    '- ¿Qué restricciones deben considerarse?',
    '- ¿Cuál es el alcance esperado?'
  ].join('\n'));

  const withPlaceholder = removeEmptyOrPlaceholderSections([
    '## Preguntas abiertas',
    '',
    'No se cuenta con información suficiente para determinarlo.'
  ].join('\n'));

  assert.match(withQuestions, /## Preguntas abiertas/);
  assert.match(withQuestions, /¿Qué restricciones deben considerarse\?/);
  assert.doesNotMatch(withPlaceholder, /## Preguntas abiertas/);
});

test('removeEmptyOrPlaceholderSections preserves useful preliminary analysis mentioning missing information', () => {
  const visible = removeEmptyOrPlaceholderSections([
    '## Análisis preliminar',
    '',
    'Con la información actual solo se puede validar que falta audiencia, tono y objetivo de la reunión.'
  ].join('\n'));

  assert.match(visible, /## Análisis preliminar/);
  assert.match(visible, /falta audiencia, tono y objetivo/);
});

test('removeEmptyOrPlaceholderSections preserves complete sections with real content', () => {
  const visible = removeEmptyOrPlaceholderSections([
    '## Riesgos identificados',
    '',
    '- Riesgo de regresión funcional en el flujo de pagos.',
    '',
    '## Recomendaciones',
    '',
    '- Ejecutar pruebas de humo antes del despliegue.'
  ].join('\n'));

  assert.match(visible, /## Riesgos identificados/);
  assert.match(visible, /Riesgo de regresión funcional/);
  assert.match(visible, /## Recomendaciones/);
});

test('normalizeVisibleLLMOutput does not add missing expected sections for clarification-first responses', () => {
  const visible = normalizeVisibleLLMOutput([
    '## Necesito más información',
    '',
    '- ¿Quién será la audiencia principal?',
    '- ¿Cuál es el objetivo del análisis?',
    '',
    '## Análisis preliminar',
    '',
    'Con la información actual solo se puede identificar que falta contexto de negocio.'
  ].join('\n'), ['executiveReport', 'summary', 'acceptanceCriteria', 'risks', 'recommendations']);

  assert.match(visible, /## Necesito más información/);
  assert.match(visible, /## Análisis preliminar/);
  assert.doesNotMatch(visible, /## Informe gerencial/);
  assert.doesNotMatch(visible, /## Criterios de aceptación/);
  assert.doesNotMatch(visible, /## Riesgos identificados/);
  assert.equal(isClarificationFirstResponse(visible), true);
});

test('isPlaceholderInsufficientInfo only matches pure placeholders', () => {
  assert.equal(isPlaceholderInsufficientInfo('No se cuenta con información suficiente para determinarlo.'), true);
  assert.equal(isPlaceholderInsufficientInfo('- Pendiente de información adicional.'), true);
  assert.equal(isPlaceholderInsufficientInfo('Con la información actual solo se puede validar que falta audiencia y tono.'), false);
});

test('normalizeVisibleLLMOutput keeps concrete open questions and limits JSON questions to five', () => {
  const visible = normalizeVisibleLLMOutput(JSON.stringify({
    openQuestions: [
      '¿Cuál es la audiencia principal?',
      '¿Cuál es el objetivo?',
      '¿Qué restricciones existen?',
      '¿Qué tono se espera?',
      '¿Qué temas deben evitarse?',
      '¿Cuál es la fecha límite?'
    ]
  }), ['openQuestions']);

  assert.match(visible, /## Preguntas abiertas/);
  assert.match(visible, /¿Cuál es la audiencia principal\?/);
  assert.doesNotMatch(visible, /¿Cuál es la fecha límite\?/);
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

test('buildMissingContextInstruction is reusable and avoids generic open-question placeholders', () => {
  const instruction = buildMissingContextInstruction();

  assert.match(instruction, /máximo 5 preguntas concretas y accionables/);
  assert.match(instruction, /La sección de preguntas abiertas siempre debe contener preguntas reales/);
});
