import { callClaude } from './claude.client.js';
import { getLlmRuntimeSettings } from '../settings/platform-settings.service.js';

function createLlmError(message, code, statusCode = 400) {
  return Object.assign(new Error(message), {
    code,
    statusCode
  });
}

export async function callLlm({ instruction, text, maxTokens, temperature } = {}) {
  const settings = getLlmRuntimeSettings();
  const provider = settings.provider || 'claude';

  if (!settings.apiKeyConfigured || !settings.apiKey) {
    throw createLlmError(
      'No hay una API key válida configurada para el LLM.',
      'LLM_API_KEY_NOT_CONFIGURED',
      400
    );
  }

  if (provider !== 'claude') {
    throw createLlmError(
      `El proveedor LLM "${provider}" todavía no tiene cliente runtime configurado.`,
      'LLM_PROVIDER_NOT_CONFIGURED',
      400
    );
  }

  return callClaude({
    instruction,
    text,
    apiKey: settings.apiKey,
    maxTokens,
    temperature
  });
}
