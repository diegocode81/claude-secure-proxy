import { callLlm } from '../../../llm/llm.client.js';
import { normalizeAgentLlmSettings } from '../llm-settings.js';
import { detectAgentResponseState } from '../../../runtime/agent-response-state.js';
import {
  clearPendingAgentContext,
  getPendingAgentContext,
  savePendingAgentContext
} from '../../../runtime/pending-agent-context.store.js';
import { sanitizeText } from '../../../security/sanitizer.js';
import {
  recordBlockedRequest,
  recordLlmUsage
} from '../../../usage/usage-store.js';
import { isBudgetExceeded } from '../../../usage/budget-service.js';
import { buildPromptWithAgent, normalizeAgentResponse } from './prompt.js';
import { AGENT_RUNTIME_STATUS } from './status.js';
import { validateWithAgent } from './validation.js';

const MAX_CLARIFICATION_ROUNDS = 2;

function blockedRecommendations() {
  return [
    'Elimina nombres, cédulas, teléfonos, correos, cuentas, tarjetas, CVV, tokens, claves y secretos antes de ejecutar el agente.',
    'Reemplaza los valores por marcadores seguros como CLIENTE_001, CUENTA_REMOVIDA, TARJETA_REMOVIDA, TOKEN_REMOVIDO o SECRET_REMOVIDO.'
  ];
}

function clarificationCount(context) {
  const count = Number(context?.clarificationCount);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
}

function buildAccumulatedInteractionText(pendingContext, currentUserInput) {
  const lines = [
    'Contexto acumulado de la interacción anterior:',
    '[INPUT ORIGINAL DEL USUARIO]',
    pendingContext.originalUserInput,
    '',
    'Respuesta anterior del agente solicitando aclaración:',
    pendingContext.previousAgentResponse,
    '',
    'Nueva información proporcionada por el usuario:',
    currentUserInput,
    '',
    'Instrucción de continuidad:',
    'Usa toda la información acumulada para continuar el análisis. Si la nueva información responde suficientemente las preguntas abiertas, genera el entregable completo solicitado por el agente. No vuelvas a pedir información ya proporcionada. Solo formula nuevas preguntas si todavía falta información crítica para producir una respuesta responsable.'
  ];

  if (clarificationCount(pendingContext) >= MAX_CLARIFICATION_ROUNDS) {
    lines.push(
      '',
      'Límite de aclaraciones alcanzado:',
      'Ya se alcanzó el máximo de rondas de aclaración permitidas para esta interacción. No respondas únicamente pidiendo más información. Genera la mejor respuesta posible con la evidencia disponible. Si falta información, declárala en secciones de Limitaciones, Supuestos y Preguntas abiertas no resueltas, pero entrega el informe, criterios, escenarios, riesgos y recomendaciones que sí puedan derivarse responsablemente.'
    );
  }

  return lines.join('\n');
}

function logPendingContext(action, agentId) {
  console.info(`[agent-runtime] pending context ${action} for agent ${agentId}`);
}

function logClarificationLimit(agentId) {
  console.warn(`[agent-runtime] clarification limit reached for agent ${agentId}; pending context cleared`);
}

