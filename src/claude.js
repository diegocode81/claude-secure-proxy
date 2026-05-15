const ANTHROPIC_VERSION = '2023-06-01';

export async function callClaude({ instruction, text }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';
  const maxTokens = Number(process.env.MAX_TOKENS || 1800);

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY no esta configurada.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
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
    throw new Error(`Claude API error ${response.status}: ${detail}`);
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
