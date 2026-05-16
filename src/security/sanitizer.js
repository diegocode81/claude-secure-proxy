const BLOCK_PATTERNS = [
  {
    type: 'PRIVATE_KEY',
    label: 'Clave privada detectada',
    regex: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE KEY-----[\s\S]*?-----END\s+(RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE KEY-----/i
  },
  {
    type: 'AWS_SECRET_ACCESS_KEY',
    label: 'AWS Secret Access Key detectada',
    regex: /\baws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/i
  },
  {
    type: 'BEARER_TOKEN',
    label: 'Bearer token detectado',
    regex: /\bBearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/i
  },
  {
    type: 'PASSWORD_ASSIGNMENT',
    label: 'Password, secret o credential explícito detectado',
    regex: /\b(password|pwd|pass|secret|client_secret|credential|credentials)\b\s*[:=]\s*["']?[^"'\s]+/i
  }
];

const SANITIZE_PATTERNS = [
  {
    type: 'JWT',
    label: 'JWT reemplazado',
    regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    replacement: '[REDACTED_JWT]'
  },
  {
    type: 'BEARER_TOKEN',
    label: 'Bearer token reemplazado',
    regex: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi,
    replacement: 'Bearer [REDACTED_TOKEN]'
  },
  {
    type: 'ANTHROPIC_API_KEY',
    label: 'API key de Anthropic reemplazada',
    regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
    replacement: '[REDACTED_ANTHROPIC_API_KEY]'
  },
  {
    type: 'OPENAI_API_KEY',
    label: 'API key de OpenAI reemplazada',
    regex: /\bsk-[A-Za-z0-9]{20,}\b/g,
    replacement: '[REDACTED_OPENAI_API_KEY]'
  },
  {
    type: 'AWS_ACCESS_KEY_ID',
    label: 'AWS Access Key ID reemplazada',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    replacement: '[REDACTED_AWS_ACCESS_KEY_ID]'
  },
  {
    type: 'EMAIL',
    label: 'Email reemplazado',
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: '[REDACTED_EMAIL]'
  },
  {
    type: 'CREDIT_CARD',
    label: 'Numero de tarjeta reemplazado',
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: '[REDACTED_CARD]'
  },
  {
    type: 'IPV4',
    label: 'Direccion IPv4 reemplazada',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    replacement: '[REDACTED_IP]'
  }
];

export function sanitizeText(text) {
  const source = typeof text === 'string' ? text : '';
  const findings = [];

  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.regex.test(source)) {
      findings.push({
        type: pattern.type,
        severity: 'HIGH',
        message: pattern.label
      });
    }
  }

  if (findings.length > 0) {
    return {
      status: 'BLOCKED',
      risk: 'HIGH',
      findings,
      sanitizedText: '[BLOCKED_CRITICAL_SENSITIVE_CONTENT]'
    };
  }

  let sanitizedText = source;
  for (const pattern of SANITIZE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(sanitizedText)) {
      findings.push({
        type: pattern.type,
        severity: 'MEDIUM',
        message: pattern.label
      });
      pattern.regex.lastIndex = 0;
      sanitizedText = sanitizedText.replace(pattern.regex, pattern.replacement);
    }
  }

  if (findings.length > 0) {
    return {
      status: 'SANITIZED',
      risk: 'MEDIUM',
      findings,
      sanitizedText
    };
  }

  return {
    status: 'ALLOWED',
    risk: 'LOW',
    findings: [],
    sanitizedText: source
  };
}
