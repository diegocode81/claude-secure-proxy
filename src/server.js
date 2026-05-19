import http from 'node:http';
import path from 'node:path';
import './config/env.js';
import { callLlm } from './llm/llm.client.js';
import { validateAgentUploadFile } from './security/file-upload-policy.js';
import { buildPromptInjectionPolicyBlock } from './security/prompt-injection-policy.js';
import { sanitizeText } from './security/sanitizer.js';
import {
  ERROR_ANALYSIS_INSTRUCTION,
  ERROR_CONTEXT_ANALYSIS_INSTRUCTION
} from './agents/qa-log-analyst/profile.js';
import { getAgentProfile } from './agents/registry.js';
import {
  createAgentResponse,
  runAgent,
  validateAgentInputSchema,
  validateAgentRunRequest
} from './agents/shared/runtime/index.js';
import { normalizeAgentLlmSettings } from './agents/shared/llm-settings.js';
import { handleDashboardRoutes } from './routes/dashboard.routes.js';
import { handleAgentAdminRoutes } from './routes/agent-admin.routes.js';
import { handleAgentBuilderRoutes } from './routes/agent-builder.routes.js';
import { handleDownloadsRoutes } from './routes/downloads.routes.js';
import { handleExtensionRoutes } from './routes/extension.routes.js';
import { handleHealthRoutes } from './routes/health.routes.js';
import { handleModulesRoutes } from './routes/modules.routes.js';
import { handlePlatformRoutes } from './routes/platform.routes.js';
import { handleSettingsRoutes } from './routes/settings.routes.js';
import {
  getUsageSummary,
  recordBlockedRequest,
  recordLlmUsage,
  resetUsage
} from './usage/usage-store.js';
import {
  isBudgetExceeded,
  isBudgetWarning
} from './usage/budget-service.js';

const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 3 * 1024 * 1024);
const MAX_WORKSPACE_FILES = 10;
const MAX_SNIPPET_LINES = 300;
const MAX_CONTEXT_CHARS = 60000;
const VSCODE_EXTENSION_FILE = path.resolve(
  process.cwd(),
  'secure-code-vscode',
  'secure-code-vscode-0.1.0.vsix'
);
const VSCODE_EXTENSION_DOWNLOAD_NAME = 'secure-code-vscode-0.1.0.vsix';

const DEFAULT_ANALYZE_INSTRUCTION = [
  'Actua como un analista QA senior.',
  'Analiza el contenido recibido y responde en espanol con hallazgos, riesgos y recomendaciones concretas.'
].join(' ');

function withPromptInjectionPolicy(instruction) {
  return [
    instruction,
    '',
    buildPromptInjectionPolicyBlock()
  ].join('\n');
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8'
  });
  res.end(html);
}

function notFound(res) {
  sendJson(res, 404, {
    error: 'Not Found'
  });
}

function budgetExceededPayload(extra = {}) {
  return {
    ...extra,
    status: 'BUDGET_EXCEEDED',
    sentToLLM: false,
    sentToClaude: false,
    message: 'Monthly LLM API budget exceeded.'
  };
}

function addBudgetWarning(payload, usageSummary) {
  if (!isBudgetWarning(usageSummary)) {
    return payload;
  }

  return {
    ...payload,
    warning: 'WARNING: Monthly budget usage is above 85%.'
  };
}

function methodNotAllowed(res) {
  sendJson(res, 405, {
    error: 'Method Not Allowed'
  });
}

function matchAgentRunPath(pathname) {
  const match = pathname.match(/^\/agents\/([^/]+)\/run$/);

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let raw = '';

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Body demasiado grande.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('JSON invalido.'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function validateText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return 'El campo "text" es requerido y debe ser un string no vacio.';
  }

  return null;
}

function validateErrorText(errorText) {
  if (typeof errorText !== 'string' || errorText.trim().length === 0) {
    return 'El campo "errorText" es requerido y debe ser un string no vacio.';
  }

  if (errorText.length > MAX_CONTEXT_CHARS) {
    return `El campo "errorText" supera el limite de ${MAX_CONTEXT_CHARS} caracteres.`;
  }

  return null;
}

