import {
  DEFAULT_OUTPUT_FIELDS,
  OUTPUT_FIELD_OPTIONS,
  normalizeResponsePreset,
  resolveOutputFieldsFromIO
} from './io.js';

export { DEFAULT_OUTPUT_FIELDS, OUTPUT_FIELD_OPTIONS };

export const INPUT_MODES = ['text', 'file', 'text_and_file'];
export const OUTPUT_MODES = ['screen', 'download', 'screen_and_download'];

export const DEFAULT_AGENT_IO = {
  inputMode: 'text',
  outputMode: 'screen',
  responsePreset: 'qa_standard',
  outputFields: DEFAULT_OUTPUT_FIELDS
};

const INPUT_MODE_ALIASES = {
  'text-and-file': 'text_and_file',
  mixed: 'text_and_file',
  json: 'text',
  'multiple-files': 'file'
};

const OUTPUT_MODE_ALIASES = {
  'downloadable-report': 'download',
  'screen-and-download': 'screen_and_download',
  json: 'screen'
};

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeInputMode(value) {
  const raw = String(value || '').trim();
  const normalized = INPUT_MODE_ALIASES[raw] || raw;
  return INPUT_MODES.includes(normalized) ? normalized : DEFAULT_AGENT_IO.inputMode;
}

export function normalizeOutputMode(value) {
  const raw = String(value || '').trim();
  const normalized = OUTPUT_MODE_ALIASES[raw] || raw;
  return OUTPUT_MODES.includes(normalized) ? normalized : DEFAULT_AGENT_IO.outputMode;
}

export function normalizeOutputFields(value) {
  const fields = toList(value).filter((field) => OUTPUT_FIELD_OPTIONS.includes(field));
  return fields.length > 0 ? Array.from(new Set(fields)) : [...DEFAULT_OUTPUT_FIELDS];
}

export function normalizeAgentIO(rawIo = {}) {
  const responsePreset = normalizeResponsePreset(rawIo.responsePreset);
  const outputFields = responsePreset === 'custom'
    ? normalizeOutputFields(rawIo.outputFields)
    : resolveOutputFieldsFromIO({ ...rawIo, responsePreset });

  return {
    inputMode: normalizeInputMode(rawIo.inputMode),
    outputMode: normalizeOutputMode(rawIo.outputMode),
    responsePreset,
    outputFields
  };
}

export function validateAgentIO(rawIo = {}, errors = []) {
  const rawInputMode = String(rawIo.inputMode || '').trim();
  const rawOutputMode = String(rawIo.outputMode || '').trim();
  const responsePreset = normalizeResponsePreset(rawIo.responsePreset);
  const outputFields = toList(rawIo.outputFields);

  if (!rawInputMode) {
    errors.push('Selecciona un modo de entrada.');
  } else if (!INPUT_MODES.includes(normalizeInputMode(rawInputMode))) {
    errors.push('Modo de entrada no es válido.');
  }

  if (!rawOutputMode) {
    errors.push('Selecciona un tipo de salida.');
  } else if (!OUTPUT_MODES.includes(normalizeOutputMode(rawOutputMode))) {
    errors.push('Tipo de salida no es válido.');
  }

  if (responsePreset === 'custom' && outputFields.length === 0) {
    errors.push('Selecciona al menos un tipo de contenido esperado para la respuesta del agente.');
  }

  resolveOutputFieldsFromIO({ ...rawIo, responsePreset }, errors);

  return normalizeAgentIO(rawIo);
}

export function buildInputContractFromIO(rawIo = {}) {
  const io = normalizeAgentIO(rawIo);
  const contextField = {
    type: 'string',
    required: false,
    maxLength: 20000
  };

  if (io.inputMode === 'file') {
    return {
      required: ['file'],
      requiredAnyOf: [],
      optional: ['context'],
      disallowUnknownFields: true,
      fields: {
        file: {
          type: 'object',
          required: true
        },
        context: contextField
      }
    };
  }

  if (io.inputMode === 'text_and_file') {
    return {
      required: [],
      requiredAnyOf: ['text', 'file'],
      optional: ['context'],
      disallowUnknownFields: true,
      fields: {
        text: {
          type: 'string',
          required: false,
          minLength: 1,
          maxLength: 60000
        },
        file: {
          type: 'object',
          required: false
        },
        context: contextField
      }
    };
  }

  return {
    required: ['text'],
    requiredAnyOf: [],
    optional: ['context'],
    disallowUnknownFields: true,
    fields: {
      text: {
        type: 'string',
        minLength: 1,
        maxLength: 60000
      },
      context: contextField
    }
  };
}

export function buildOutputSchemaFromIO(rawIo = {}) {
  return {
    fields: resolveOutputFieldsFromIO(rawIo)
  };
}

export function inferAgentIO(profile = {}) {
  if (profile.io) {
    return normalizeAgentIO(profile.io);
  }

  const interaction = profile.interaction || {};
  const outputSchema = profile.outputSchema || {};

  return normalizeAgentIO({
    inputMode: interaction.inputMode || profile.input?.mode || 'text',
    outputMode: interaction.outputMode || 'screen',
    responsePreset: profile.io?.responsePreset || 'qa_standard',
    outputFields: outputSchema.fields || profile.outputContract || DEFAULT_OUTPUT_FIELDS
  });
}
