import { getLlmRuntimeSettings } from '../settings/platform-settings.service.js';
import { callLlm } from '../llm/llm.client.js';
import { validateAgentLlmSettings } from '../agents/shared/llm-settings.js';
import {
  buildInputContractFromIO,
  buildOutputSchemaFromIO,
  normalizeAgentIO,
} from '../agents/shared/contracts.js';
import { resolveOutputFieldsFromIO } from '../agents/shared/io.js';
import { buildPromptInjectionPolicyBlock } from '../security/prompt-injection-policy.js';
import {
  isBudgetExceeded,
  recordBlockedRequest,
  recordLlmUsage
} from '../usage/usage-store.js';
import { withRefresh } from '../platform/platform-refresh.service.js';

const INPUT_FIELDS = ['name', 'agentId', 'description', 'role'];
const REQUIRED_OUTPUT_FIELDS = ['summary', 'data', 'risks', 'recommendations', 'openQuestions'];
const LLM_AUTHENTICATION_ERROR_MESSAGE = 'La API key del LLM es inválida, expiró o no está autorizada. Revisa Configuración > LLM.';
const LLM_API_KEY_NOT_CONFIGURED_MESSAGE = 'No hay una API key válida configurada para el LLM. Revisa Configuración > LLM o variables de entorno.';

function invalidInput(errors) {
  return {
    status: 'AGENT_AI_SUGGESTION_INVALID_INPUT',
    sentToLLM: false,
    sentToClaude: false,
    errors
  };
}

function invalidOutput(errors, rawModelText = '') {
  return {
    status: 'AGENT_AI_SUGGESTION_INVALID_OUTPUT',
    sentToLLM: true,
    sentToClaude: false,
    errors,
    rawModelText
  };
}

function llmAuthenticationError() {
  return {
    status: 'LLM_AUTHENTICATION_ERROR',
    sentToLLM: true,
    sentToClaude: false,
    rawModelText: '',
    errors: [LLM_AUTHENTICATION_ERROR_MESSAGE]
  };
}

function llmApiKeyNotConfigured() {
  return {
    status: 'LLM_API_KEY_NOT_CONFIGURED',
    sentToLLM: false,
    sentToClaude: false,
    errors: [LLM_API_KEY_NOT_CONFIGURED_MESSAGE]
  };
}

function budgetBlocked() {
  recordBlockedRequest();
  return {
    status: 'AGENT_AI_SUGGESTION_BUDGET_BLOCKED',
    sentToLLM: false,
    sentToClaude: false,
    summary: 'La sugerencia IA fue bloqueada por control de presupuesto.'
  };
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4));
}

function estimateCostUsd(inputTokens, outputTokens) {
  const inputCostPer1M = Number(process.env.INPUT_COST_PER_1M_TOKENS || 3);
  const outputCostPer1M = Number(process.env.OUTPUT_COST_PER_1M_TOKENS || 15);
  return Math.round((((inputTokens / 1000000) * inputCostPer1M) + ((outputTokens / 1000000) * outputCostPer1M)) * 10000) / 10000;
}

function validateInput(input) {
  const fields = Object.keys(input || {});
  const unknownFields = fields.filter((field) => !INPUT_FIELDS.includes(field));
  const errors = [];
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const agentId = typeof input?.agentId === 'string' ? input.agentId.trim() : '';
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  const role = typeof input?.role === 'string' ? input.role.trim() : '';

  if (unknownFields.length > 0) {
    errors.push(`Unknown fields are not allowed: ${unknownFields.join(', ')}.`);
  }

  if (name.length < 5) {
    errors.push('name must be a string with at least 5 characters.');
  }

  if (agentId.length < 5 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agentId)) {
    errors.push('agentId must be kebab-case with at least 5 characters.');
  }

  if (agentId === 'qa-log-analyst') {
    errors.push('qa-log-analyst is protected and cannot be used for suggestions.');
  }

  if (description.length < 20) {
    errors.push('description must be a string with at least 20 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      name,
      agentId,
      description,
      role
    }
  };
}

