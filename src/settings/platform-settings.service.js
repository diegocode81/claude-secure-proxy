import fs from 'node:fs';
import path from 'node:path';
import { withRefresh } from '../platform/platform-refresh.service.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'platform-settings.json');

const ALLOWED_PROVIDERS = ['claude', 'gemini', 'deepseek', 'openai', 'local', 'other'];
const DEFAULT_LLM_MODELS = {
  claude: 'claude-3-5-sonnet-latest',
  gemini: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
  openai: 'gpt-4o',
  local: 'local-model',
  other: 'custom-model'
};
const LLM_MODEL_OPTIONS = {
  claude: [
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-opus-latest'
  ],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  openai: ['gpt-4o', 'gpt-4o-mini'],
  local: ['local-model'],
  other: ['custom-model']
};
const LLM_ENV_KEY_NAMES = ['LLM_API_KEY', 'ANTHROPIC_API_KEY', 'CLAUDE_API_KEY'];
const INVALID_LLM_KEY_MESSAGE = 'La API key del LLM no parece válida. No uses claves de prueba, placeholders ni valores enmascarados.';
const PROTECTED_PROXY_FIELDS = [
  'sanitizeEnabled',
  'secretBlockingEnabled',
  'budgetGuardEnabled',
  'protectedEndpoints',
  'blockedFindingTypes',
  'secret',
  'token',
  'password',
  'apiKey',
  'llmApiKey'
];
const PROXY_EDITABLE_FIELDS = [
  'publicBaseUrl',
  'port',
  'allowedOrigins',
  'maxRequestBodyKb',
  'maxContextChars'
];
const DEFAULT_PROXY_PROTECTIONS = {
  sanitizeEnabled: true,
  secretBlockingEnabled: true,
  budgetGuardEnabled: true,
  protectedEndpoints: ['/sanitize', '/analyze-error', '/analyze-error-context', '/agents/:agentId/run'],
  blockedFindingTypes: ['PASSWORD_ASSIGNMENT', 'SECRET_TOKEN', 'API_KEY', 'BEARER_TOKEN', 'PRIVATE_KEY', 'CREDENTIAL']
};

const DEFAULT_SETTINGS = {
  dashboard: {
    monthlyBudgetUsd: 80,
    alertThresholdUsd: 68
  },
  llm: {
    provider: 'claude',
    displayName: 'LLM actual',
    model: DEFAULT_LLM_MODELS.claude,
    apiKey: ''
  },
  proxy: {
    publicBaseUrl: 'http://localhost:3000',
    port: 3000,
    allowedOrigins: ['http://localhost:3000'],
    maxRequestBodyKb: 512,
    maxContextChars: 60000,
    ...DEFAULT_PROXY_PROTECTIONS
  },
  allowedProviders: ALLOWED_PROVIDERS
};

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function cloneDefaults() {
  const monthlyBudgetUsd = Number(process.env.MONTHLY_BUDGET_USD || DEFAULT_SETTINGS.dashboard.monthlyBudgetUsd);
  const alertPercent = Number(process.env.BUDGET_WARNING_PERCENT || 85);
  const alertThresholdUsd = Math.round(monthlyBudgetUsd * alertPercent) / 100;
  const defaults = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  defaults.dashboard.monthlyBudgetUsd = monthlyBudgetUsd;
  defaults.dashboard.alertThresholdUsd = alertThresholdUsd;
  defaults.proxy.port = Number(process.env.PORT || defaults.proxy.port);

  return defaults;
}

function normalizeMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeSettings(settings) {
  const defaults = cloneDefaults();
  const dashboard = settings?.dashboard || {};
  const llm = settings?.llm || {};
  const proxy = settings?.proxy || {};
  const monthlyBudgetUsd = Number(dashboard.monthlyBudgetUsd || defaults.dashboard.monthlyBudgetUsd);
  const fallbackAlertThresholdUsd = defaults.dashboard.alertThresholdUsd;
  const alertThresholdUsd = 'alertThresholdUsd' in dashboard
    ? Number(dashboard.alertThresholdUsd)
    : fallbackAlertThresholdUsd;

  const provider = ALLOWED_PROVIDERS.includes(llm.provider) ? llm.provider : defaults.llm.provider;

  return {
    dashboard: {
      monthlyBudgetUsd: normalizeMoney(monthlyBudgetUsd),
      alertThresholdUsd: normalizeMoney(alertThresholdUsd)
    },
    llm: {
      provider,
      displayName: typeof llm.displayName === 'string' && llm.displayName.trim()
        ? llm.displayName.trim()
        : defaults.llm.displayName,
      model: typeof llm.model === 'string' && llm.model.trim()
        ? llm.model.trim()
        : getDefaultLlmModelForProvider(provider),
      apiKey: typeof llm.apiKey === 'string' ? llm.apiKey : ''
    },
    proxy: {
      publicBaseUrl: typeof proxy.publicBaseUrl === 'string' && proxy.publicBaseUrl.trim()
        ? proxy.publicBaseUrl.trim()
        : defaults.proxy.publicBaseUrl,
      port: Number(proxy.port || defaults.proxy.port),
      allowedOrigins: Array.isArray(proxy.allowedOrigins) && proxy.allowedOrigins.length > 0
        ? proxy.allowedOrigins.map((origin) => String(origin).trim()).filter(Boolean)
        : defaults.proxy.allowedOrigins,
      maxRequestBodyKb: Number(proxy.maxRequestBodyKb || defaults.proxy.maxRequestBodyKb),
      maxContextChars: Number(proxy.maxContextChars || defaults.proxy.maxContextChars),
      ...DEFAULT_PROXY_PROTECTIONS
    },
    allowedProviders: ALLOWED_PROVIDERS,
    llmModelOptions: LLM_MODEL_OPTIONS
  };
}

function writeSettings(settings) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, `${JSON.stringify(normalizeSettings(settings), null, 2)}\n`);
}

function readRawSettings() {
  ensureDataDir();

  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaults = cloneDefaults();
    writeSettings(defaults);
    return defaults;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    const normalized = normalizeSettings(parsed);
    writeSettings(normalized);
    return normalized;
  } catch {
    const defaults = cloneDefaults();
    writeSettings(defaults);
    return defaults;
  }
}

