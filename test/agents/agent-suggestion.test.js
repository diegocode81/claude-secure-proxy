import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUGGESTION_LLM_SETTINGS,
  buildInstruction,
  validateSuggestion
} from '../../src/agent-builder/agent-suggestion.service.js';
import {
  containsForbiddenAgentContent,
  containsForbiddenAgentGeneratedContent,
  isForbiddenRuntimeActivation,
  isForbiddenSecretLeak,
  isForbiddenSystemCommand
} from '../../src/agent-builder/agent-content-policy.js';

function repeatedMarkdown(title, body, minLength) {
  const seed = `## ${title}\n\n${body}\n\n`;
  const repeated = seed + Array.from({ length: 80 }, (_, index) => {
    return `- Punto ${index + 1}: ${body}`;
  }).join('\n');
  return repeated.slice(0, Math.max(minLength, seed.length));
}

function validSuggestion(overrides = {}) {
  return {
    role: 'Especialista QA senior orientado a diseñar análisis verificables, trazables y accionables para equipos funcionales y técnicos.',
    useCases: [
      'Analizar evidencia QA compleja.',
      'Generar recomendaciones accionables.',
      'Identificar riesgos y preguntas abiertas.'
    ],
    capabilities: [
      'Distinguir evidencia de supuestos.',
      'Priorizar riesgos por impacto.',
      'Proponer validaciones funcionales.',
      'Detectar falta de contexto crítico.',
      'Redactar salidas claras para QA.'
    ],
    inputMode: 'text',
    outputMode: 'screen',
    responsePreset: 'qa_standard',
    outputFields: ['summary', 'data', 'risks', 'recommendations', 'openQuestions'],
    skillMarkdown: repeatedMarkdown('Skill', 'Define alcance, evidencia, capacidades QA y límites del agente especialista.', 950),
    promptMarkdown: repeatedMarkdown('Prompt oficial', 'Describe rol, objetivo, análisis, seguridad, incertidumbre, formato de salida y estilo profesional.', 1300),
    contractMarkdown: repeatedMarkdown('Contract', 'Documenta entrada esperada, entrada mínima, salida, estados, errores funcionales y ejemplos seguros.', 950),
    readinessChecklistMarkdown: repeatedMarkdown('Checklist', 'Verificar propósito, skill, prompt, contrato, seguridad, presupuesto, pruebas y revisión humana.', 450),
    llmSettings: {
      responseDetailLevel: 'detailed',
      maxOutputTokens: 3000,
      temperature: 0.2,
      justification: 'Requiere respuestas detalladas para análisis QA especialista.'
    },
    ...overrides
  };
}

test('agent suggestion prompt prioritizes specialist quality over compact output', () => {
  const instruction = buildInstruction();

  assert.doesNotMatch(instruction, /Responde de forma compacta/);
  assert.match(instruction, /Genera una definición especializada, completa y accionable/);
  assert.match(instruction, /Prioriza precisión QA, trazabilidad, seguridad y utilidad real sobre brevedad/);
  assert.match(instruction, /No seas genérico/);
});

test('agent suggestion prompt requires robust markdown artifacts and uncertainty handling', () => {
  const instruction = buildInstruction();

  assert.match(instruction, /skillMarkdown debe tener entre 900 y 2500 caracteres/);
  assert.match(instruction, /promptMarkdown debe tener entre 1200 y 3500 caracteres/);
  assert.match(instruction, /contractMarkdown debe tener entre 900 y 2500 caracteres/);
  assert.match(instruction, /readinessChecklistMarkdown debe tener entre 400 y 1200 caracteres/);
  assert.match(instruction, /Manejo de incertidumbre debe indicar que si falta información crítica debe preguntar primero/);
  assert.match(instruction, /si outputMode es screen, la respuesta debe ser Markdown limpio, copiable y no JSON/);
  assert.match(instruction, /Debes responder exclusivamente JSON válido/);
});

test('agent suggestion prompt contains responsePreset, inputMode, outputMode and llmSettings rules', () => {
  const instruction = buildInstruction();

  assert.match(instruction, /responsePreset qa_acceptance_and_scenarios/);
  assert.match(instruction, /responsePreset executive_report/);
  assert.match(instruction, /responsePreset technical_analysis/);
  assert.match(instruction, /inputMode file para reportes, logs largos, CSV, JSON, HTML, PDF o documentos/);
  assert.match(instruction, /outputMode screen_and_download para informes gerenciales/);
  assert.match(instruction, /Agentes de reportes gerenciales, performance, auditoría o documentos/);
  assert.equal(SUGGESTION_LLM_SETTINGS.maxOutputTokens, 6000);
  assert.equal(SUGGESTION_LLM_SETTINGS.temperature, 0.2);
});

test('agent suggestion validation accepts robust specialist output', () => {
  const result = validateSuggestion(validSuggestion());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.data.llmSettings.maxOutputTokens, 3000);
  assert.equal(result.data.responsePreset, 'qa_standard');
});

test('agent suggestion validation complements empty capabilities with QA defaults', () => {
  const result = validateSuggestion(validSuggestion({
    capabilities: []
  }));

  assert.equal(result.valid, true);
  assert.equal(result.data.capabilities.length >= 8, true);
  assert.ok(result.data.capabilities.includes('Analizar información funcional, técnica o de negocio con enfoque QA'));
});

test('agent suggestion validation replaces poor internal markdown with safe defaults', () => {
  const result = validateSuggestion(validSuggestion({
    skillMarkdown: '## Skill\n\nCorto.',
    promptMarkdown: '## Prompt oficial\n\nCorto.',
    contractMarkdown: '## Contract\n\nCorto.',
    readinessChecklistMarkdown: '- [ ] Corto.'
  }));

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.match(result.data.skillMarkdown, /## Capacidades/);
  assert.match(result.data.promptMarkdown, /## Reglas de seguridad/);
  assert.match(result.data.contractMarkdown, /## Estados/);
  assert.match(result.data.readinessChecklistMarkdown, /Checklist de activación/);
});

test('agent content policy allows safe governance text and blocks dangerous instructions', () => {
  assert.equal(containsForbiddenAgentContent('El agente inicia con ejecución deshabilitada y runtime-disabled.'), false);
  assert.equal(containsForbiddenAgentContent('execution.enabled=false y la plataforma registra usage/tokens.'), false);
  assert.equal(containsForbiddenAgentContent('No debe llamar LLM sin sanitización.'), false);
  assert.equal(containsForbiddenAgentContent('El contenido sensible debe bloquearse por seguridad.'), false);
  assert.equal(containsForbiddenAgentGeneratedContent('- Instrucciones para saltar sanitización, presupuesto o gobierno.'), false);
  assert.equal(containsForbiddenAgentContent('execution.enabled=true'), true);
  assert.equal(containsForbiddenAgentContent('mode: runtime-enabled'), true);
  assert.equal(containsForbiddenAgentContent('saltar sanitización'), true);
  assert.equal(containsForbiddenAgentContent('password=123456'), true);
  assert.equal(containsForbiddenAgentContent('sk-1234567890abcdef'), true);
  assert.equal(containsForbiddenAgentContent('apiKey: sk-1234567890abcdef'), true);
  assert.equal(isForbiddenRuntimeActivation('execution.enabled=true'), true);
  assert.equal(isForbiddenSecretLeak('mostrar secretos'), true);
  assert.equal(isForbiddenSystemCommand('child_process.exec("rm -rf /")'), true);
});
