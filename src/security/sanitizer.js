const BLOCK_PATTERNS = [
  {
    type: 'PRIVATE_KEY',
    label: 'Se detectó posible clave privada.',
    regex: /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE KEY-----[\s\S]*?-----END\s+(RSA|DSA|EC|OPENSSH|PGP)?\s*PRIVATE KEY-----/i
  },
  {
    type: 'SENSITIVE_CREDENTIAL_FIELD',
    label: 'Se detectó posible credencial, token, secreto o dato de sesión.',
    regex: /\b(?:access[_\s-]?token|refresh[_\s-]?token|id[_\s-]?token|auth[_\s-]?token|accessToken|refreshToken|idToken|authToken|bearer|authorization|api[_\s-]?key|apikey|apiKey|x[_\s-]?api[_\s-]?key|client[_\s-]?secret|clientSecret|session[_\s-]?id|sessionid|sessionId|jsessionid|JSESSIONID|cookie|set[_\s-]?cookie|xsrf[_\s-]?token|csrf[_\s-]?token|private[_\s-]?key|privateKey|begin\s+private\s+key|ssh-rsa)\b/i
  },
  {
    type: 'SENSITIVE_CREDENTIAL_ASSIGNMENT',
    label: 'Se detectó posible credencial, token, secreto o dato de sesión.',
    regex: /\b(?:secret|password|passwd|pwd|contraseña|contrasena|clave(?:\s+temporal)?|token|jwt|authorization|credential|credentials|credencial|credenciales)\b\s*[:=]\s*["']?[^"'\s]+/i
  },
  {
    type: 'FINANCIAL_FIELD',
    label: 'Se detectó posible dato financiero sensible.',
    regex: /\b(?:cuenta|n[uú]mero\s+de\s+cuenta|numero\s+de\s+cuenta|nro\s+cuenta|num\s+cuenta|account\s+number|iban|swift|routing\s+number|tarjeta|tarjeta\s+de\s+cr[eé]dito|tarjeta\s+d[eé]bito|credit\s+card|debit\s+card|card\s+number|pan|cvv2?|cvc|c[oó]digo\s+de\s+seguridad|codigo\s+de\s+seguridad|fecha\s+(?:de\s+)?expiraci[oó]n|fecha\s+(?:de\s+)?expiracion|expiration\s+date|expiry\s+date|vencimiento\s+tarjeta|card\s+expiry|n[uú]mero\s+de\s+tarjeta|numero\s+de\s+tarjeta)\b/i
  },
  {
    type: 'CREDIT_CARD_NUMBER',
    label: 'Se detectó posible número de tarjeta.',
    regex: /\b(?:\d[ -]*?){13,19}\b/
  },
  {
    type: 'CVV_CONTEXT',
    label: 'Se detectó posible código de seguridad de tarjeta.',
    regex: /\b(?:cvv2?|cvc|c[oó]digo\s+de\s+seguridad|codigo\s+de\s+seguridad|security\s+code|seguridad)\b[\s:=\w-]{0,40}\b\d{3,4}\b/i
  },
  {
    type: 'EXPIRY_CONTEXT',
    label: 'Se detectó posible fecha de expiración de tarjeta.',
    regex: /\b(?:fecha\s+(?:de\s+)?expiraci[oó]n|fecha\s+(?:de\s+)?expiracion|expiration\s+date|expiry\s+date|vencimiento(?:\s+tarjeta)?|card\s+expiry|tarjeta)\b[\s:=\w-]{0,40}\b(?:0[1-9]|1[0-2])\/(?:\d{2}|\d{4})\b/i
  },
  {
    type: 'BANK_ACCOUNT_CONTEXT',
    label: 'Se detectó posible número de cuenta bancaria.',
    regex: /\b(?:cuenta|n[uú]mero\s+de\s+cuenta|numero\s+de\s+cuenta|nro\s+cuenta|num\s+cuenta|account(?:\s+number)?|iban|routing\s+number)\b[\s:=\w-]{0,40}\b\d{10,}\b/i
  },
  {
    type: 'AWS_SECRET_ACCESS_KEY',
    label: 'Se detectó posible secreto de acceso.',
    regex: /\baws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+=]{40}["']?/i
  },
  {
    type: 'BEARER_TOKEN',
    label: 'Se detectó posible token de autorización.',
    regex: /\bBearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/i
  },
  {
    type: 'PASSWORD_ASSIGNMENT',
    label: 'Se detectó posible clave o credencial.',
    regex: /\b(password|pwd|pass|contraseña|contrasena|clave(?:\s+temporal)?|token|bearer|api\s*key|apikey|api_key|secret|client_secret|access\s*key|refresh\s*token|authorization|credential|credentials|credencial|credenciales)\b\s*[:=]\s*["']?[^"'\s]+/i
  },
  {
    type: 'EMAIL',
    label: 'Se detectó posible correo electrónico.',
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
  },
  {
    type: 'EMAIL_FIELD',
    label: 'Se detectó posible correo electrónico.',
    regex: /\b(email|correo)\b\s*[:=]\s*["']?\S+/i
  },
  {
    type: 'PHONE_FIELD',
    label: 'Se detectó posible teléfono.',
    regex: /\b(tel[eé]fono|telefono|celular|m[oó]vil|movil|mobile|phone)\b\s*[:=]?\s*(?:\+?\d[\s.-]*){9,10}\b/i
  },
  {
    type: 'PERSONAL_ID_FIELD',
    label: 'Se detectó posible identificador personal.',
    regex: /\b(c[eé]dula|cedula|identificaci[oó]n|identificacion|dni|ruc|documento|pasaporte|passport|ssn|social\s+security)\b\s*[:=]?\s*["']?[A-Z0-9.-]{6,20}\b/i
  },
  {
    type: 'ADDRESS_FIELD',
    label: 'Se detectó posible dirección personal.',
    regex: /\b(direcci[oó]n|direccion|address)\b\s*[:=]\s*["']?\S+/i
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
      sanitizedText: '[BLOCKED_SENSITIVE_CONTENT]'
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
