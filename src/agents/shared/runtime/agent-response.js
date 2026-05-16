export function createAgentResponse({
  agentId,
  status,
  sentToClaude = false,
  summary = '',
  data = {},
  risks = [],
  recommendations = [],
  rawModelText = ''
}) {
  return {
    agentId,
    status,
    sentToClaude,
    summary,
    data,
    risks,
    recommendations,
    rawModelText
  };
}
