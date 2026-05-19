import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInputContractFromIO,
  buildOutputSchemaFromIO,
  normalizeAgentIO
} from '../../src/agents/shared/contracts.js';

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
