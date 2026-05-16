import { callClaude } from '../../../llm/claude.client.js';
import { sanitizeText } from '../../../security/sanitizer.js';
import {
  recordBlockedRequest,
  recordClaudeUsage
} from '../../../usage/usage-store.js';
import { isBudgetExceeded } from '../../../usage/budget-service.js';
import { buildPromptWithAgent, normalizeAgentResponse } from './prompt.js';
import { AGENT_RUNTIME_STATUS } from './status.js';
import { validateWithAgent } from './validation.js';

export async function runAgent(agent, input, services = {}) {
  const claudeClient = services.callClaude || callClaude;
  const sanitizer = services.sanitizeText || sanitizeText;
  const budgetExceeded = services.isBudgetExceeded || isBudgetExceeded;
  const recordBlocked = services.recordBlockedRequest || recordBlockedRequest;
  const recordUsage = services.recordClaudeUsage || recordClaudeUsage;

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
      sentToClaude: false,
      sanitizedText: sanitized.sanitizedText
    };
  }

  if (budgetExceeded()) {
    return {
      agentId: agent.id,
      status: AGENT_RUNTIME_STATUS.BUDGET_EXCEEDED,
      sentToClaude: false,
      message: 'Monthly Claude API budget exceeded.'
    };
  }

  const textForClaude = sanitized.status === AGENT_RUNTIME_STATUS.SANITIZED
    ? sanitized.sanitizedText
    : prompt.text;
  const claudeResult = await claudeClient({
    instruction: prompt.instruction,
    text: textForClaude
  });
  const usageSummary = recordUsage({
    status: sanitized.status,
    inputTokens: claudeResult.usage.inputTokens,
    outputTokens: claudeResult.usage.outputTokens
  });

  return {
    agentId: agent.id,
    status: sanitized.status,
    risk: sanitized.risk,
    findings: sanitized.findings,
    sentToClaude: true,
    usage: usageSummary,
    ...normalizeAgentResponse(agent, claudeResult, {
      input: validatedInput,
      prompt,
      sanitized
    })
  };
}
