import { callLlm } from '../../../llm/llm.client.js';
import { normalizeAgentLlmSettings } from '../llm-settings.js';
import { sanitizeText } from '../../../security/sanitizer.js';
import {
  recordBlockedRequest,
  recordLlmUsage
} from '../../../usage/usage-store.js';
import { isBudgetExceeded } from '../../../usage/budget-service.js';
import { buildPromptWithAgent, normalizeAgentResponse } from './prompt.js';
import { AGENT_RUNTIME_STATUS } from './status.js';
import { validateWithAgent } from './validation.js';

export async function runAgent(agent, input, services = {}) {
  const llmClient = services.callLlm || services.callClaude || callLlm;
  const sanitizer = services.sanitizeText || sanitizeText;
  const budgetExceeded = services.isBudgetExceeded || isBudgetExceeded;
  const recordBlocked = services.recordBlockedRequest || recordBlockedRequest;
  const recordUsage = services.recordLlmUsage || services.recordClaudeUsage || recordLlmUsage;
  const llmSettings = normalizeAgentLlmSettings(agent.llmSettings || {});

  const validatedInput = validateWithAgent(agent, input);
  const prompt = buildPromptWithAgent(agent, validatedInput);
  const sanitized = sanitizer(prompt.text);

  if (sanitized.status === AGENT_RUNTIME_STATUS.BLOCKED) {
    recordBlocked();
    return {
      agentId: agent.id,
      status: AGENT_RUNTIME_STATUS.BLOCKED,
      risk: sanitized.risk,
      findings: sanitized.findings,
      sentToLLM: false,
      sentToClaude: false,
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
    : prompt.text;
  const llmResult = await llmClient({
    instruction: prompt.instruction,
    text: textForLlm,
    maxTokens: llmSettings.maxOutputTokens,
    temperature: llmSettings.temperature
  });
  const usageSummary = recordUsage({
    status: sanitized.status,
    inputTokens: llmResult.usage.inputTokens,
    outputTokens: llmResult.usage.outputTokens
  });

  return {
    agentId: agent.id,
    status: sanitized.status,
    risk: sanitized.risk,
    findings: sanitized.findings,
    sentToLLM: true,
    sentToClaude: true,
    usage: usageSummary,
    ...normalizeAgentResponse(agent, llmResult, {
      input: validatedInput,
      prompt,
      sanitized
    })
  };
}
