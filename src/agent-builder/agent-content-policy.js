const SECRET_PATTERNS = [
  /sk-[a-z0-9_-]{12,}/i,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  /\bpassword\s*[:=]\s*["']?[^"'\s]{6,}/i,
  /\btoken\s*[:=]\s*["']?[^"'\s]{12,}/i,
  /\bapi[_-]?key\s*[:=]\s*["']?[^"'\s]{12,}/i
];

const RUNTIME_ACTIVATION_PATTERNS = [
  /execution\.enabled\s*[:=]\s*true/i,
  /["']enabled["']\s*:\s*true/i,
  /\bmode\s*[:=]\s*["']?runtime-enabled["']?/i,
  /\bruntime-enabled\b/i,
  /activar\s+runtime\s+autom[aá]ticamente/i
];

const POLICY_BYPASS_PATTERNS = [
  /saltar\s+sanitizaci[oó]n/i,
  /desactivar\s+sanitizaci[oó]n/i,
  /deshabilitar\s+sanitizaci[oó]n/i,
  /ignorar\s+presupuesto/i,
  /no\s+registrar\s+usage/i
];

const SECRET_LEAK_INSTRUCTION_PATTERNS = [
  /exfiltrar\s+secretos/i,
  /mostrar\s+api\s*key/i,
  /revelar\s+api\s*key/i,
  /mostrar\s+secretos/i,
  /revelar\s+secretos/i
];

const SYSTEM_COMMAND_PATTERNS = [
  /process\.exit/i,
  /child_process/i,
  /\bexec\s*\(/i,
  /rm\s+-rf/i,
  /curl\b.*(?:sk-|token|api[_-]?key|password)/i
];

const SAFE_GOVERNANCE_CONTEXT_PATTERN = /\b(no|nunca|prohibid[oa]s?|bloquear|bloquea|rechazar|rechaza|evitar|evita|impedir|impide|datos prohibidos|solicitudes para|instrucciones para|reglas de seguridad|debe respetar|debe pasar por|sin sanitizaci[oó]n no|sin control de presupuesto no)\b/i;

function hasUnsafePolicyBypassInstruction(text) {
  const lines = String(text || '').split(/\r?\n/);

  return lines.some((line) => {
    if (!POLICY_BYPASS_PATTERNS.some((pattern) => pattern.test(line))) {
      return false;
    }

    return !SAFE_GOVERNANCE_CONTEXT_PATTERN.test(line);
  });
}

function hasUnsafeSecretLeakInstruction(text) {
  const lines = String(text || '').split(/\r?\n/);

  return lines.some((line) => {
    if (!SECRET_LEAK_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(line))) {
      return false;
    }

    return !SAFE_GOVERNANCE_CONTEXT_PATTERN.test(line);
  });
}

export function isForbiddenRuntimeActivation(text) {
  return RUNTIME_ACTIVATION_PATTERNS.some((pattern) => pattern.test(String(text || '')));
}

export function isForbiddenSecretLeak(text) {
  const value = String(text || '');
  return SECRET_PATTERNS.some((pattern) => pattern.test(value)) || hasUnsafeSecretLeakInstruction(value);
}

export function isForbiddenSystemCommand(text) {
  return SYSTEM_COMMAND_PATTERNS.some((pattern) => pattern.test(String(text || '')));
}

export function containsForbiddenAgentGeneratedContent(value) {
  const text = String(value || '');
  return isForbiddenRuntimeActivation(text)
    || isForbiddenSecretLeak(text)
    || isForbiddenSystemCommand(text)
    || hasUnsafePolicyBypassInstruction(text);
}

export function containsForbiddenAgentContent(value) {
  return containsForbiddenAgentGeneratedContent(value);
}