function canRunAgent(agentProfile) {
  return Boolean(
    agentProfile?.execution?.enabled &&
    ['runtime', 'runtime-enabled'].includes(agentProfile.execution.mode)
  );
}

function getAgentAcceptedInputTypes(agentProfile) {
  const accepted = agentProfile?.interaction?.acceptedInputTypes;
  return Array.isArray(accepted) && accepted.length > 0 ? accepted : ['text'];
}

function collectUploadInputs(input) {
  const uploads = [];

  if (input?.file && typeof input.file === 'object') {
    uploads.push(input.file);
  }

  if (input?.fileName !== undefined || input?.fileContent !== undefined) {
    uploads.push(input);
  }

  if (Array.isArray(input?.files)) {
    uploads.push(...input.files);
  }

  return uploads;
}

function validateAgentUploadInputs(agentProfile, input) {
  const uploads = collectUploadInputs(input);

  for (const upload of uploads) {
    const validation = validateAgentUploadFile({
      fileName: upload?.fileName,
      sizeBytes: upload?.sizeBytes,
      acceptedInputTypes: getAgentAcceptedInputTypes(agentProfile)
    });

    if (!validation.valid) {
      return validation;
    }
  }

  return {
    valid: true
  };
}

function isQaLogLegacyRuntime(agentProfile) {
  return Boolean(
    agentProfile?.id === 'qa-log-analyst' &&
    agentProfile?.execution?.enabled &&
    agentProfile?.execution?.mode === 'legacy-runtime-enabled'
  );
}

function normalizeQaLogRuntimeInput(input) {
  const errorText = typeof input.errorText === 'string' && input.errorText.trim()
    ? input.errorText.trim()
    : '';
  const logText = typeof input.logText === 'string' && input.logText.trim()
    ? input.logText.trim()
    : '';
  const selectedText = errorText || logText;
  const validationError = validateErrorText(selectedText);

  if (validationError) {
    throw Object.assign(new Error(validationError), { statusCode: 400 });
  }

  const context = typeof input.context === 'string' && input.context.trim()
    ? input.context.trim()
    : 'unknown';
  const technology = typeof input.technology === 'string' && input.technology.trim()
    ? input.technology.trim()
    : 'unknown';
  const workspaceContext = normalizeWorkspaceContext(input.workspaceContext);

  if (workspaceContext.length > 0) {
    return {
      mode: 'error-context-analysis',
      context,
      technology,
      filesReceived: workspaceContext.length,
      instruction: withPromptInjectionPolicy(ERROR_CONTEXT_ANALYSIS_INSTRUCTION),
      text: buildWorkspacePrompt({
        errorText: selectedText,
        context,
        technology,
        workspaceContext
      })
    };
  }

  return {
    mode: 'error-analysis',
    context,
    technology,
    filesReceived: 0,
    instruction: [
      ERROR_ANALYSIS_INSTRUCTION,
      '',
      `Contexto declarado: ${context}`,
      `Tecnologia declarada: ${technology}`
    ].join('\n') + `\n\n${buildPromptInjectionPolicyBlock()}`,
    text: selectedText
  };
}

function mapLlmErrorToAgentResponse(agentProfile, error, execution) {
  const message = error?.message || 'LLM runtime error.';

  if (message.includes('API error 401') || error?.statusCode === 401) {
    return {
      httpStatus: 401,
      payload: createAgentResponse({
        agentId: agentProfile.id,
        status: 'LLM_AUTHENTICATION_ERROR',
        sentToLLM: true,
        sentToClaude: false,
        summary: 'La API key del LLM es inválida, expiró o no está autorizada. Revisa Configuración > LLM.',
        data: {
          mode: 'qa-log-legacy-runtime',
          agentName: agentProfile.name,
          execution
        },
        risks: [
          'No se puede completar el análisis mientras la autenticación del proveedor LLM falle.'
        ],
        recommendations: [
          'Revisar Configuración > LLM sin exponer la API key completa.'
        ]
      })
    };
  }

  if (message.includes('API_KEY') || message.includes('ANTHROPIC_API_KEY') || message.includes('no esta configurada')) {
    return {
      httpStatus: 400,
      payload: createAgentResponse({
        agentId: agentProfile.id,
        status: 'LLM_API_KEY_NOT_CONFIGURED',
        sentToLLM: false,
        sentToClaude: false,
        summary: 'No hay una API key válida configurada para el LLM. Revisa Configuración > LLM o variables de entorno.',
        data: {
          mode: 'qa-log-legacy-runtime',
          agentName: agentProfile.name,
          execution
        },
        recommendations: [
          'Configurar una API key válida antes de ejecutar análisis reales.'
        ]
      })
    };
  }

  return {
    httpStatus: 500,
    payload: createAgentResponse({
      agentId: agentProfile.id,
      status: 'AGENT_RUN_FAILED',
      sentToLLM: false,
      sentToClaude: false,
      summary: 'El runtime de QA Log Analyst falló de forma controlada.',
      data: {
        mode: 'qa-log-legacy-runtime',
        agentName: agentProfile.name,
        execution
      },
      risks: [
        'El análisis no se completó.'
      ],
      recommendations: [
        'Revisar logs del servidor sin exponer secretos.'
      ]
    })
  };
}