function buildInstruction() {
  return `Eres un arquitecto QA senior especializado en plataformas QA asistidas por IA, análisis funcional, automatización, criterios de aceptación, escenarios de prueba, gobierno de agentes y seguridad de prompts.

Tu tarea es proponer la definición inicial de un agente QA para una plataforma gobernada.

Debes responder exclusivamente JSON válido.
No incluyas Markdown fuera de los campos Markdown.
No incluyas explicaciones fuera del JSON.
No inventes endpoints reales.
No incluyas secretos.
No incluyas API keys.
No incluyas datos sensibles.
No actives runtime.
No propongas execution.enabled true.
No propongas mode runtime-enabled.
No uses la palabra Claude como cerebro de plataforma; usa LLM.
El agente debe iniciar siempre deshabilitado.
El agente debe pasar por sanitización, presupuesto, revisión humana y pruebas antes de activarse.
Diferencia evidencia de hipótesis.
El prompt oficial del agente debe evitar invenciones.
El agente debe pedir preguntas abiertas cuando falte información.
El agente debe producir salidas estructuradas.
El diseño debe ser útil para QA real.
${buildPromptInjectionPolicyBlock()}

Devuelve exactamente este JSON:
{
  "role": "string",
  "useCases": ["string"],
  "capabilities": ["string"],
  "inputMode": "text",
  "outputMode": "screen",
  "responsePreset": "qa_standard",
  "outputFields": ["summary", "data", "risks", "recommendations", "openQuestions"],
  "skillMarkdown": "string markdown",
  "promptMarkdown": "string markdown",
  "contractMarkdown": "string markdown",
  "readinessChecklistMarkdown": "string markdown",
  "llmSettings": {
    "responseDetailLevel": "standard",
    "maxOutputTokens": 1500,
    "temperature": 0.2,
    "justification": "string"
  }
}

Reglas de calidad:
- role debe explicar claramente el rol QA del agente.
- useCases debe tener entre 3 y 7 casos de uso.
- capabilities debe tener entre 5 y 10 capacidades.
- inputMode debe ser text, file o text_and_file.
- outputMode debe ser screen, download o screen_and_download.
- responsePreset debe ser qa_standard, qa_acceptance_and_scenarios, executive_report, technical_analysis o custom.
- outputFields solo se usa si responsePreset es custom.
- Si la descripción habla de requerimientos, historias de usuario o criterios QA, sugiere responsePreset qa_acceptance_and_scenarios.
- Si la descripción habla de reportes K6, performance, métricas o reportes gerenciales, sugiere responsePreset executive_report.
- Si la descripción habla de logs, defectos o análisis técnico, sugiere responsePreset technical_analysis.
- Para análisis QA general, sugiere responsePreset qa_standard.
- skillMarkdown debe tener secciones: Skill, Propósito, Capacidades, Límites, Datos permitidos, Datos prohibidos, Riesgos, Criterios de calidad.
- promptMarkdown debe tener secciones: Prompt oficial, Rol, Instrucciones, Reglas de seguridad, Formato de salida, Manejo de incertidumbre.
- contractMarkdown debe tener secciones: Contract, Request, Response, Estados, Errores, Ejemplos seguros.
- readinessChecklistMarkdown debe tener checklist en Markdown con casillas.
- llmSettings debe sugerir responseDetailLevel, maxOutputTokens, temperature y justification breve.
- Agentes de validación rápida: brief y 800 tokens.
- Agentes de análisis QA normal: standard y 1500 tokens.
- Agentes de requerimientos/casos de prueba: detailed y 2500 a 3000 tokens.
- Agentes de reportes gerenciales o performance/k6: detailed y 3000 tokens.
- Agentes de análisis extenso documental: extensive y 5000 tokens.
- temperature para QA debe estar entre 0.1 y 0.3.
- No sugerir más de 5000 tokens salvo justificación clara; nunca más de 8000.
- Todo debe estar en español.
- Todo debe estar enfocado en QA.
- Todo debe ser compatible con creación gobernada de agentes.
- Responde de forma compacta.
- useCases debe tener 3 a 5 items.
- capabilities debe tener 5 a 8 items.
- skillMarkdown debe tener entre 220 y 700 caracteres.
- promptMarkdown debe tener entre 220 y 700 caracteres.
- contractMarkdown debe tener entre 220 y 700 caracteres.
- readinessChecklistMarkdown debe tener entre 120 y 500 caracteres.`;
}

function buildUserPrompt(input) {
  return [
    'Datos del agente solicitado:',
    `name: ${input.name}`,
    `agentId: ${input.agentId}`,
    `description: ${input.description}`,
    input.role ? `role existente: ${input.role}` : 'role existente: no proporcionado',
    '',
    'Estándar de plataforma:',
    '- Todo agente inicia con execution.enabled = false.',
    '- Todo agente inicia con mode = runtime-disabled.',
    '- La creación requiere sanitización, presupuesto, revisión humana y pruebas.',
    '- No proponer endpoints productivos inventados.',
    '- No proponer secretos, API keys ni datos sensibles.',
    '- Usar LLM como término genérico para el cerebro de plataforma.',
    '',
    'Campos esperados:',
    'role, useCases, capabilities, inputMode, outputMode, responsePreset, outputFields, skillMarkdown, promptMarkdown, contractMarkdown, readinessChecklistMarkdown.'
  ].join('\n');
}

