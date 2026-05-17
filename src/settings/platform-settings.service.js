import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'platform-settings.json');

const ALLOWED_PROVIDERS = ['claude', 'gemini', 'deepseek', 'openai', 'other'];

const DEFAULT_SETTINGS = {
  dashboard: {
    monthlyBudgetUsd: 80,
    alertThresholdUsd: 68
  },
  llm: {
    provider: 'claude',
    displayName: 'Claude',
    apiKey: ''
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

  return defaults;
}

function normalizeMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeSettings(settings) {
  const defaults = cloneDefaults();
  const dashboard = settings?.dashboard || {};
  const llm = settings?.llm || {};
  const monthlyBudgetUsd = Number(dashboard.monthlyBudgetUsd || defaults.dashboard.monthlyBudgetUsd);
  const fallbackAlertThresholdUsd = defaults.dashboard.alertThresholdUsd;
  const alertThresholdUsd = 'alertThresholdUsd' in dashboard
    ? Number(dashboard.alertThresholdUsd)
    : fallbackAlertThresholdUsd;

  return {
    dashboard: {
      monthlyBudgetUsd: normalizeMoney(monthlyBudgetUsd),
      alertThresholdUsd: normalizeMoney(alertThresholdUsd)
    },
    llm: {
      provider: ALLOWED_PROVIDERS.includes(llm.provider) ? llm.provider : defaults.llm.provider,
      displayName: typeof llm.displayName === 'string' && llm.displayName.trim()
        ? llm.displayName.trim()
        : defaults.llm.displayName,
      apiKey: typeof llm.apiKey === 'string' ? llm.apiKey : ''
    },
    allowedProviders: ALLOWED_PROVIDERS
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

function createPublicSettings(settings) {
  const apiKey = settings.llm.apiKey || '';

  return {
    dashboard: settings.dashboard,
    llm: {
      provider: settings.llm.provider,
      displayName: settings.llm.displayName,
      apiKeyConfigured: Boolean(apiKey),
      apiKeyPreview: maskApiKey(apiKey)
    },
    allowedProviders: settings.allowedProviders,
    sentToClaude: false
  };
}

function validationError(errors) {
  return {
    status: 'SETTINGS_VALIDATION_ERROR',
    sentToClaude: false,
    errors
  };
}

export function getPlatformSettings() {
  return createPublicSettings(readRawSettings());
}

export function getDashboardBudgetSettings() {
  return readRawSettings().dashboard;
}

export function saveDashboardSettings(input) {
  const monthlyBudgetUsd = Number(input?.monthlyBudgetUsd);
  const alertThresholdUsd = Number(input?.alertThresholdUsd);
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

  return {
    status: 'DASHBOARD_SETTINGS_SAVED',
    sentToClaude: false,
    config: createPublicSettings(settings)
  };
}

export function saveLlmSettings(input) {
  const settings = readRawSettings();
  const provider = typeof input?.provider === 'string' ? input.provider.trim() : '';
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : '';
  const hasExistingApiKey = Boolean(settings.llm.apiKey);
  const providedApiKey = typeof input?.apiKey === 'string' ? input.apiKey.trim() : '';
  const nextApiKey = providedApiKey || settings.llm.apiKey;
  const errors = [];

  if (!ALLOWED_PROVIDERS.includes(provider)) {
    errors.push(`provider must be one of: ${ALLOWED_PROVIDERS.join(', ')}.`);
  }

  if (displayName.length < 2 || displayName.length > 80) {
    errors.push('displayName must be between 2 and 80 characters.');
  }

  if (!providedApiKey && !hasExistingApiKey) {
    errors.push('apiKey is required.');
  } else if (providedApiKey && (providedApiKey.length < 8 || providedApiKey.length > 500)) {
    errors.push('apiKey must be between 8 and 500 characters.');
  }

  if (errors.length > 0) {
    return validationError(errors);
  }

  settings.llm = {
    provider,
    displayName,
    apiKey: nextApiKey
  };
  writeSettings(settings);

  return {
    status: 'LLM_SETTINGS_SAVED',
    sentToClaude: false,
    apiKeyConfigured: Boolean(nextApiKey),
    apiKeyPreview: maskApiKey(nextApiKey),
    config: createPublicSettings(settings)
  };
}