async function runQaLogAnalystLegacyRuntime(agentProfile, input, execution) {
  let normalized;

  try {
    normalized = normalizeQaLogRuntimeInput(input);
  } catch (error) {
    return {
      httpStatus: error.statusCode || 400,
      payload: createAgentResponse({
        agentId: agentProfile.id,
        status: 'AGENT_INPUT_INVALID',
        sentToLLM: false,
        sentToClaude: false,
        summary: error.message,
        data: {
          mode: 'qa-log-legacy-runtime-validation',
          agentName: agentProfile.name,
          execution,
          receivedInputKeys: Object.keys(input || {})
        },
        recommendations: [
          'Enviar errorText o logText como string no vacío.'
        ]
      })
    };
  }

  const sanitized = sanitizeText(normalized.text);

  if (sanitized.status === 'BLOCKED') {
    recordBlockedRequest();
    return {
      httpStatus: 200,
      payload: createAgentResponse({
        agentId: agentProfile.id,
        status: 'AGENT_RUN_BLOCKED',
        sentToLLM: false,
        sentToClaude: false,
        summary: 'El contenido contiene datos sensibles críticos y no fue enviado al LLM.',
        data: {
          mode: normalized.mode,
          agentName: agentProfile.name,
          execution,
          risk: 'HIGH',
          findings: sanitized.findings,
          sanitizedText: sanitized.sanitizedText
        },
        risks: [
          'Se detectó contenido sensible.'
        ],
        recommendations: [
          'Remover secretos, credenciales o tokens antes de reintentar.'
        ]
      })
    };
  }

  if (isBudgetExceeded()) {
    return {
      httpStatus: 200,
      payload: createAgentResponse({
        agentId: agentProfile.id,
        status: 'AGENT_RUN_BUDGET_BLOCKED',
        sentToLLM: false,
        sentToClaude: false,
        summary: 'La ejecución fue bloqueada por control de presupuesto.',
        data: {
          mode: normalized.mode,
          agentName: agentProfile.name,
          execution,
          context: normalized.context,
          technology: normalized.technology,
          filesReceived: normalized.filesReceived
        },
        risks: [
          'Ejecutar análisis sin presupuesto disponible rompería la gobernanza de consumo.'
        ],
        recommendations: [
          'Revisar el dashboard de consumo y presupuesto antes de reintentar.'
        ]
      })
    };
  }

  try {
    const llmSettings = normalizeAgentLlmSettings(agentProfile.llmSettings || {});
    const textForLlm = sanitized.status === 'SANITIZED' ? sanitized.sanitizedText : normalized.text;
    const llmResult = await callLlm({
      instruction: normalized.instruction,
      text: textForLlm,
      maxTokens: llmSettings.maxOutputTokens,
      temperature: llmSettings.temperature
    });
    const usageSummary = recordLlmUsage({
      status: sanitized.status,
      inputTokens: llmResult.usage.inputTokens,
      outputTokens: llmResult.usage.outputTokens
    });

    return {
      httpStatus: 200,
      payload: addBudgetWarning(createAgentResponse({
        agentId: agentProfile.id,
        status: 'AGENT_RUN_COMPLETED',
        sentToLLM: true,
        sentToClaude: true,
        summary: 'QA Log Analyst completó el análisis usando la lógica legacy segura.',
        data: {
          mode: normalized.mode,
          agentName: agentProfile.name,
          execution,
          context: normalized.context,
          technology: normalized.technology,
          filesReceived: normalized.filesReceived,
          sanitizerStatus: sanitized.status,
          risk: sanitized.risk,
          findings: sanitized.findings,
          llmSettings,
          usage: usageSummary
        },
        recommendations: [
          'Revisar rawModelText para el análisis detallado.'
        ],
        rawModelText: llmResult.text
      }), usageSummary)
    };
  } catch (error) {
    return mapLlmErrorToAgentResponse(agentProfile, error, execution);
  }
}

