import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInputContractFromIO,
  buildOutputSchemaFromIO,
  normalizeAgentIO
} from '../../src/agents/shared/contracts.js';
import {
  DEFAULT_AGENT_CAPABILITIES,
  normalizeAgentCapabilities
} from '../../src/agents/shared/agent-defaults.js';
import {
  DEFAULT_AGENT_LLM_SETTINGS,
  buildAgentLlmSettingsFromInput,
  validateAgentLlmSettings
} from '../../src/agents/shared/llm-settings.js';
import {
  buildDefaultContractMarkdown,
  buildDefaultPromptMarkdown,
  buildDefaultReadinessChecklistMarkdown,
  buildDefaultSkillMarkdown
} from '../../src/agent-builder/agent-builder.service.js';
import { containsForbiddenAgentGeneratedContent } from '../../src/agent-builder/agent-content-policy.js';

test('builds standard text input contract from functional IO', () => {
  const contract = buildInputContractFromIO({
    inputMode: 'text',
    outputMode: 'screen',
    outputFields: ['summary']
  });

  assert.deepEqual(contract.required, ['text']);
  assert.deepEqual(contract.requiredAnyOf, []);
  assert.equal(contract.disallowUnknownFields, true);
  assert.equal(contract.fields.text.type, 'string');
});

test('builds file input contract from functional IO', () => {
  const contract = buildInputContractFromIO({
    inputMode: 'file',
    outputMode: 'download',
    outputFields: ['summary']
  });

  assert.deepEqual(contract.required, ['file']);
  assert.equal(contract.fields.file.type, 'object');
  assert.equal(contract.disallowUnknownFields, true);
});

test('builds text and file input contract from functional IO', () => {
  const contract = buildInputContractFromIO({
    inputMode: 'text_and_file',
    outputMode: 'screen_and_download',
    outputFields: ['summary']
  });

  assert.deepEqual(contract.required, []);
  assert.deepEqual(contract.requiredAnyOf, ['text', 'file']);
  assert.equal(contract.fields.text.type, 'string');
  assert.equal(contract.fields.file.type, 'object');
});

test('normalizes output schema fields with safe defaults', () => {
  const schema = buildOutputSchemaFromIO({
    inputMode: 'text',
    outputMode: 'screen',
    responsePreset: 'custom',
    outputFields: ['summary', 'unknown', 'risks']
  });

  assert.deepEqual(schema.fields, ['summary', 'risks']);

  const fallback = buildOutputSchemaFromIO({
    inputMode: 'text',
    outputMode: 'screen',
    outputFields: []
  });
  assert.deepEqual(fallback.fields, ['summary', 'data', 'risks', 'recommendations', 'openQuestions']);
});

test('resolves preset output fields without requiring checkboxes', () => {
  const schema = buildOutputSchemaFromIO({
    inputMode: 'text',
    outputMode: 'screen',
    responsePreset: 'executive_report',
    outputFields: []
  });

  assert.deepEqual(schema.fields, ['summary', 'executiveReport', 'risks', 'recommendations', 'openQuestions']);
});

test('maps legacy interaction values into functional IO', () => {
  const io = normalizeAgentIO({
    inputMode: 'text-and-file',
    outputMode: 'screen-and-download',
    responsePreset: 'qa_acceptance_and_scenarios',
    outputFields: ['summary']
  });

  assert.equal(io.inputMode, 'text_and_file');
  assert.equal(io.outputMode, 'screen_and_download');
  assert.equal(io.responsePreset, 'qa_acceptance_and_scenarios');
});

test('agent LLM settings default to high quality values', () => {
  const settings = buildAgentLlmSettingsFromInput({}, []);

  assert.equal(DEFAULT_AGENT_LLM_SETTINGS.responseDetailLevel, 'extensive');
  assert.equal(settings.responseDetailLevel, 'extensive');
  assert.equal(settings.maxOutputTokens, 5000);
  assert.equal(settings.temperature, 0.1);
});

test('agent LLM settings validate token boundaries', () => {
  const okErrors = [];
  const valid = validateAgentLlmSettings({
    responseDetailLevel: 'extensive',
    maxOutputTokens: 5000,
    temperature: 0.1
  }, okErrors);

  const badErrors = [];
  validateAgentLlmSettings({
    maxOutputTokens: 9000,
    temperature: 1.2
  }, badErrors);

  assert.deepEqual(okErrors, []);
  assert.equal(valid.maxOutputTokens, 5000);
  assert.ok(badErrors.includes('maxOutputTokens debe estar entre 300 y 8000.'));
  assert.ok(badErrors.includes('temperature debe estar entre 0 y 1.'));
});

test('agent capabilities default to robust QA specialist capabilities', () => {
  const capabilities = normalizeAgentCapabilities([]);

  assert.equal(DEFAULT_AGENT_CAPABILITIES.length >= 8, true);
  assert.equal(capabilities.length >= 8, true);
  assert.ok(capabilities.includes('Analizar información funcional, técnica o de negocio con enfoque QA'));
});

test('agent capabilities preserve valid suggested capabilities and complement weak lists', () => {
  const suggested = normalizeAgentCapabilities([
    'Analizar reglas de negocio complejas con enfoque QA',
    'Diseñar pruebas funcionales trazables para flujos críticos',
    'Identificar riesgos operativos con impacto en calidad',
    'Redactar recomendaciones accionables para equipos QA',
    'Formular preguntas abiertas para aclarar ambigüedades'
  ]);
  const weak = normalizeAgentCapabilities(['QA']);

  assert.equal(suggested.length, 5);
  assert.equal(weak.length >= 8, true);
  assert.ok(weak.includes('Analizar información funcional, técnica o de negocio con enfoque QA'));
});

test('agent builder internal markdown defaults are generated safely', () => {
  const io = {
    inputMode: 'text',
    outputMode: 'screen',
    responsePreset: 'qa_standard',
    outputFields: ['summary', 'risks']
  };
  const inputContract = buildInputContractFromIO(io);
  const outputSchema = buildOutputSchemaFromIO(io);
  const common = {
    name: 'QA Demo',
    description: 'Agente QA para validar flujos funcionales críticos.',
    role: 'Analista QA funcional especialista',
    capabilities: DEFAULT_AGENT_CAPABILITIES,
    useCases: ['Analizar requerimientos', 'Generar escenarios'],
    io,
    llmSettings: DEFAULT_AGENT_LLM_SETTINGS
  };

  const skill = buildDefaultSkillMarkdown(common);
  const prompt = buildDefaultPromptMarkdown({ ...common, outputSchema });
  const contract = buildDefaultContractMarkdown({ ...common, inputContract, outputSchema });
  const checklist = buildDefaultReadinessChecklistMarkdown();

  assert.match(skill, /## Capacidades/);
  assert.match(prompt, /## Reglas de seguridad/);
  assert.match(contract, /## Estados/);
  assert.match(checklist, /Sanitización de inputs configurada/);
  assert.match(prompt, /Markdown limpio/);
  assert.equal(containsForbiddenAgentGeneratedContent(skill), false);
  assert.equal(containsForbiddenAgentGeneratedContent(prompt), false);
  assert.equal(containsForbiddenAgentGeneratedContent(contract), false);
  assert.equal(containsForbiddenAgentGeneratedContent(checklist), false);
});
