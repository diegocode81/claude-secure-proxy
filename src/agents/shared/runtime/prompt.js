export function buildPromptWithAgent(agent, input) {
  if (typeof agent?.buildPrompt !== 'function') {
    throw new Error('Agent runtime requires buildPrompt(input).');
  }

  const prompt = agent.buildPrompt(input);

  if (!prompt || typeof prompt.instruction !== 'string' || typeof prompt.text !== 'string') {
    throw new Error('buildPrompt(input) must return { instruction, text }.');
  }

  return prompt;
}

export function normalizeAgentResponse(agent, claudeResult, context = {}) {
  if (typeof agent?.normalizeResponse === 'function') {
    return agent.normalizeResponse(claudeResult, context);
  }

  return {
    agentId: agent.id,
    claudeResponse: claudeResult.text
  };
}