async function handleAgentRun(req, res, agentId) {
  const agentProfile = getAgentProfile(agentId);

  if (!agentProfile) {
    sendJson(res, 404, createAgentResponse({
      agentId,
      status: 'AGENT_NOT_FOUND',
      sentToClaude: false,
      summary: 'Agent not found.',
      recommendations: [
        'Verify the agentId exists in the central registry.'
      ]
    }));
    return;
  }

  const body = await readJsonBody(req);
  const validation = validateAgentRunRequest(body);
  const execution = agentProfile.execution || {
    enabled: false,
    mode: 'legacy',
    runtimeEndpoint: `/agents/${agentProfile.id}/run`,
    legacyEndpoints: agentProfile.relatedEndpoints || []
  };

  if (!validation.valid) {
    sendJson(res, 400, createAgentResponse({
      agentId: agentProfile.id,
      status: 'AGENT_INPUT_INVALID',
      sentToClaude: false,
      summary: validation.error,
      data: {
        mode: 'agent-run-validation',
        agentName: agentProfile.name,
        execution,
        receivedInputKeys: validation.receivedInputKeys
      },
      risks: [
        'Agent runtime requests without a normalized input object cannot be processed consistently.'
      ],
      recommendations: [
        'Send the request body as { "input": {} }.'
      ]
    }));
    return;
  }

  const inputSchemaValidation = validateAgentInputSchema(agentProfile, validation.input);
  if (!inputSchemaValidation.valid) {
    sendJson(res, 400, createAgentResponse({
      agentId: agentProfile.id,
      status: 'AGENT_INPUT_INVALID',
      sentToClaude: false,
      summary: 'Agent input does not match the declared schema.',
      data: {
        mode: 'agent-input-schema-validation',
        agentName: agentProfile.name,
        execution,
        errors: inputSchemaValidation.errors,
        warnings: inputSchemaValidation.warnings,
        allowedFields: inputSchemaValidation.allowedFields,
        receivedInputKeys: inputSchemaValidation.receivedInputKeys
      },
      risks: [
        'Invalid agent input cannot be processed consistently by a shared runtime.'
      ],
      recommendations: [
        'Send at least one of errorText or logText.',
        'Use only fields declared by the agent input schema.'
      ]
    }));
    return;
  }

  const uploadValidation = validateAgentUploadInputs(agentProfile, validation.input);
  if (!uploadValidation.valid) {
    sendJson(res, 400, createAgentResponse({
      agentId: agentProfile.id,
      status: 'AGENT_INPUT_INVALID',
      sentToClaude: false,
      summary: uploadValidation.error,
      data: {
        mode: 'agent-file-upload-validation',
        agentName: agentProfile.name,
        execution,
        receivedInputKeys: validation.receivedInputKeys
      },
      risks: [
        'File input rejected before runtime execution.'
      ],
      recommendations: [
        'Use only file types declared by the agent and keep each file under 2 MB.'
      ]
    }));
    return;
  }

  if (!execution.enabled) {
    sendJson(res, 200, createAgentResponse({
      agentId: agentProfile.id,
      status: 'AGENT_EXECUTION_DISABLED',
      sentToClaude: false,
      summary: 'Agent runtime execution is disabled. Use legacy endpoints.',
      data: {
        mode: 'agent-run-disabled',
        agentName: agentProfile.name,
        execution,
        receivedInputKeys: validation.receivedInputKeys,
        inputWarnings: inputSchemaValidation.warnings,
        allowedFields: inputSchemaValidation.allowedFields,
        profile: {
          status: agentProfile.status,
          statusLabel: agentProfile.statusLabel,
          description: agentProfile.description,
          capabilities: agentProfile.capabilities,
          outputContract: agentProfile.outputContract,
          governance: agentProfile.governance
        }
      },
      recommendations: [
        'Use legacy endpoints until runtime execution is enabled.'
      ]
    }));
    return;
  }

  if (isQaLogLegacyRuntime(agentProfile)) {
    const result = await runQaLogAnalystLegacyRuntime(agentProfile, validation.input, execution);
    sendJson(res, result.httpStatus, result.payload);
    return;
  }

  if (!canRunAgent(agentProfile)) {
    sendJson(res, 501, createAgentResponse({
      agentId: agentProfile.id,
      status: 'AGENT_RUNTIME_NOT_CONFIGURED',
      sentToClaude: false,
      summary: 'Agent execution is enabled, but no runtime implementation is configured for this agent.',
      data: {
        mode: 'agent-run-runtime',
        agentName: agentProfile.name,
        execution
      },
      risks: [
        'Runtime execution cannot proceed without a buildPrompt implementation.'
      ],
      recommendations: [
        'Configure the agent runtime implementation before enabling execution.'
      ]
    }));
    return;
  }

  sendJson(res, 200, await runAgent(agentProfile, validation.input));
}

