export const INPUT_MODES = ['text', 'file', 'text-and-file', 'json', 'multiple-files'];
export const ACCEPTED_INPUT_TYPES = ['text', 'json', 'csv', 'html', 'markdown', 'pdf'];
export const OUTPUT_MODES = ['screen', 'downloadable-report', 'screen-and-download', 'json'];

export const DEFAULT_INTERACTION = {
  inputMode: 'text',
  acceptedInputTypes: ['text'],
  outputMode: 'screen',
  downloadableOutput: false,
  outputFileNamePattern: '',
  instructions: 'Ingresa la información que el agente debe analizar.'
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

export function normalizeInteraction(rawInteraction = {}) {
  const inputMode = INPUT_MODES.includes(rawInteraction.inputMode)
    ? rawInteraction.inputMode
    : DEFAULT_INTERACTION.inputMode;
  const acceptedInputTypes = toList(rawInteraction.acceptedInputTypes)
    .filter((item) => ACCEPTED_INPUT_TYPES.includes(item));
  const outputMode = OUTPUT_MODES.includes(rawInteraction.outputMode)
    ? rawInteraction.outputMode
    : DEFAULT_INTERACTION.outputMode;
  const downloadableOutput = Boolean(rawInteraction.downloadableOutput);
  const outputFileNamePattern = typeof rawInteraction.outputFileNamePattern === 'string'
    ? rawInteraction.outputFileNamePattern.trim()
    : '';
  const instructions = typeof rawInteraction.instructions === 'string' && rawInteraction.instructions.trim()
    ? rawInteraction.instructions.trim()
    : DEFAULT_INTERACTION.instructions;

  return {
    inputMode,
    acceptedInputTypes: acceptedInputTypes.length > 0
      ? acceptedInputTypes
      : DEFAULT_INTERACTION.acceptedInputTypes,
    outputMode,
    downloadableOutput,
    outputFileNamePattern: downloadableOutput || ['downloadable-report', 'screen-and-download'].includes(outputMode)
      ? (outputFileNamePattern || '<agent-id>-report-<timestamp>.md')
      : outputFileNamePattern,
    instructions
  };
}

export function validateInteraction(rawInteraction = {}, errors = []) {
  const interaction = normalizeInteraction(rawInteraction);
  const rawTypes = toList(rawInteraction.acceptedInputTypes);
  const invalidTypes = rawTypes.filter((item) => !ACCEPTED_INPUT_TYPES.includes(item));

  if (rawInteraction.inputMode && !INPUT_MODES.includes(rawInteraction.inputMode)) {
    errors.push(`inputMode must be one of: ${INPUT_MODES.join(', ')}.`);
  }

  if (invalidTypes.length > 0) {
    errors.push(`acceptedInputTypes contains unsupported values: ${invalidTypes.join(', ')}.`);
  }

  if (rawInteraction.outputMode && !OUTPUT_MODES.includes(rawInteraction.outputMode)) {
    errors.push(`outputMode must be one of: ${OUTPUT_MODES.join(', ')}.`);
  }

  if (interaction.outputFileNamePattern && interaction.outputFileNamePattern.length > 160) {
    errors.push('outputFileNamePattern must have at most 160 characters.');
  }

  if (interaction.instructions.length > 500) {
    errors.push('interactionInstructions must have at most 500 characters.');
  }

  return interaction;
}
