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

const MISSING_SECTION_ACTION = 'No se identificó contenido suficiente para completar esta sección. Se recomienda proporcionar más contexto específico para este apartado.';
const GENERIC_INSUFFICIENT_PATTERNS = [
  /no se cuenta con informaci[oó]n suficiente/i,
  /no hay informaci[oó]n suficiente/i,
  /informaci[oó]n insuficiente/i,
  /no se puede determinar con la informaci[oó]n proporcionada/i,
  /no aplica por falta de informaci[oó]n/i,
  /pendiente de informaci[oó]n adicional/i
];
const CLARIFICATION_FIRST_PATTERNS = [
  /^#{1,6}\s+Necesito m[aá]s informaci[oó]n\b/im,
  /^#{1,6}\s+Preguntas abiertas\b/im,
  /antes de generar/i,
  /necesito que me proporciones/i,
  /necesito confirmar/i,
  /falta informaci[oó]n/i,
  /no se ha proporcionado/i
];

export function buildMissingContextInstruction() {
  return [
    'Regla de contexto insuficiente:',
    'Si la solicitud del usuario no contiene información suficiente para generar una respuesta confiable, no inventes datos y no generes un informe completo todavía.',
    'Primero responde con una sección llamada "Necesito más información" o "Preguntas abiertas".',
    'Incluye máximo 5 preguntas concretas y accionables.',
    'Si puedes aportar algo útil sin inventar, agrega una sección breve llamada "Análisis preliminar".',
    'No uses frases genéricas como "No se cuenta con información suficiente para determinarlo" dentro de la sección de preguntas.',
    'La sección de preguntas abiertas siempre debe contener preguntas reales.',
    'Cuando estés en modo de aclaración, responde únicamente con "Necesito más información", las preguntas y, opcionalmente, "Análisis preliminar".',
    'No incluyas las secciones documentales completas ni las rellenes con "No se cuenta con información suficiente para determinarlo".',
    'Cuando el usuario entregue la información faltante, entonces genera la respuesta completa según los campos esperados del agente.'
  ].join('\n');
}

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
    'Si falta contexto crítico, pregunta primero y no generes todavía todas las secciones del informe.',
    '',
    'El resultado visible debe estar orientado a un analista QA funcional o líder QA. Evita lenguaje innecesariamente técnico salvo que el agente lo requiera. Sé claro, accionable y verificable.',
    '',
    buildMissingContextInstruction(),
    '',
    'Incluye estas secciones:',
    '',
    sectionInstructions,
    '',
    'Reglas:',
    '- No devuelvas JSON.',
    '- No omitas secciones solicitadas cuando haya contexto suficiente.',
    '- Si falta información crítica, prioriza preguntas concretas antes que un informe completo.',
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

function normalizePlaceholderText(value) {
  return String(value || '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/[.。]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function isGenericInsufficientText(value) {
  return GENERIC_INSUFFICIENT_PATTERNS.some((pattern) => pattern.test(normalizePlaceholderText(value)));
}

export function isPlaceholderInsufficientInfo(content) {
  const lines = String(content || '')
    .split('\n')
    .map((line) => normalizePlaceholderText(line))
    .filter(Boolean);

  if (lines.length === 0) {
    return true;
  }

  return lines.every((line) => GENERIC_INSUFFICIENT_PATTERNS.some((pattern) => pattern.test(line)));
}

function hasQuestionText(value) {
  return /[?¿]/.test(String(value || ''));
}

export function isClarificationFirstResponse(markdownText) {
  const text = String(markdownText || '').trim();
  if (!text) return false;
  return CLARIFICATION_FIRST_PATTERNS.some((pattern) => pattern.test(text));
}

function valueToMarkdown(value, section) {
  if (section?.field === 'openQuestions') {
    const values = Array.isArray(value) ? value : [value];
    const questions = values
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter((item) => item && hasQuestionText(item) && !isGenericInsufficientText(item))
      .slice(0, 5);

    return questions.length > 0 ? questions.map((item) => `- ${item}`).join('\n') : '';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return MISSING_SECTION_ACTION;
    return value.map((item) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  const text = String(value || '').trim();
  return text || MISSING_SECTION_ACTION;
}

function containsSection(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\n)#{1,6}\\s+${escaped}(\\n|$)`, 'i').test(markdown);
}

function parseMarkdownSections(markdown) {
  const lines = String(markdown || '').split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);

    if (headingMatch) {
      current = {
        heading: line,
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        lines: []
      };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      sections.push({
        heading: '',
        level: 0,
        title: '',
        lines: [line]
      });
      current = sections[sections.length - 1];
    }
  }

  return sections;
}

function sectionHasRealQuestions(content) {
  return String(content || '')
    .split('\n')
    .some((item) => hasQuestionText(item) && !isGenericInsufficientText(item));
}

export function removeEmptyOrPlaceholderSections(markdownText, options = {}) {
  const sections = parseMarkdownSections(markdownText);

  if (sections.length === 0) {
    const text = String(markdownText || '').trim();
    return isPlaceholderInsufficientInfo(text)
      ? (options.fallback || 'El agente no devolvió contenido visible útil.')
      : text;
  }

  const kept = sections.filter((section) => {
    const content = section.lines.join('\n').trim();
    const normalizedTitle = section.title.toLowerCase();

    if (normalizedTitle === 'preguntas abiertas') {
      return sectionHasRealQuestions(content);
    }

    if (!content) {
      return false;
    }

    return !isPlaceholderInsufficientInfo(content);
  });

  const output = kept.map((section) => {
    const content = section.lines.join('\n').trim();
    return section.heading ? `${section.heading}\n\n${content}` : content;
  }).filter(Boolean).join('\n\n').trim();

  return output || options.fallback || 'El agente no devolvió contenido visible útil.';
}

function ensureExpectedSections(markdown, sections) {
  let output = removeEmptyOrPlaceholderSections(markdown);

  if (isClarificationFirstResponse(output)) {
    return output;
  }

  for (const section of sections) {
    if (section.field === 'openQuestions') {
      continue;
    }

    if (!containsSection(output, section.title)) {
      output += `${output ? '\n\n' : ''}## ${section.title}\n\n${MISSING_SECTION_ACTION}`;
    }
  }

  return removeEmptyOrPlaceholderSections(output);
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
    const content = valueToMarkdown(value, section);
    return content ? `## ${section.title}\n\n${content}` : '';
  }).filter(Boolean).join('\n\n');

  return ensureExpectedSections(markdown, sections);
}

export function getVisibleAgentResponse(response = {}, expectedFields = []) {
  const candidate = typeof response.llmResponse === 'string' && response.llmResponse.trim()
    ? response.llmResponse
    : response.claudeResponse;

  return normalizeVisibleLLMOutput(candidate || response.rawModelText || '', expectedFields);
}
