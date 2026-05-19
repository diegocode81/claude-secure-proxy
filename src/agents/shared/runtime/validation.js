import { createAgentError } from './status.js';
import {
  buildInputContractFromIO,
  inferAgentIO,
  normalizeInputMode
} from '../contracts.js';

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export function validateAgentRunRequest(body) {
  if (!isPlainObject(body)) {
    return {
      valid: false,
      error: 'Request body must be a JSON object.',
      receivedInputKeys: []
    };
  }

  if (!isPlainObject(body.input)) {
    return {
      valid: false,
      error: 'Request body must include an "input" object.',
      receivedInputKeys: Object.keys(body)
    };
  }

  return {
    valid: true,
    input: body.input,
    receivedInputKeys: Object.keys(body.input)
  };
}

function getValueType(value) {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function hasMeaningfulValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined;
}

function isLegacyProtectedAgent(agent) {
  return agent?.id === 'qa-log-analyst' || agent?.execution?.mode === 'legacy-runtime-enabled';
}

function getInteractionMode(agent) {
  return inferAgentIO(agent).inputMode;
}

export function getStandardInputContractForMode(inputMode = 'text') {
  return buildInputContractFromIO({ inputMode: normalizeInputMode(inputMode) });
}

export function normalizeAgentInputContract(agent) {
  if (isLegacyProtectedAgent(agent)) {
    return agent?.inputContract || null;
  }

  const hasInteraction = Boolean(agent?.interaction || agent?.input);
  if (hasInteraction || !agent?.inputContract) {
    return getStandardInputContractForMode(getInteractionMode(agent));
  }

  return agent.inputContract;
}

function validateFieldDefinition(fieldName, field, value, errors) {
  if (!field || !hasMeaningfulValue(value)) {
    return;
  }

  const valueType = getValueType(value);
  if (field.type && valueType !== field.type) {
    errors.push(`Field "${fieldName}" must be of type ${field.type}.`);
    return;
  }

  if (field.type === 'string') {
    const length = String(value || '').trim().length;
    if (Number.isFinite(Number(field.minLength)) && length < Number(field.minLength)) {
      errors.push(`Field "${fieldName}" must have at least ${field.minLength} characters.`);
    }
    if (Number.isFinite(Number(field.maxLength)) && length > Number(field.maxLength)) {
      errors.push(`Field "${fieldName}" must have at most ${field.maxLength} characters.`);
    }
  }

  if (field.type === 'array' && Number.isFinite(Number(field.minItems)) && Array.isArray(value) && value.length < Number(field.minItems)) {
    errors.push(`Field "${fieldName}" must include at least ${field.minItems} item(s).`);
  }
}

function validateInputContract(contract, input, options = {}) {
  const required = Array.isArray(contract.required) ? contract.required : [];
  const requiredAnyOf = Array.isArray(contract.requiredAnyOf) ? contract.requiredAnyOf : [];
  const optional = Array.isArray(contract.optional) ? contract.optional : [];
  const requiredAnyOfFields = requiredAnyOf.flatMap((entry) => Array.isArray(entry) ? entry : [entry]);
  const allowedFields = Array.from(new Set([
    ...required,
    ...requiredAnyOfFields,
    ...optional
  ]));
  const errors = [];
  const warnings = [];

  if (contract.disallowUnknownFields) {
    const unknownFields = Object.keys(input).filter((fieldName) => !allowedFields.includes(fieldName));
    for (const fieldName of unknownFields) {
      errors.push(options.legacyMessages
        ? `Field "${fieldName}" is not declared in the agent input contract.`
        : `El campo "${fieldName}" no está permitido para este agente.`);
    }
  }

  for (const fieldName of required) {
    if (!hasMeaningfulValue(input[fieldName])) {
      errors.push(fieldName === 'text'
        ? 'Ingresa un texto para que el agente pueda analizarlo.'
        : `Field "${fieldName}" is required.`);
    }
  }

  for (const [fieldName, field] of Object.entries(contract.fields || {})) {
    validateFieldDefinition(fieldName, field, input[fieldName], errors);
  }

  if (requiredAnyOf.length > 0) {
    const hasAnyRequired = requiredAnyOf.some((entry) => {
      if (Array.isArray(entry)) {
        return entry.every((fieldName) => hasMeaningfulValue(input[fieldName]));
      }

      return hasMeaningfulValue(input[entry]);
    });

    if (!hasAnyRequired) {
      const requiredOptions = requiredAnyOf.map((entry) => Array.isArray(entry) ? entry.join(' + ') : entry);
      const message = requiredAnyOf.every((entry) => typeof entry === 'string')
        ? `At least one of these fields is required: ${requiredOptions.join(', ')}.`
        : `At least one required input option must be provided: ${requiredOptions.join(', ')}.`;
      errors.push(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    allowedFields,
    receivedInputKeys: Object.keys(input)
  };
}

export function validateAgentInputSchema(agent, input) {
  const normalizedContract = normalizeAgentInputContract(agent);

  if (normalizedContract) {
    return validateInputContract(normalizedContract, input, {
      legacyMessages: isLegacyProtectedAgent(agent)
    });
  }

  const schema = agent?.inputSchema;

  if (!schema?.fields) {
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  const errors = [];
  const warnings = [];
  const fields = schema.fields;
  const allowedFields = Object.keys(fields);

  for (const fieldName of allowedFields) {
    const field = fields[fieldName];
    const value = input[fieldName];
    const hasValue = value !== undefined;

    if (field.required && !hasValue) {
      errors.push(`Field "${fieldName}" is required.`);
      continue;
    }

    if (hasValue) {
      const valueType = getValueType(value);
      if (field.type && valueType !== field.type) {
        errors.push(`Field "${fieldName}" must be of type ${field.type}.`);
      }
    }
  }

  const unknownFields = Object.keys(input).filter((fieldName) => !allowedFields.includes(fieldName));
  for (const fieldName of unknownFields) {
    errors.push(`Field "${fieldName}" is not declared in the agent input schema.`);
  }

  if (Array.isArray(schema.requiredAnyOf) && schema.requiredAnyOf.length > 0) {
    const hasAnyRequired = schema.requiredAnyOf.some((fieldName) => {
      return hasMeaningfulValue(input[fieldName]);
    });

    if (!hasAnyRequired) {
      errors.push(`At least one of these fields is required: ${schema.requiredAnyOf.join(', ')}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    allowedFields,
    receivedInputKeys: Object.keys(input)
  };
}

export function requireStringField(input, fieldName) {
  const value = input?.[fieldName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createAgentError(`El campo "${fieldName}" es requerido y debe ser un string no vacío.`);
  }

  return value;
}

export function enforceMaxLength(value, maxChars, fieldName) {
  if (typeof value === 'string' && value.length > maxChars) {
    throw createAgentError(`El campo "${fieldName}" supera el límite de ${maxChars} caracteres.`);
  }

  return value;
}

export function validateWithAgent(agent, input) {
  if (typeof agent?.validateInput !== 'function') {
    return input;
  }

  return agent.validateInput(input);
}
