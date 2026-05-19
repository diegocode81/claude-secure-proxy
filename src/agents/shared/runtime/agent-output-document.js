const SECTION_DEFINITIONS = {
  summary: {
    title: 'Resumen ejecutivo',
    instruction: 'Resume el análisis en lenguaje claro para un líder QA o stakeholder no técnico.'
  },
  data: {
    title: 'Datos analizados',
    instruction: 'Lista los datos, evidencias o elementos relevantes encontrados en la entrada.'
  },
  risks: {
    title: 'Riesgos identificados',
    instruction: 'Enumera riesgos funcionales, técnicos, operativos o de calidad detectados. Incluye impacto y severidad cuando sea posible.'
  },
  recommendations: {
    title: 'Recomendaciones',
    instruction: 'Propón acciones concretas, priorizadas y aplicables para el equipo QA o proyecto.'
  },
  openQuestions: {
    title: 'Preguntas abiertas',
    instruction: 'Lista preguntas que deben aclararse porque falta información o hay ambigüedad.'
  },
  acceptanceCriteria: {
    title: 'Criterios de aceptación',
    instruction: 'Genera criterios de aceptación claros, verificables y redactados en formato Given/When/Then cuando aplique, o en bullets verificables si no aplica.'
  },
  testScenarios: {
    title: 'Escenarios de prueba',
    instruction: 'Genera escenarios de prueba funcionales o no funcionales, con nombre, precondición, pasos generales y resultado esperado.'
  },
  executiveReport: {
    title: 'Informe gerencial',
    instruction: 'Redacta un informe ejecutivo para gerencia con hallazgos, impacto, conclusión y próximos pasos.'
  }
};

const DOCUMENT_ORDER = [
  'executiveReport',
  'summary',
  'data',
  'acceptanceCriteria',
  'testScenarios',
  'risks',
  'recommendations',
  'openQuestions'
];

const DEFAULT_SECTIONS = [
  { field: 'summary', title: 'Resumen ejecutivo', instruction: SECTION_DEFINITIONS.summary.instruction },
  { field: 'analysis', title: 'Análisis', instruction: 'Desarrolla el análisis principal con evidencia y supuestos claramente separados.' },
  { field: 'findings', title: 'Hallazgos', instruction: 'Lista hallazgos relevantes, verificables y accionables.' },
  { field: 'recommendations', title: 'Recomendaciones', instruction: SECTION_DEFINITIONS.recommendations.instruction },
  { field: 'openQuestions', title: 'Preguntas abiertas', instruction: SECTION_DEFINITIONS.openQuestions.instruction }
];

const INSUFFICIENT_INFORMATION = 'No se cuenta con información suficiente para determinarlo.';

function toWords(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\s+/g, ' ');
}

function toTitle(value) {
  const words = toWords(value);
  if (!words) return 'Sección';
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

function uniqueFields(fields) {
  return Array.from(new Set((Array.isArray(fields) ? fields : [])
    .map((field) => String(field || '').trim())
    .filter(Boolean)));
}

function getExpectedFields(agentOrFields) {
  if (Array.isArray(agentOrFields)) {
    return uniqueFields(agentOrFields);
  }

  const outputFields = agentOrFields?.io?.outputFields
    || agentOrFields?.outputSchema?.fields
    || agentOrFields?.outputContract
    || [];

  return uniqueFields(outputFields);
}

export function buildExpectedOutputSections(expectedFields) {
  const fields = uniqueFields(expectedFields);

  if (fields.length === 0) {
    return DEFAULT_SECTIONS;
  }

  const orderedFields = [
    ...DOCUMENT_ORDER.filter((field) => fields.includes(field)),
    ...fields.filter((field) => !DOCUMENT_ORDER.includes(field))
  ];

  return orderedFields.map((field) => {
    const known = SECTION_DEFINITIONS[field];
    return {
      field,
      title: known?.title || toTitle(field),
      instruction: known?.instruction || 'Completa esta sección con información útil y verificable según la entrada recibida.'
    };
  });
}

export function buildDocumentOutputInstruction(agentProfile = {}) {
  const sections = buildExpectedOutputSections(getExpectedFields(agentProfile));
  const sectionInstructions = sections
    .map((section) => `${section.title}\n\n${section.instruction}`)
    .join('\n\n');

  return [
    'Formato obligatorio de respuesta:',
    'Responde como un documento QA final listo para copiar y pegar.',
    'Responde en Markdown limpio, sin JSON y sin metadatos técnicos.',
    'No expliques el contrato interno.',
    'Usa títulos y subtítulos claros.',
    'Debes incluir todas las secciones solicitadas en el orden indicado.',
    'Si no tienes información suficiente para una sección, incluye la sección igualmente y escribe "No se cuenta con información suficiente para determinarlo" junto con preguntas abiertas o supuestos necesarios.',
    '',
    'El resultado visible debe estar orientado a un analista QA funcional o líder QA. Evita lenguaje innecesariamente técnico salvo que el agente lo requiera. Sé claro, accionable y verificable.',
    '',
    'Incluye estas secciones:',
    '',
    sectionInstructions,
    '',
    'Reglas:',
    '- No devuelvas JSON.',
    '- No omitas secciones solicitadas.',
    '- Si falta información, dilo explícitamente.',
    '- No inventes evidencia.',
    '- Diferencia hechos, supuestos y recomendaciones.',
    '- Mantén el contenido listo para copiar y pegar en un documento QA.'
  ].join('\n');
}

function parseMaybeJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function valueToMarkdown(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return INSUFFICIENT_INFORMATION;
    return value.map((item) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  const text = String(value || '').trim();
  return text || INSUFFICIENT_INFORMATION;
}

function containsSection(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\n)#{1,6}\\s+${escaped}(\\n|$)`, 'i').test(markdown);
}

function ensureExpectedSections(markdown, sections) {
  let output = String(markdown || '').trim();

  for (const section of sections) {
    if (!containsSection(output, section.title)) {
      output += `${output ? '\n\n' : ''}## ${section.title}\n\n${INSUFFICIENT_INFORMATION}`;
    }
  }

  return output;
}

export function normalizeVisibleLLMOutput(text, expectedFields = []) {
  const rawText = typeof text === 'string' ? text.trim() : '';
  const sections = buildExpectedOutputSections(expectedFields);

  if (!rawText) {
    return ensureExpectedSections('El agente no devolvió contenido visible.', sections);
  }

  const parsed = parseMaybeJson(rawText);

  if (!parsed) {
    return ensureExpectedSections(rawText, sections);
  }

  const markdown = sections.map((section) => {
    const value = parsed[section.field];
    return `## ${section.title}\n\n${valueToMarkdown(value)}`;
  }).join('\n\n');

  return ensureExpectedSections(markdown, sections);
}

export function getVisibleAgentResponse(response = {}, expectedFields = []) {
  const candidate = typeof response.llmResponse === 'string' && response.llmResponse.trim()
    ? response.llmResponse
    : response.claudeResponse;

  return normalizeVisibleLLMOutput(candidate || response.rawModelText || '', expectedFields);
}
