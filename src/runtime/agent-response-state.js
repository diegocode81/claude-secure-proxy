const NEEDS_MORE_INFORMATION_PATTERNS = [
  /#\s*necesito\s+m[aá]s\s+informaci[oó]n/i,
  /\bnecesito\s+m[aá]s\s+informaci[oó]n\b/i,
  /\brequiere\s+m[aá]s\s+informaci[oó]n\b/i,
  /\bnecesito\s+conocer\b/i,
  /\bpor\s+favor\s+proporciona\b/i,
  /\bpara\s+poder\s+realizar\b/i
];

const COMPLETED_REPORT_SECTION_PATTERNS = [
  /#\s*informe\b/i,
  /##\s*criterios\s+de\s+aceptaci[oó]n\b/i,
  /##\s*escenarios\b/i,
  /##\s*riesgos\b/i,
  /##\s*recomendaciones\b/i
];

function looksLikeCompletedReport(text) {
  return COMPLETED_REPORT_SECTION_PATTERNS.every((pattern) => pattern.test(text));
}

export function detectAgentResponseState(responseText) {
  const text = String(responseText || '');
  if (looksLikeCompletedReport(text)) {
    return 'completed';
  }

  return NEEDS_MORE_INFORMATION_PATTERNS.some((pattern) => pattern.test(text))
    ? 'needs_more_information'
    : 'completed';
}
