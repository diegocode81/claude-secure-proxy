export const DETAIL_LEVEL_TO_MAX_OUTPUT_TOKENS = {
  brief: 800,
  standard: 1500,
  detailed: 3000,
  extensive: 5000
};

export const TEMPERATURE_PRESETS = {
  precise: 0.1,
  balanced: 0.3,
  creative: 0.7
};

export const DEFAULT_AGENT_LLM_SETTINGS = {
  responseDetailLevel: 'extensive',
  maxOutputTokens: 5000,
  temperature: 0.1,
  budgetPolicy: {
    enforceMonthlyBudget: true,
    rejectIfEstimatedCostExceedsRemainingBudget: true
  }
};

const ALLOWED_DETAIL_LEVELS = Object.keys(DETAIL_LEVEL_TO_MAX_OUTPUT_TOKENS);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

export function normalizeAgentLlmSettings(rawSettings = {}) {
  const source = isPlainObject(rawSettings) ? rawSettings : {};
  const responseDetailLevel = ALLOWED_DETAIL_LEVELS.includes(source.responseDetailLevel)
    ? source.responseDetailLevel
    : DEFAULT_AGENT_LLM_SETTINGS.responseDetailLevel;
  const maxOutputTokens = clampNumber(
    source.maxOutputTokens ?? DETAIL_LEVEL_TO_MAX_OUTPUT_TOKENS[responseDetailLevel],
    DEFAULT_AGENT_LLM_SETTINGS.maxOutputTokens,
    300,
    8000
  );
  const temperature = clampNumber(
    source.temperature,
    DEFAULT_AGENT_LLM_SETTINGS.temperature,
    0,
    1
  );
  const budgetPolicy = isPlainObject(source.budgetPolicy) ? source.budgetPolicy : {};

  return {
    responseDetailLevel,
    maxOutputTokens,
    temperature,
    budgetPolicy: {
      enforceMonthlyBudget: typeof budgetPolicy.enforceMonthlyBudget === 'boolean'
        ? budgetPolicy.enforceMonthlyBudget
        : DEFAULT_AGENT_LLM_SETTINGS.budgetPolicy.enforceMonthlyBudget,
      rejectIfEstimatedCostExceedsRemainingBudget: typeof budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget === 'boolean'
        ? budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget
        : DEFAULT_AGENT_LLM_SETTINGS.budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget
    }
  };
}

export function validateAgentLlmSettings(rawSettings = {}, errors = []) {
  const source = isPlainObject(rawSettings) ? rawSettings : {};

  if (source.responseDetailLevel !== undefined && !ALLOWED_DETAIL_LEVELS.includes(source.responseDetailLevel)) {
    errors.push('responseDetailLevel no es válido.');
  }

  const maxOutputTokens = Number(source.maxOutputTokens);
  if (source.maxOutputTokens !== undefined && (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 300 || maxOutputTokens > 8000)) {
    errors.push('maxOutputTokens debe estar entre 300 y 8000.');
  }

  const temperature = Number(source.temperature);
  if (source.temperature !== undefined && (!Number.isFinite(temperature) || temperature < 0 || temperature > 1)) {
    errors.push('temperature debe estar entre 0 y 1.');
  }

  if (source.budgetPolicy !== undefined && !isPlainObject(source.budgetPolicy)) {
    errors.push('budgetPolicy must be a JSON object.');
  }

  if (isPlainObject(source.budgetPolicy)) {
    if (
      source.budgetPolicy.enforceMonthlyBudget !== undefined &&
      typeof source.budgetPolicy.enforceMonthlyBudget !== 'boolean'
    ) {
      errors.push('budgetPolicy.enforceMonthlyBudget must be boolean.');
    }

    if (
      source.budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget !== undefined &&
      typeof source.budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget !== 'boolean'
    ) {
      errors.push('budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget must be boolean.');
    }
  }

  return normalizeAgentLlmSettings(source);
}

export function buildAgentLlmSettingsFromInput(input = {}, errors = []) {
  const temperaturePreset = typeof input.temperaturePreset === 'string'
    ? input.temperaturePreset
    : '';
  const temperature = temperaturePreset
    ? TEMPERATURE_PRESETS[temperaturePreset]
    : input.temperature;

  if (temperaturePreset && !(temperaturePreset in TEMPERATURE_PRESETS)) {
    errors.push('temperaturePreset no es válido.');
  }

  const settings = {
    budgetPolicy: {
      enforceMonthlyBudget: true,
      rejectIfEstimatedCostExceedsRemainingBudget: true
    }
  };

  if (input.responseDetailLevel !== undefined) settings.responseDetailLevel = input.responseDetailLevel;
  if (input.maxOutputTokens !== undefined) settings.maxOutputTokens = input.maxOutputTokens;
  if (temperature !== undefined) settings.temperature = temperature;

  return validateAgentLlmSettings(settings, errors);
}