function normalizeSnippet(snippet) {
  if (typeof snippet !== 'string') {
    return '';
  }

  return snippet.split(/\r?\n/).slice(0, MAX_SNIPPET_LINES).join('\n');
}

function normalizeWorkspaceContext(workspaceContext) {
  if (workspaceContext === undefined || workspaceContext === null) {
    return [];
  }

  if (!Array.isArray(workspaceContext)) {
    throw Object.assign(new Error('El campo "workspaceContext" debe ser un array cuando se envia.'), {
      statusCode: 400
    });
  }

  return workspaceContext.slice(0, MAX_WORKSPACE_FILES).map((file, index) => ({
    filePath: typeof file?.filePath === 'string' && file.filePath.trim()
      ? file.filePath.trim()
      : `workspaceContext[${index}]`,
    language: typeof file?.language === 'string' && file.language.trim()
      ? file.language.trim()
      : 'unknown',
    reason: typeof file?.reason === 'string' && file.reason.trim()
      ? file.reason.trim()
      : 'No especificado',
    snippet: normalizeSnippet(file?.snippet)
  }));
}

function appendWithinLimit(parts, nextPart, maxChars) {
  const currentLength = parts.join('\n').length;
  const separatorLength = currentLength > 0 ? 1 : 0;
  const remaining = maxChars - currentLength - separatorLength;

  if (remaining <= 0) {
    return false;
  }

  parts.push(nextPart.length > remaining ? nextPart.slice(0, remaining) : nextPart);
  return nextPart.length <= remaining;
}

function buildWorkspacePrompt({ errorText, context, technology, workspaceContext }) {
  const parts = [
    `Contexto declarado: ${context}`,
    `Tecnologia declarada: ${technology}`,
    '',
    'Error seleccionado:',
    errorText.trim()
  ];

  if (workspaceContext.length === 0) {
    appendWithinLimit(parts, '\nContexto de workspace: no proporcionado.', MAX_CONTEXT_CHARS);
    return parts.join('\n');
  }

  appendWithinLimit(parts, '\nContexto de workspace proporcionado por VS Code:', MAX_CONTEXT_CHARS);

  for (const [index, file] of workspaceContext.entries()) {
    const fileBlock = [
      '',
      `Archivo ${index + 1}: ${file.filePath}`,
      `Lenguaje: ${file.language}`,
      `Razon de inclusion: ${file.reason}`,
      'Snippet:',
      '```',
      file.snippet,
      '```'
    ].join('\n');

    const fullyAppended = appendWithinLimit(parts, fileBlock, MAX_CONTEXT_CHARS);
    if (!fullyAppended) {
      break;
    }
  }

  return parts.join('\n');
}

