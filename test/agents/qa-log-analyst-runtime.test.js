import assert from 'node:assert/strict';
import test from 'node:test';
import { qaLogAnalystProfile } from '../../src/agents/qa-log-analyst/profile.js';
import { createAgentResponse } from '../../src/agents/shared/runtime/agent-response.js';
import {
  validateAgentInputSchema,
  validateAgentRunRequest
} from '../../src/agents/shared/runtime/validation.js';

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
