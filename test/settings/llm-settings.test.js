import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'qa-ia-platform-settings-'));
}

async function withTempCwd(run) {
  const previousCwd = process.cwd();
  const workspace = tempWorkspace();
  process.chdir(workspace);
  try {
    await run(workspace);
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}

async function importSettingsService() {
  return import(`../../src/settings/platform-settings.service.js?test=${Date.now()}-${Math.random()}`);
}

async function importLlmClient() {
  return import(`../../src/llm/llm.client.js?test=${Date.now()}-${Math.random()}`);
}

test('/settings/config public settings expose model and never expose full apiKey', async () => {
  await withTempCwd(async () => {
    const {
      getPlatformSettings,
      saveLlmSettings
    } = await importSettingsService();

    const result = saveLlmSettings({
      provider: 'claude',
      displayName: 'Claude QA',
      model: 'claude-3-5-haiku-latest',
      apiKey: 'sk-ant-realistic-valid-key-for-tests'
    });

    assert.equal(result.status, 'LLM_SETTINGS_SAVED');
    const config = getPlatformSettings();

    assert.equal(config.llm.provider, 'claude');
    assert.equal(config.llm.displayName, 'Claude QA');
    assert.equal(config.llm.model, 'claude-3-5-haiku-latest');
    assert.equal(config.llm.apiKeyConfigured, true);
    assert.equal(config.llm.apiKeyMasked, 'sk-a...ests');
    assert.equal(config.llm.apiKeyPreview, 'sk-a...ests');
    assert.equal('apiKey' in config.llm, false);
    assert.equal(JSON.stringify(config).includes('sk-ant-realistic-valid-key-for-tests'), false);
  });
});

test('saving LLM settings with empty apiKey preserves existing configured key', async () => {
  await withTempCwd(async () => {
    const {
      getLlmRuntimeSettings,
      saveLlmSettings
    } = await importSettingsService();

    saveLlmSettings({
      provider: 'claude',
      displayName: 'Claude QA',
      model: 'claude-3-5-sonnet-latest',
      apiKey: 'sk-ant-persisted-valid-key'
    });
    const result = saveLlmSettings({
      provider: 'claude',
      displayName: 'Claude QA Updated',
      model: 'claude-3-5-haiku-latest',
      apiKey: ''
    });
    const runtime = getLlmRuntimeSettings();

    assert.equal(result.status, 'LLM_SETTINGS_SAVED');
    assert.equal(runtime.apiKey, 'sk-ant-persisted-valid-key');
    assert.equal(runtime.displayName, 'Claude QA Updated');
    assert.equal(runtime.model, 'claude-3-5-haiku-latest');
  });
});

test('saving LLM settings rejects missing model', async () => {
  await withTempCwd(async () => {
    const { saveLlmSettings } = await importSettingsService();
    const result = saveLlmSettings({
      provider: 'claude',
      displayName: 'Claude QA',
      model: '',
      apiKey: ''
    });

    assert.equal(result.status, 'SETTINGS_VALIDATION_ERROR');
    assert.ok(result.errors.some((error) => /model/i.test(error)));
  });
});

test('runtime settings use configured model and fallback model', async () => {
  await withTempCwd(async () => {
    const {
      getLlmRuntimeSettings,
      saveLlmSettings
    } = await importSettingsService();

    assert.equal(getLlmRuntimeSettings().model, 'claude-3-5-sonnet-latest');

    saveLlmSettings({
      provider: 'claude',
      displayName: 'Claude QA',
      model: 'claude-3-5-haiku-latest',
      apiKey: 'sk-ant-model-valid-key'
    });

    assert.equal(getLlmRuntimeSettings().model, 'claude-3-5-haiku-latest');
  });
});

test('callLlm passes configured model to Claude client', async () => {
  await withTempCwd(async () => {
    const { saveLlmSettings } = await importSettingsService();
    saveLlmSettings({
      provider: 'claude',
      displayName: 'Claude QA',
      model: 'claude-3-5-haiku-latest',
      apiKey: 'sk-ant-runtime-model-valid-key'
    });

    const originalFetch = globalThis.fetch;
    let requestBody = null;
    globalThis.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Respuesta mock.' }],
          usage: { input_tokens: 1, output_tokens: 2 }
        })
      };
    };

    try {
      const { callLlm } = await importLlmClient();
      const result = await callLlm({
        instruction: 'Instrucción segura.',
        text: 'Texto seguro.',
        maxTokens: 300,
        temperature: 0.1
      });

      assert.equal(result.text, 'Respuesta mock.');
      assert.equal(requestBody.model, 'claude-3-5-haiku-latest');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