async function handleAnalyze(body, res) {
  const validationError = validateText(body.text);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const result = sanitizeText(body.text);

  if (result.status === 'BLOCKED') {
    recordBlockedRequest();
    sendJson(res, 200, {
      status: 'BLOCKED',
      risk: 'HIGH',
      findings: result.findings,
      sentToLLM: false,
      sentToClaude: false,
      message: 'El contenido contiene datos sensibles criticos y no fue enviado al LLM.',
      sanitizedText: result.sanitizedText
    });
    return;
  }

  if (isBudgetExceeded()) {
    sendJson(res, 200, budgetExceededPayload());
    return;
  }

  const textForLlm = result.status === 'SANITIZED' ? result.sanitizedText : body.text;
  const llmResult = await callLlm({
    instruction: withPromptInjectionPolicy(body.instruction || DEFAULT_ANALYZE_INSTRUCTION),
    text: textForLlm
  });
  const usageSummary = recordLlmUsage({
    status: result.status,
    inputTokens: llmResult.usage.inputTokens,
    outputTokens: llmResult.usage.outputTokens
  });

  sendJson(res, 200, addBudgetWarning({
    status: result.status,
    risk: result.risk,
    findings: result.findings,
    sentToLLM: true,
    sentToClaude: true,
    llmResponse: llmResult.text,
    claudeResponse: llmResult.text
  }, usageSummary));
}

async function handleAnalyzeError(body, res) {
  const validationError = validateText(body.text);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const context = typeof body.context === 'string' && body.context.trim()
    ? body.context.trim()
    : 'unknown';
  const technology = typeof body.technology === 'string' && body.technology.trim()
    ? body.technology.trim()
    : 'unknown';
  const result = sanitizeText(body.text);

  if (result.status === 'BLOCKED') {
    recordBlockedRequest();
    sendJson(res, 200, {
      mode: 'error-analysis',
      status: 'BLOCKED',
      risk: 'HIGH',
      findings: result.findings,
      sentToLLM: false,
      sentToClaude: false,
      message: 'El contenido contiene datos sensibles críticos y no fue enviado al LLM.',
      sanitizedText: result.sanitizedText
    });
    return;
  }

  if (isBudgetExceeded()) {
    sendJson(res, 200, budgetExceededPayload({
      mode: 'error-analysis',
      context,
      technology
    }));
    return;
  }

  const textForLlm = result.status === 'SANITIZED' ? result.sanitizedText : body.text;
  const llmResult = await callLlm({
    instruction: [
      ERROR_ANALYSIS_INSTRUCTION,
      '',
      `Contexto declarado: ${context}`,
      `Tecnologia declarada: ${technology}`
    ].join('\n') + `\n\n${buildPromptInjectionPolicyBlock()}`,
    text: textForLlm
  });
  const usageSummary = recordLlmUsage({
    status: result.status,
    inputTokens: llmResult.usage.inputTokens,
    outputTokens: llmResult.usage.outputTokens
  });

  sendJson(res, 200, addBudgetWarning({
    mode: 'error-analysis',
    status: result.status,
    risk: result.risk,
    findings: result.findings,
    sentToLLM: true,
    sentToClaude: true,
    context,
    technology,
    llmResponse: llmResult.text,
    claudeResponse: llmResult.text
  }, usageSummary));
}