async function callConfiguredLlm({ instruction, text }) {
  const settings = getLlmRuntimeSettings();
  const provider = settings.provider || 'claude';

  if (!settings.apiKeyConfigured || !settings.apiKey) {
    return {
      configured: false,
      reason: 'missing-api-key',
      text: ''
    };
  }

  if (provider !== 'claude') {
    return {
      configured: false,
      reason: 'unsupported-provider',
      text: ''
    };
  }

  const maxTokens = Math.max(Number(process.env.MAX_TOKENS || 0), 6000);
  const result = await callLlm({
    instruction,
    text: `Solicitud:\n${text}`,
    maxTokens,
    temperature: 0.2
  });

  return {
    configured: true,
    text: result.text,
    usage: {
      inputTokens: Number(result.usage?.inputTokens || estimateTokens(`${instruction}\n\n${text}`)),
      outputTokens: Number(result.usage?.outputTokens || 0)
    }
  };
}

function parseStrictJson(rawModelText) {
  const trimmed = String(rawModelText || '').trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
    return {
      parsed: null,
      errors: ['LLM output must be strict JSON with no text before or after the JSON object.']
    };
  }

  try {
    return {
      parsed: JSON.parse(candidate),
      errors: []
    };
  } catch {
    return {
      parsed: null,
      errors: ['LLM output is not valid JSON.']
    };
  }
}

function includesForbiddenContent(value) {
  return /execution\.enabled\s*[:=]\s*true|runtime-enabled|sk-[a-z0-9_-]{12,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+PRIVATE KEY-----|password\s*[:=]\s*\S+|token\s*[:=]\s*\S+|api[_-]?key\s*[:=]\s*\S+/i.test(value);
}

function normalizeText(value) {
  return String(value || '').replaceAll('Claude', 'LLM');
}

function validateSuggestion(parsed) {
  const errors = [];

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: ['Suggestion must be a JSON object.'],
      data: null
    };
  }

  const role = normalizeText(parsed.role).trim();
  const useCases = Array.isArray(parsed.useCases) ? parsed.useCases.map(normalizeText).map((item) => item.trim()).filter(Boolean) : [];
  const capabilities = Array.isArray(parsed.capabilities) ? parsed.capabilities.map(normalizeText).map((item) => item.trim()).filter(Boolean) : [];
  const skillMarkdown = normalizeText(parsed.skillMarkdown).trim();
  const promptMarkdown = normalizeText(parsed.promptMarkdown).trim();
  const contractMarkdown = normalizeText(parsed.contractMarkdown).trim();
  const readinessChecklistMarkdown = normalizeText(parsed.readinessChecklistMarkdown).trim();
  const io = normalizeAgentIO({
    inputMode: parsed.inputMode || 'text',
    outputMode: parsed.outputMode || 'screen',
    responsePreset: parsed.responsePreset || 'qa_standard',
    outputFields: parsed.outputFields || parsed.outputSchema?.fields || REQUIRED_OUTPUT_FIELDS
  });
  const inputContract = buildInputContractFromIO(io);
  const outputSchema = buildOutputSchemaFromIO(io);
  const outputFields = resolveOutputFieldsFromIO(io);
  const llmSettingsErrors = [];
  const llmSettings = validateAgentLlmSettings({
    ...(parsed.llmSettings || {}),
    budgetPolicy: {
      enforceMonthlyBudget: true,
      rejectIfEstimatedCostExceedsRemainingBudget: true
    }
  }, llmSettingsErrors);
  const llmSettingsJustification = normalizeText(parsed.llmSettings?.justification || '').trim();
  const serialized = JSON.stringify(parsed);

  if (role.length < 20) errors.push('role must be at least 20 characters.');
  if (useCases.length < 3 || useCases.length > 7) errors.push('useCases must include 3 to 7 items.');
  if (capabilities.length < 5 || capabilities.length > 10) errors.push('capabilities must include 5 to 10 items.');
  if (!inputContract || typeof inputContract !== 'object' || Array.isArray(inputContract)) errors.push('inputContract must be an object.');
  if (!Array.isArray(inputContract?.required)) errors.push('inputContract.required must be an array.');
  if (!Array.isArray(inputContract?.requiredAnyOf)) errors.push('inputContract.requiredAnyOf must be an array.');
  if (!Array.isArray(inputContract?.optional)) errors.push('inputContract.optional must be an array.');
  if (inputContract?.disallowUnknownFields !== true) errors.push('inputContract.disallowUnknownFields must be true.');
  if (!['text', 'file', 'text_and_file'].includes(io.inputMode)) errors.push('inputMode must be text, file or text_and_file.');
  if (!['screen', 'download', 'screen_and_download'].includes(io.outputMode)) errors.push('outputMode must be screen, download or screen_and_download.');
  if (!['qa_standard', 'qa_acceptance_and_scenarios', 'executive_report', 'technical_analysis', 'custom'].includes(io.responsePreset)) {
    errors.push('responsePreset is not valid.');
  }
  if (io.responsePreset === 'custom' && outputFields.length === 0) {
    errors.push('outputFields must include at least one item when responsePreset is custom.');
  }
  if (skillMarkdown.length < 200) errors.push('skillMarkdown must be at least 200 characters.');
  if (promptMarkdown.length < 200) errors.push('promptMarkdown must be at least 200 characters.');
  if (contractMarkdown.length < 200) errors.push('contractMarkdown must be at least 200 characters.');
  if (readinessChecklistMarkdown.length < 100) errors.push('readinessChecklistMarkdown must be at least 100 characters.');
  errors.push(...llmSettingsErrors);
  if (includesForbiddenContent(serialized)) errors.push('Suggestion contains forbidden runtime or sensitive content.');

  return {
    valid: errors.length === 0,
    errors,
    data: {
      role,
      useCases,
      capabilities,
      inputMode: io.inputMode,
      outputMode: io.outputMode,
      responsePreset: io.responsePreset,
      outputFields,
      skillMarkdown,
      promptMarkdown,
      contractMarkdown,
      readinessChecklistMarkdown,
      llmSettings: {
        ...llmSettings,
        justification: llmSettingsJustification || 'Configuración segura por defecto para agente QA.'
      }
    }
  };
}

