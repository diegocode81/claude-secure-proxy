export const DEFAULT_OUTPUT_FIELDS = [
  'summary',
  'data',
  'risks',
  'recommendations',
  'openQuestions'
];

export const OUTPUT_FIELD_OPTIONS = [
  ...DEFAULT_OUTPUT_FIELDS,
  'acceptanceCriteria',
  'testScenarios',
  'executiveReport'
];

export const OUTPUT_RESPONSE_PRESETS = {
  qa_standard: {
    label: 'Análisis estándar QA',
    fields: DEFAULT_OUTPUT_FIELDS
  },
  qa_acceptance_and_scenarios: {
    label: 'Criterios y escenarios QA',
    fields: ['summary', 'acceptanceCriteria', 'testScenarios', 'risks', 'openQuestions']
  },
  executive_report: {
    label: 'Informe gerencial',
    fields: ['summary', 'executiveReport', 'risks', 'recommendations', 'openQuestions']
  },
  technical_analysis: {
    label: 'Análisis técnico',
    fields: DEFAULT_OUTPUT_FIELDS
  },
  custom: {
    label: 'Personalizado',
    fields: []
  }
};

export function normalizeResponsePreset(value) {
  const preset = String(value || '').trim();
  return Object.hasOwn(OUTPUT_RESPONSE_PRESETS, preset) ? preset : 'qa_standard';
}

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeOutputFields(value) {
  const fields = toList(value).filter((field) => OUTPUT_FIELD_OPTIONS.includes(field));
  return fields.length > 0 ? Array.from(new Set(fields)) : [...DEFAULT_OUTPUT_FIELDS];
}

export function resolveOutputFieldsFromIO(rawIo = {}, errors = []) {
  const responsePreset = normalizeResponsePreset(rawIo.responsePreset);

  if (responsePreset !== 'custom') {
    return [...OUTPUT_RESPONSE_PRESETS[responsePreset].fields];
  }

  const rawFields = toList(rawIo.outputFields);
  const invalidFields = rawFields.filter((field) => !OUTPUT_FIELD_OPTIONS.includes(field));

  if (invalidFields.length > 0) {
    errors.push(`Contenido esperado de salida no válido: ${invalidFields.join(', ')}.`);
  }

  if (rawFields.length === 0) {
    errors.push('Selecciona al menos un tipo de contenido esperado para la respuesta del agente.');
    return [];
  }

  return normalizeOutputFields(rawFields);
}

export function buildUserInstructionsFromIO(rawIo = {}) {
  const inputMode = String(rawIo.inputMode || '').trim();

  if (inputMode === 'file') {
    return 'Sube un archivo permitido para que el agente lo analice.';
  }

  if (inputMode === 'text_and_file' || inputMode === 'text-and-file' || inputMode === 'mixed') {
    return 'Ingresa instrucciones y, si aplica, sube un archivo permitido para complementar el análisis.';
  }

  return 'Ingresa la información que el agente debe analizar.';
}