function maskApiKey(apiKey) {
  if (!apiKey) {
    return '';
  }

  if (apiKey.length <= 8) {
    return `${apiKey.slice(0, 2)}...${apiKey.slice(-2)}`;
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

export function getDefaultLlmModelForProvider(provider) {
  return DEFAULT_LLM_MODELS[provider] || DEFAULT_LLM_MODELS.claude;
}

export function isValidConfiguredLlmApiKey(apiKey) {
  if (typeof apiKey !== 'string') {
    return false;
  }

  const normalized = apiKey.trim();
  const lower = normalized.toLowerCase();

  if (!normalized || normalized.length < 8) {
    return false;
  }

  if (
    lower.includes('test-key') ||
    lower.includes('placeholder') ||
    lower.includes('example') ||
    lower.includes('dummy') ||
    lower.includes('changeme') ||
    normalized.includes('...') ||
    normalized.includes('****') ||
    normalized.includes('••••')
  ) {
    return false;
  }

  return true;
}

function getValidEnvLlmApiKey() {
  for (const envKeyName of LLM_ENV_KEY_NAMES) {
    const value = process.env[envKeyName];

    if (isValidConfiguredLlmApiKey(value)) {
      return {
        apiKey: value.trim(),
        source: 'env'
      };
    }
  }

  return {
    apiKey: '',
    source: 'not-configured'
  };
}

function resolveEffectiveLlmApiKey(settings) {
  const settingsApiKey = settings?.llm?.apiKey || '';

  if (isValidConfiguredLlmApiKey(settingsApiKey)) {
    return {
      apiKey: settingsApiKey.trim(),
      source: 'settings'
    };
  }

  return getValidEnvLlmApiKey();
}

function createPublicSettings(settings) {
  const effectiveApiKey = resolveEffectiveLlmApiKey(settings);

  return {
    dashboard: settings.dashboard,
    llm: {
      provider: settings.llm.provider,
      displayName: settings.llm.displayName,
      model: settings.llm.model,
      apiKeyConfigured: Boolean(effectiveApiKey.apiKey),
      apiKeyMasked: maskApiKey(effectiveApiKey.apiKey),
      apiKeyPreview: maskApiKey(effectiveApiKey.apiKey),
      apiKeySource: effectiveApiKey.source
    },
    proxy: settings.proxy,
    allowedProviders: settings.allowedProviders,
    llmModelOptions: settings.llmModelOptions,
    sentToLLM: false,
    sentToClaude: false
  };
}

function validationError(errors) {
  return {
    status: 'SETTINGS_VALIDATION_ERROR',
    sentToLLM: false,
    sentToClaude: false,
    errors
  };
}

export function getPlatformSettings() {
  return createPublicSettings(readRawSettings());
}

export function getLlmRuntimeSettings() {
  const settings = readRawSettings();
  const effectiveApiKey = resolveEffectiveLlmApiKey(settings);

  return {
    provider: settings.llm.provider,
    displayName: settings.llm.displayName,
    model: settings.llm.model || getDefaultLlmModelForProvider(settings.llm.provider),
    apiKey: effectiveApiKey.apiKey,
    apiKeySource: effectiveApiKey.source,
    apiKeyConfigured: Boolean(effectiveApiKey.apiKey)
  };
}

export function getDashboardBudgetSettings() {
  return readRawSettings().dashboard;
}

export function saveDashboardSettings(input) {
  const monthlyBudgetUsd = Number(input?.monthlyBudgetUsd);
  const alertThresholdUsd = 'alertThresholdUsd' in (input || {})
    ? Number(input?.alertThresholdUsd)
    : Math.round((monthlyBudgetUsd * Number(input?.alertThresholdPercent || 0)) * 100) / 10000;
  const errors = [];

  if (!Number.isFinite(monthlyBudgetUsd) || monthlyBudgetUsd <= 0 || monthlyBudgetUsd > 100000) {
    errors.push('monthlyBudgetUsd must be a number greater than 0 and less than or equal to 100000.');
  }

  if (!Number.isFinite(alertThresholdUsd) || alertThresholdUsd <= 0 || alertThresholdUsd > monthlyBudgetUsd) {
    errors.push('alertThresholdUsd must be a number greater than 0 and less than or equal to monthlyBudgetUsd.');
  }

  if (errors.length > 0) {
    return validationError(errors);
  }

  const settings = readRawSettings();
  settings.dashboard = {
    monthlyBudgetUsd: normalizeMoney(monthlyBudgetUsd),
    alertThresholdUsd: normalizeMoney(alertThresholdUsd)
  };
  writeSettings(settings);

  return withRefresh({
    status: 'DASHBOARD_SETTINGS_SAVED',
    sentToLLM: false,
    sentToClaude: false,
    config: createPublicSettings(settings)
  }, 'settings-dashboard-updated');
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\/.+/i.test(value);
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateProxyPayload(input) {
  const fields = Object.keys(input || {});
  const unknownFields = fields.filter((field) => !PROXY_EDITABLE_FIELDS.includes(field));
  const protectedFields = fields.filter((field) => PROTECTED_PROXY_FIELDS.includes(field));
  const errors = [];
  const publicBaseUrl = typeof input?.publicBaseUrl === 'string' ? input.publicBaseUrl.trim() : '';
  const port = Number(input?.port);
  const allowedOrigins = input?.allowedOrigins;
  const maxRequestBodyKb = Number(input?.maxRequestBodyKb);
  const maxContextChars = Number(input?.maxContextChars);

  if (unknownFields.length > 0) {
    errors.push(`Unknown fields are not allowed: ${unknownFields.join(', ')}.`);
  }

  if (protectedFields.length > 0) {
    errors.push(`Protected proxy fields cannot be edited from UI: ${protectedFields.join(', ')}.`);
  }

  if (!isHttpUrl(publicBaseUrl) || publicBaseUrl.length > 300) {
    errors.push('publicBaseUrl must start with http:// or https:// and have at most 300 characters.');
  }

  if (!isIntegerInRange(port, 1, 65535)) {
    errors.push('port must be an integer between 1 and 65535.');
  }

  if (!Array.isArray(allowedOrigins) || allowedOrigins.length < 1 || allowedOrigins.length > 20) {
    errors.push('allowedOrigins must be an array with 1 to 20 URLs.');
  } else {
    const invalidOrigins = allowedOrigins.filter((origin) => !isHttpUrl(String(origin).trim()));
    if (invalidOrigins.length > 0) {
      errors.push('allowedOrigins entries must start with http:// or https://.');
    }
  }

  if (!isIntegerInRange(maxRequestBodyKb, 1, 10240)) {
    errors.push('maxRequestBodyKb must be an integer between 1 and 10240.');
  }

  if (!isIntegerInRange(maxContextChars, 1000, 500000)) {
    errors.push('maxContextChars must be an integer between 1000 and 500000.');
  }

  return {
    errors,
    proxy: {
      publicBaseUrl,
      port,
      allowedOrigins: Array.isArray(allowedOrigins)
        ? allowedOrigins.map((origin) => String(origin).trim()).filter(Boolean)
        : [],
      maxRequestBodyKb,
      maxContextChars
    }
  };
}

export function saveProxySettings(input) {
  const { errors, proxy } = validateProxyPayload(input);

  if (errors.length > 0) {
    return validationError(errors);
  }

  const settings = readRawSettings();
  settings.proxy = {
    ...proxy,
    ...DEFAULT_PROXY_PROTECTIONS
  };
  writeSettings(settings);

  return withRefresh({
    status: 'PROXY_SETTINGS_SAVED',
    sentToLLM: false,
    sentToClaude: false,
    config: createPublicSettings(settings)
  }, 'settings-proxy-updated');
}

export function saveLlmSettings(input) {
  const settings = readRawSettings();
  const provider = typeof input?.provider === 'string' ? input.provider.trim() : '';
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : '';
  const model = typeof input?.model === 'string' ? input.model.trim() : '';
  const providedApiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
  const nextApiKey = providedApiKey || settings.llm.apiKey;
  const errors = [];

  if (!ALLOWED_PROVIDERS.includes(provider)) {
    errors.push(`provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}.`);
  }

  if (displayName.length < 2 || displayName.length > 80) {
    errors.push('displayName must be between 2 and 80 characters.');
  }

  if (model.length < 2 || model.length > 120) {
    errors.push('model must be between 2 and 120 characters.');
  }

  if (providedApiKey && (providedApiKey.length < 8 || providedApiKey.length > 500)) {
    errors.push('apiKey must be between 8 and 500 characters.');
  }

  if (providedApiKey && !isValidConfiguredLlmApiKey(providedApiKey)) {
    errors.push(INVALID_LLM_KEY_MESSAGE);
  }

  if (errors.length > 0) {
    return validationError(errors);
  }

  settings.llm = {
    provider,
    displayName,
    model,
    apiKey: nextApiKey
  };
  writeSettings(settings);
  const effectiveApiKey = resolveEffectiveLlmApiKey(settings);

  return withRefresh({
    status: 'LLM_SETTINGS_SAVED',
    sentToLLM: false,
    sentToClaude: false,
    apiKeyConfigured: Boolean(effectiveApiKey.apiKey),
    apiKeyMasked: maskApiKey(effectiveApiKey.apiKey),
    apiKeyPreview: maskApiKey(effectiveApiKey.apiKey),
    apiKeySource: effectiveApiKey.source,
    config: createPublicSettings(settings)
  }, 'settings-llm-updated');
}
