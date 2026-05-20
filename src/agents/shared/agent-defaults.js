export const DEFAULT_AGENT_CAPABILITIES = [
  'Analizar información funcional, técnica o de negocio con enfoque QA',
  'Identificar reglas de negocio, supuestos, ambigüedades y vacíos de información',
  'Generar criterios de aceptación claros, verificables y trazables',
  'Proponer escenarios de prueba positivos, negativos, borde y alternos',
  'Identificar riesgos funcionales, técnicos, operativos y de calidad',
  'Generar recomendaciones accionables priorizadas para el equipo QA',
  'Formular preguntas abiertas cuando falte contexto crítico',
  'Diferenciar evidencia, inferencias, supuestos y recomendaciones',
  'Producir salidas documentales en Markdown listas para copiar y pegar',
  'Mantener lenguaje claro para analistas QA, líderes y stakeholders'
];

function normalizeCapability(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function isUsefulCapability(value) {
  const text = normalizeCapability(value);
  return text.length >= 20 && /\s/.test(text);
}

export function normalizeAgentCapabilities(capabilities = []) {
  const source = Array.isArray(capabilities)
    ? capabilities
    : String(capabilities || '').split('\n');
  const normalized = source
    .map(normalizeCapability)
    .filter(isUsefulCapability);
  const seen = new Set();
  const uniqueNormalized = [];

  for (const item of normalized) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueNormalized.push(item);
    }
  }

  if (uniqueNormalized.length >= 5) {
    return uniqueNormalized;
  }

  const merged = [...uniqueNormalized];
  for (const item of DEFAULT_AGENT_CAPABILITIES) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}