export async function suggestAgentDefinition(input) {
  const validation = validateInput(input);

  if (!validation.valid) {
    return invalidInput(validation.errors);
  }

  if (isBudgetExceeded()) {
    return budgetBlocked();
  }

  let llmResult;
  const instruction = buildInstruction();
  const promptText = buildUserPrompt(validation.data);
  try {
    llmResult = await callConfiguredLlm({
      instruction,
      text: promptText
    });
  } catch (error) {
    if (error.code === 'LLM_AUTHENTICATION_ERROR' || error.statusCode === 401) {
      return llmAuthenticationError();
    }

    return invalidOutput([error.message || 'LLM suggestion failed.'], '');
  }

  if (!llmResult.configured) {
    if (llmResult.reason === 'missing-api-key') {
      return llmApiKeyNotConfigured();
    }

    return {
      status: 'LLM_NOT_CONFIGURED',
      sentToLLM: false,
      sentToClaude: false,
      summary: 'No hay LLM configurado para generar sugerencias IA.'
    };
  }

  const inputTokens = Number(llmResult.usage?.inputTokens || estimateTokens(`${instruction}\n\n${promptText}`));
  const outputTokens = Number(llmResult.usage?.outputTokens || estimateTokens(llmResult.text));
  const usageSummary = recordLlmUsage({
    status: 'ALLOWED',
    inputTokens,
    outputTokens
  });
  const usage = {
    inputTokens,
    outputTokens,
    estimatedCostUsd: estimateCostUsd(inputTokens, outputTokens),
    usageRegistered: true
  };

  const parsed = parseStrictJson(llmResult.text);
  if (parsed.errors.length > 0) {
    return {
      ...invalidOutput(parsed.errors, llmResult.text),
      usage
    };
  }

  const suggestion = validateSuggestion(parsed.parsed);
  if (!suggestion.valid) {
    return {
      ...invalidOutput(suggestion.errors, llmResult.text),
      usage
    };
  }

  return withRefresh({
    status: 'AGENT_AI_SUGGESTION_READY',
    sentToLLM: true,
    sentToClaude: false,
    usage,
    data: suggestion.data,
    risks: [],
    recommendations: [
      'Revisa y ajusta la sugerencia antes de crear el agente.',
      'La sugerencia no crea archivos, no registra agentes y no activa runtime.'
    ]
  }, 'usage-updated');
}
