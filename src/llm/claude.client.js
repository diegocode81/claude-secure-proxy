const ANTHROPIC_VERSION = '2023-06-01';

export async function callClaude({ instruction, text, apiKey, model, maxTokens, temperature } = {}) {
  const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;
  const effectiveModel = model || process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';
  const effectiveMaxTokens = Number(maxTokens || process.env.MAX_TOKENS || 1800);
  const effectiveTemperature = Number.isFinite(Number(temperature))
    ? Math.min(1, Math.max(0, Number(temperature)))
    : undefined;

  if (!effectiveApiKey) {
    throw new Error('ANTHROPIC_API_KEY no esta configurada.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': effectiveApiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model: effectiveModel,
      max_tokens: effectiveMaxTokens,
      ...(effectiveTemperature === undefined ? {} : { temperature: effectiveTemperature }),
      messages: [
        {
          role: 'user',
          content: `${instruction}\n\nContenido a analizar:\n${text}`
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`LLM API error ${response.status}: ${detail}`);
  }

  const textResponse = payload.content
    ?.filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n')
    .trim() || '';

  return {
    text: textResponse,
    usage: {
      inputTokens: Number(payload.usage?.input_tokens || 0),
      outputTokens: Number(payload.usage?.output_tokens || 0)
    }
  };
}
