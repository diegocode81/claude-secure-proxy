import { getVisibleAgentResponse } from './agent-output-document.js';

export function createAgentResponse({
  agentId,
  status,
  sentToLLM,
  sentToClaude = false,
  summary = '',
  data = {},
  risks = [],
  recommendations = [],
  llmResponse = '',
  claudeResponse = '',
  rawModelText = ''
}) {
  const visibleResponse = getVisibleAgentResponse({
    llmResponse,
    claudeResponse,
    rawModelText
  });

  return {
    agentId,
    status,
    sentToLLM: sentToLLM ?? sentToClaude,
    sentToClaude,
    summary,
    data,
    risks,
    recommendations,
    llmResponse: visibleResponse,
    claudeResponse,
    rawModelText
  };
}

export { getVisibleAgentResponse };