async function handleAnalyzeErrorContext(body, res) {
  const validationError = validateErrorText(body.errorText);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const context = typeof body.context === 'string' && body.context.trim()
    ? body.context.trim()
    : 'unknown';
  const technology = typeof body.technology === 'string' && body.technology.trim()
    ? body.technology.trim()
    : 'unknown';
  const workspaceContext = normalizeWorkspaceContext(body.workspaceContext);
  const combinedPrompt = buildWorkspacePrompt({
    errorText: body.errorText,
    context,
    technology,
    workspaceContext
  });
  const result = sanitizeText(combinedPrompt);

  if (result.status === 'BLOCKED') {
    recordBlockedRequest();
    sendJson(res, 200, {
      mode: 'error-context-analysis',
      status: 'BLOCKED',
      risk: 'HIGH',
      findings: result.findings,
      sentToLLM: false,
      sentToClaude: false,
      message: 'El contenido contiene datos sensibles críticos y no fue enviado al LLM.',
      sanitizedText: result.sanitizedText
    });
    return;
  }

  if (isBudgetExceeded()) {
    sendJson(res, 200, budgetExceededPayload({
      mode: 'error-context-analysis',
      context,
      technology,
      filesReceived: workspaceContext.length
    }));
    return;
  }

  const textForLlm = result.status === 'SANITIZED' ? result.sanitizedText : combinedPrompt;
  const llmResult = await callLlm({
    instruction: withPromptInjectionPolicy(ERROR_CONTEXT_ANALYSIS_INSTRUCTION),
    text: textForLlm
  });
  const usageSummary = recordLlmUsage({
    status: result.status,
    inputTokens: llmResult.usage.inputTokens,
    outputTokens: llmResult.usage.outputTokens
  });

  sendJson(res, 200, addBudgetWarning({
    mode: 'error-context-analysis',
    status: result.status,
    risk: result.risk,
    findings: result.findings,
    sentToLLM: true,
    sentToClaude: true,
    context,
    technology,
    filesReceived: workspaceContext.length,
    llmResponse: llmResult.text,
    claudeResponse: llmResult.text
  }, usageSummary));
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const agentRunId = matchAgentRunPath(url.pathname);

  if (handleDashboardRoutes({
    req,
    res,
    pathname: url.pathname,
    sendHtml
  })) {
    return;
  }

  if (handleHealthRoutes({
    req,
    res,
    pathname: url.pathname,
    sendJson
  })) {
    return;
  }

  if (req.method === 'GET' && url.pathname === '/usage') {
    sendJson(res, 200, getUsageSummary());
    return;
  }

  if (handlePlatformRoutes({
    req,
    res,
    pathname: url.pathname,
    sendJson
  })) {
    return;
  }

  if (await handleAgentBuilderRoutes({
    req,
    res,
    pathname: url.pathname,
    sendJson
  })) {
    return;
  }

  if (await handleAgentAdminRoutes({
    req,
    res,
    pathname: url.pathname,
    sendJson
  })) {
    return;
  }

  if (handleModulesRoutes({
    req,
    res,
    pathname: url.pathname,
    sendHtml
  })) {
    return;
  }

  if (await handleExtensionRoutes({
    req,
    res,
    pathname: url.pathname,
    sendJson
  })) {
    return;
  }

  if (await handleSettingsRoutes({
    req,
    res,
    pathname: url.pathname,
    sendHtml,
    sendJson
  })) {
    return;
  }

  if (handleDownloadsRoutes({
    req,
    res,
    pathname: url.pathname,
    sendJson,
    vscodeExtensionFile: VSCODE_EXTENSION_FILE,
    vscodeExtensionDownloadName: VSCODE_EXTENSION_DOWNLOAD_NAME
  })) {
    return;
  }

  if (req.method === 'POST' && url.pathname === '/usage/reset') {
    const acceptsHtml = req.headers.accept?.includes('text/html');
    const summary = resetUsage();

    if (acceptsHtml) {
      res.writeHead(303, { location: '/dashboard' });
      res.end();
      return;
    }

    sendJson(res, 200, summary);
    return;
  }

  if (agentRunId && req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  if (agentRunId && req.method === 'POST') {
    await handleAgentRun(req, res, agentRunId);
    return;
  }

  if (req.method !== 'POST' && ['/sanitize', '/analyze', '/analyze-error', '/analyze-error-context', '/usage/reset'].includes(url.pathname)) {
    methodNotAllowed(res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/sanitize') {
    const body = await readJsonBody(req);
    const validationError = validateText(body.text);
    if (validationError) {
      sendJson(res, 400, { error: validationError });
      return;
    }
    sendJson(res, 200, sanitizeText(body.text));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/analyze') {
    const body = await readJsonBody(req);
    await handleAnalyze(body, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/analyze-error') {
    const body = await readJsonBody(req);
    await handleAnalyzeError(body, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/analyze-error-context') {
    const body = await readJsonBody(req);
    await handleAnalyzeErrorContext(body, res);
    return;
  }

  notFound(res);
}

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || 'Internal Server Error'
    });
  }
});

server.listen(PORT, () => {
  console.log(`qa-ia-platform listening on http://localhost:${PORT}/dashboard`);
});
