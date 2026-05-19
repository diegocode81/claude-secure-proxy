import assert from 'node:assert/strict';
import test from 'node:test';
import { qaLogAnalystProfile } from '../../src/agents/qa-log-analyst/profile.js';
import { createAgentResponse } from '../../src/agents/shared/runtime/agent-response.js';
import { buildPromptWithAgent } from '../../src/agents/shared/runtime/prompt.js';
import {
  validateAgentInputSchema,
  validateAgentRunRequest
} from '../../src/agents/shared/runtime/validation.js';

const textModeAgentProfile = {
  id: 'qa-dynamic-text',
  name: 'QA Dynamic Text',
  description: 'Agente dinámico de texto para pruebas.',
  execution: {
    enabled: true,
    mode: 'runtime-enabled'
  },
  interaction: {
    inputMode: 'text',
    acceptedInputTypes: ['text'],
    outputMode: 'screen'
  },
  inputContract: {
    required: ['contenido'],
    requiredAnyOf: [['criteriosAceptacion', 'contextoUso']],
    optional: ['audienciaObjetivo'],
    disallowUnknownFields: true
  },
  outputSchema: {
    fields: ['summary', 'data', 'risks', 'recommendations', 'openQuestions']
  }
};

function validateRunBody(body) {
  const baseValidation = validateAgentRunRequest(body);
  if (!baseValidation.valid) {
    return baseValidation;
  }

  return validateAgentInputSchema(qaLogAnalystProfile, baseValidation.input);
}

test('agent run request accepts a normalized input object', () => {
  const result = validateAgentRunRequest({ input: {} });

  assert.equal(result.valid, true);
  assert.deepEqual(result.input, {});
  assert.deepEqual(result.receivedInputKeys, []);
});

test('agent run request rejects missing input', () => {
  const result = validateAgentRunRequest({ errorText: 'NullPointerException' });

  assert.equal(result.valid, false);
  assert.equal(result.error, 'Request body must include an "input" object.');
  assert.deepEqual(result.receivedInputKeys, ['errorText']);
});

test('agent run request rejects input that is not an object', () => {
  const result = validateAgentRunRequest({ input: [] });

  assert.equal(result.valid, false);
  assert.equal(result.error, 'Request body must include an "input" object.');
  assert.deepEqual(result.receivedInputKeys, ['input']);
});

test('qa-log-analyst accepts input with errorText only', () => {
  const result = validateRunBody({
    input: {
      errorText: 'NullPointerException'
    }
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.receivedInputKeys, ['errorText']);
});

test('qa-log-analyst accepts input with logText only', () => {
  const result = validateRunBody({
    input: {
      logText: 'ERROR timeout calling customer service'
    }
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.receivedInputKeys, ['logText']);
});

test('qa-log-analyst rejects input with unknown field only', () => {
  const result = validateRunBody({
    input: {
      foo: 'bar'
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.warnings, []);
  assert.ok(result.errors.includes('Field "foo" is not declared in the agent input contract.'));
  assert.ok(result.errors.includes('At least one of these fields is required: errorText, logText.'));
});

test('qa-log-analyst rejects input with valid field plus unknown field', () => {
  const result = validateRunBody({
    input: {
      errorText: 'x',
      foo: 'bar'
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.errors, [
    'Field "foo" is not declared in the agent input contract.'
  ]);
});

test('standard disabled runtime response keeps sentToClaude false', () => {
  const response = createAgentResponse({
    agentId: qaLogAnalystProfile.id,
    status: 'AGENT_EXECUTION_DISABLED',
    sentToClaude: false,
    summary: 'Agent runtime execution is disabled. Use legacy endpoints.',
    data: {
      mode: 'agent-run-disabled',
      agentName: qaLogAnalystProfile.name,
      execution: qaLogAnalystProfile.execution,
      receivedInputKeys: ['errorText'],
      inputWarnings: []
    },
    recommendations: [
      'Use legacy endpoints until runtime execution is enabled.'
    ]
  });

  assert.equal(response.agentId, 'qa-log-analyst');
  assert.equal(response.status, 'AGENT_EXECUTION_DISABLED');
  assert.equal(response.sentToClaude, false);
  assert.equal(response.rawModelText, '');
  assert.deepEqual(response.risks, []);
  assert.deepEqual(response.data.inputWarnings, []);
});

test('dynamic text agent accepts input.text even when legacy contract is inconsistent', () => {
  const result = validateAgentInputSchema(textModeAgentProfile, {
    text: 'Texto de prueba'
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.allowedFields, ['text', 'context']);
  assert.deepEqual(result.receivedInputKeys, ['text']);
});

test('dynamic text agent rejects missing text with a clear message', () => {
  const result = validateAgentInputSchema(textModeAgentProfile, {});

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Ingresa un texto para que el agente pueda analizarlo.'));
});

test('dynamic text agent rejects unknown fields without leaking advanced contract errors', () => {
  const result = validateAgentInputSchema(textModeAgentProfile, {
    foo: 'bar'
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('El campo "foo" no está permitido para este agente.'));
  assert.ok(result.errors.includes('Ingresa un texto para que el agente pueda analizarlo.'));
  assert.equal(result.errors.some((error) => error.includes('criteriosAceptacion')), false);
  assert.equal(result.errors.some((error) => error.includes('contextoUso')), false);
});

test('generic runtime prompt for text mode uses input.text as main content', () => {
  const prompt = buildPromptWithAgent(textModeAgentProfile, {
    text: 'Texto de prueba'
  });

  assert.equal(prompt.text, 'Texto de prueba');
  assert.match(prompt.instruction, /QA Dynamic Text/);
});
