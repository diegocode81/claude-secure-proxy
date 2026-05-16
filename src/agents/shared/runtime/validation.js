import { createAgentError } from './status.js';

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

function validateInputContract(contract, input) {
  const requiredAnyOf = Array.isArray(contract.requiredAnyOf) ? contract.requiredAnyOf : [];
  const optional = Array.isArray(contract.optional) ? contract.optional : [];
  const allowedFields = Array.from(new Set([
    ...requiredAnyOf,
    ...optional
  ]));
  const errors = [];
  const warnings = [];

  if (contract.disallowUnknownFields) {
    const unknownFields = Object.keys(input).filter((fieldName) => !allowedFields.includes(fieldName));
    for (const fieldName of unknownFields) {
      errors.push(`Field "${fieldName}" is not declared in the agent input contract.`);
    }
  }

  if (requiredAnyOf.length > 0) {
    const hasAnyRequired = requiredAnyOf.some((fieldName) => hasMeaningfulValue(input[fieldName]));

    if (!hasAnyRequired) {
      errors.push(`At least one of these fields is required: ${requiredAnyOf.join(', ')}.`);
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
  if (agent?.inputContract) {
    return validateInputContract(agent.inputContract, input);
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