export async function runAgent(agent, input, services = {}) {
  const llmClient = services.callLlm || services.callClaude || callLlm;
  const sanitizer = services.sanitizeText || sanitizeText;
  const budgetExceeded = services.isBudgetExceeded || isBudgetExceeded;
  const recordBlocked = services.recordBlockedRequest || recordBlockedRequest;
  const recordUsage = services.recordLlmUsage || services.recordClaudeUsage || recordLlmUsage;
  const getPendingContext = services.getPendingAgentContext || getPendingAgentContext;
  const savePendingContext = services.savePendingAgentContext || savePendingAgentContext;
  const clearPendingContext = services.clearPendingAgentContext || clearPendingAgentContext;
  const detectResponseState = services.detectAgentResponseState || detectAgentResponseState;
  const llmSettings = normalizeAgentLlmSettings(agent.llmSettings || {});

  const validatedInput = validateWithAgent(agent, input);
  const prompt = buildPromptWithAgent(agent, validatedInput);
  const currentSanitized = sanitizer(prompt.text);

  if (currentSanitized.status === AGENT_RUNTIME_STATUS.BLOCKED) {
    recordBlocked();
    return {
      agentId: agent.id,
      status: AGENT_RUNTIME_STATUS.BLOCKED,
      risk: currentSanitized.risk,
      findings: currentSanitized.findings,
      summary: 'Solicitud bloqueada por seguridad. La entrada contiene posibles datos sensibles, credenciales, tokens, datos financieros o información personal y no fue enviada al LLM.',
      recommendations: blockedRecommendations(),
      sentToLLM: false,
      sentToClaude: false,
      llmResponse: '',
      claudeResponse: '',
      rawModelText: '',
      sanitizedText: currentSanitized.sanitizedText
    };
  }

  const pendingContext = getPendingContext(agent.id);
  const effectivePrompt = pendingContext
    ? {
        ...prompt,
        text: buildAccumulatedInteractionText(
          pendingContext,
          currentSanitized.status === AGENT_RUNTIME_STATUS.SANITIZED
            ? currentSanitized.sanitizedText
            : prompt.text
        )
      }
    : prompt;
  const sanitized = pendingContext ? sanitizer(effectivePrompt.text) : currentSanitized;

  if (pendingContext) {
    logPendingContext('reused', agent.id);
  }

  if (sanitized.status === AGENT_RUNTIME_STATUS.BLOCKED) {
    recordBlocked();
    return {
      agentId: agent.id,
      status: AGENT_RUNTIME_STATUS.BLOCKED,
      risk: sanitized.risk,
      findings: sanitized.findings,
      summary: 'Solicitud bloqueada por seguridad. La entrada contiene posibles datos sensibles, credenciales, tokens, datos financieros o información personal y no fue enviada al LLM.',
      recommendations: blockedRecommendations(),
      sentToLLM: false,
      sentToClaude: false,
      llmResponse: '',
      claudeResponse: '',
      rawModelText: '',
      sanitizedText: sanitized.sanitizedText
    };
  }

  if (budgetExceeded()) {
    return {
      agentId: agent.id,
      status: AGENT_RUNTIME_STATUS.BUDGET_EXCEEDED,
      sentToLLM: false,
      sentToClaude: false,
      message: 'Monthly LLM API budget exceeded.'
    };
  }

  const textForLlm = sanitized.status === AGENT_RUNTIME_STATUS.SANITIZED
    ? sanitized.sanitizedText
    : effectivePrompt.text;
  const llmResult = await llmClient({
    instruction: effectivePrompt.instruction,
    text: textForLlm,
    maxTokens: llmSettings.maxOutputTokens,
    temperature: llmSettings.temperature
  });
  const usageSummary = recordUsage({
    status: sanitized.status,
    inputTokens: llmResult.usage.inputTokens,
    outputTokens: llmResult.usage.outputTokens
  });
  const normalizedResponse = normalizeAgentResponse(agent, llmResult, {
    input: validatedInput,
    prompt: effectivePrompt,
    sanitized
  });
  const responseText = normalizedResponse.llmResponse || normalizedResponse.claudeResponse || normalizedResponse.rawModelText || llmResult.text;
  const responseState = detectResponseState(responseText);

  if (responseState === 'needs_more_information') {
    const currentClarificationCount = pendingContext ? clarificationCount(pendingContext) : 0;
    if (currentClarificationCount >= MAX_CLARIFICATION_ROUNDS) {
      clearPendingContext(agent.id);
      logClarificationLimit(agent.id);
    } else {
      savePendingContext(agent.id, {
        originalUserInput: pendingContext?.originalUserInput || prompt.text,
        previousAgentResponse: responseText,
        clarificationCount: currentClarificationCount + 1
      });
      logPendingContext('saved', agent.id);
    }
  } else if (pendingContext) {
    clearPendingContext(agent.id);
    logPendingContext('cleared', agent.id);
  }

  return {
    agentId: agent.id,
    status: sanitized.status,
    risk: sanitized.risk,
    findings: sanitized.findings,
    sentToLLM: true,
    sentToClaude: true,
    usage: usageSummary,
    ...normalizedResponse
  };
}
