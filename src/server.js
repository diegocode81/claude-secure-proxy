import http from 'node:http';
import './env.js';
import { sanitizeText } from './sanitizer.js';
import { callClaude } from './claude.js';
import { renderDashboard } from './dashboard.js';
import {
  getUsageSummary,
  isBudgetExceeded,
  isBudgetWarning,
  recordBlockedRequest,
  recordClaudeUsage,
  resetUsage
} from './usage.js';

const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 1024 * 1024);
const MAX_WORKSPACE_FILES = 10;
const MAX_SNIPPET_LINES = 300;
const MAX_CONTEXT_CHARS = 60000;

const DEFAULT_ANALYZE_INSTRUCTION = [
  'Actua como un analista QA senior.',
  'Analiza el contenido recibido y responde en espanol con hallazgos, riesgos y recomendaciones concretas.'
].join(' ');

const ERROR_ANALYSIS_INSTRUCTION = `Actúa como QA Architect senior especializado en análisis de errores, logs, debugging de frontend, backend, APIs, automatización y pipelines CI/CD. Analiza el siguiente error y responde en español con esta estructura:

1. Resumen del problema
2. Causa raíz probable
3. Evidencia encontrada en el log o código
4. Impacto QA
5. Pasos para reproducir
6. Validaciones recomendadas
7. Solución inmediata
8. Solución robusta
9. Qué revisar en frontend/backend/configuración/pipeline
10. Casos de prueba recomendados
11. Riesgos de regresión
12. Nivel de severidad: Bajo | Medio | Alto | Crítico
13. Próxima acción recomendada`;

const ERROR_CONTEXT_ANALYSIS_INSTRUCTION = `Actúa como QA Architect senior y debugging assistant especializado en frontend, backend, APIs, automatización y pipelines. Analiza el error usando el contexto del workspace proporcionado. No inventes archivos ni código no incluido. Si falta contexto, dilo explícitamente. Responde en español con:

1. Resumen del error
2. Archivo/método/variable probablemente involucrado
3. Evidencia exacta encontrada en el error o snippets
4. Causa raíz probable
5. Hipótesis alternativas
6. Validaciones para confirmar
7. Solución inmediata
8. Solución robusta
9. Cambios sugeridos en código o pruebas
10. Casos de prueba QA recomendados
11. Riesgos de regresión
12. Archivos adicionales que convendría revisar
13. Severidad
14. Próxima acción recomendada`;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8'
  });
  res.end(html);
}

function notFound(res) {
  sendJson(res, 404, {
    error: 'Not Found'
  });
}

function budgetExceededPayload(extra = {}) {
  return {
    ...extra,
    status: 'BUDGET_EXCEEDED',
    sentToClaude: false,
    message: 'Monthly Claude API budget exceeded.'
  };
}

function addBudgetWarning(payload, usageSummary) {
  if (!isBudgetWarning(usageSummary)) {
    return payload;
  }

  return {
    ...payload,
    warning: 'WARNING: Monthly budget usage is above 85%.'
  };
}

function methodNotAllowed(res) {
  sendJson(res, 405, {
    error: 'Method Not Allowed'
  });
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let raw = '';

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Body demasiado grande.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('JSON invalido.'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function validateText(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return 'El campo "text" es requerido y debe ser un string no vacio.';
  }

  return null;
}

function validateErrorText(errorText) {
  if (typeof errorText !== 'string' || errorText.trim().length === 0) {
    return 'El campo "errorText" es requerido y debe ser un string no vacio.';
  }

  if (errorText.length > MAX_CONTEXT_CHARS) {
    return `El campo "errorText" supera el limite de ${MAX_CONTEXT_CHARS} caracteres.`;
  }

  return null;
}

function normalizeSnippet(snippet) {
  if (typeof snippet !== 'string') {
    return '';
  }

  return snippet.split(/\r?\n/).slice(0, MAX_SNIPPET_LINES).join('\n');
}

function normalizeWorkspaceContext(workspaceContext) {
  if (workspaceContext === undefined || workspaceContext === null) {
    return [];
  }

  if (!Array.isArray(workspaceContext)) {
    throw Object.assign(new Error('El campo "workspaceContext" debe ser un array cuando se envia.'), {
      statusCode: 400
    });
  }

  return workspaceContext.slice(0, MAX_WORKSPACE_FILES).map((file, index) => ({
    filePath: typeof file?.filePath === 'string' && file.filePath.trim()
      ? file.filePath.trim()
      : `workspaceContext[${index}]`,
    language: typeof file?.language === 'string' && file.language.trim()
      ? file.language.trim()
      : 'unknown',
    reason: typeof file?.reason === 'string' && file.reason.trim()
      ? file.reason.trim()
      : 'No especificado',
    snippet: normalizeSnippet(file?.snippet)
  }));
}

function appendWithinLimit(parts, nextPart, maxChars) {
  const currentLength = parts.join('\n').length;
  const separatorLength = currentLength > 0 ? 1 : 0;
  const remaining = maxChars - currentLength - separatorLength;

  if (remaining <= 0) {
    return false;
  }

  parts.push(nextPart.length > remaining ? nextPart.slice(0, remaining) : nextPart);
  return nextPart.length <= remaining;
}

function buildWorkspacePrompt({ errorText, context, technology, workspaceContext }) {
  const parts = [
    `Contexto declarado: ${context}`,
    `Tecnologia declarada: ${technology}`,
    '',
    'Error seleccionado:',
    errorText.trim()
  ];

  if (workspaceContext.length === 0) {
    appendWithinLimit(parts, '\nContexto de workspace: no proporcionado.', MAX_CONTEXT_CHARS);
    return parts.join('\n');
  }

  appendWithinLimit(parts, '\nContexto de workspace proporcionado por VS Code:', MAX_CONTEXT_CHARS);

  for (const [index, file] of workspaceContext.entries()) {
    const fileBlock = [
      '',
      `Archivo ${index + 1}: ${file.filePath}`,
      `Lenguaje: ${file.language}`,
      `Razon de inclusion: ${file.reason}`,
      'Snippet:',
      '```',
      file.snippet,
      '```'
    ].join('\n');

    const fullyAppended = appendWithinLimit(parts, fileBlock, MAX_CONTEXT_CHARS);
    if (!fullyAppended) {
      break;
    }
  }

  return parts.join('\n');
}

async function handleAnalyze(body, res) {
  const validationError = validateText(body.text);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const result = sanitizeText(body.text);

  if (result.status === 'BLOCKED') {
    recordBlockedRequest();
    sendJson(res, 200, {
      status: 'BLOCKED',
      risk: 'HIGH',
      findings: result.findings,
      sentToClaude: false,
      message: 'El contenido contiene datos sensibles criticos y no fue enviado a Claude.',
      sanitizedText: result.sanitizedText
    });
    return;
  }

  if (isBudgetExceeded()) {
    sendJson(res, 200, budgetExceededPayload());
    return;
  }

  const textForClaude = result.status === 'SANITIZED' ? result.sanitizedText : body.text;
  const claudeResult = await callClaude({
    instruction: body.instruction || DEFAULT_ANALYZE_INSTRUCTION,
    text: textForClaude
  });
  const usageSummary = recordClaudeUsage({
    status: result.status,
    inputTokens: claudeResult.usage.inputTokens,
    outputTokens: claudeResult.usage.outputTokens
  });

  sendJson(res, 200, addBudgetWarning({
    status: result.status,
    risk: result.risk,
    findings: result.findings,
    sentToClaude: true,
    claudeResponse: claudeResult.text
  }, usageSummary));
}

async function handleAnalyzeError(body, res) {
  const validationError = validateText(body.text);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const context = typeof body.context === 'string' && body.context.trim()
    ? body.context.trim()
    : 'unknown';
  const technology = typeof body.technology === 'string' && body.technology.trim()
    ? body.technology.trim()
    : 'unknown';
  const result = sanitizeText(body.text);

  if (result.status === 'BLOCKED') {
    recordBlockedRequest();
    sendJson(res, 200, {
      mode: 'error-analysis',
      status: 'BLOCKED',
      risk: 'HIGH',
      findings: result.findings,
      sentToClaude: false,
      message: 'El contenido contiene datos sensibles críticos y no fue enviado a Claude.',
      sanitizedText: result.sanitizedText
    });
    return;
  }

  if (isBudgetExceeded()) {
    sendJson(res, 200, budgetExceededPayload({
      mode: 'error-analysis',
      context,
      technology
    }));
    return;
  }

  const textForClaude = result.status === 'SANITIZED' ? result.sanitizedText : body.text;
  const claudeResult = await callClaude({
    instruction: [
      ERROR_ANALYSIS_INSTRUCTION,
      '',
      `Contexto declarado: ${context}`,
      `Tecnologia declarada: ${technology}`
    ].join('\n'),
    text: textForClaude
  });
  const usageSummary = recordClaudeUsage({
    status: result.status,
    inputTokens: claudeResult.usage.inputTokens,
    outputTokens: claudeResult.usage.outputTokens
  });

  sendJson(res, 200, addBudgetWarning({
    mode: 'error-analysis',
    status: result.status,
    risk: result.risk,
    findings: result.findings,
    sentToClaude: true,
    context,
    technology,
    claudeResponse: claudeResult.text
  }, usageSummary));
}

async function handleAnalyzeErrorContext(body, res) {
  const validationError = validateErrorText(body.errorText);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const context = typeof body.context === 'string' && body.context.trim()
    ? body.context.trim()
    : 'unknown';
  const technology = typeof body.technology === 'string' && body.technology.trim()
    ? body.technology.trim()
    : 'unknown';
  const workspaceContext = normalizeWorkspaceContext(body.workspaceContext);
  const combinedPrompt = buildWorkspacePrompt({
    errorText: body.errorText,
    context,
    technology,
    workspaceContext
  });
  const result = sanitizeText(combinedPrompt);

  if (result.status === 'BLOCKED') {
    recordBlockedRequest();
    sendJson(res, 200, {
      mode: 'error-context-analysis',
      status: 'BLOCKED',
      risk: 'HIGH',
      findings: result.findings,
      sentToClaude: false,
      message: 'El contenido contiene datos sensibles críticos y no fue enviado a Claude.',
      sanitizedText: result.sanitizedText
    });
    return;
  }

  if (isBudgetExceeded()) {
    sendJson(res, 200, budgetExceededPayload({
      mode: 'error-context-analysis',
      context,
      technology,
      filesReceived: workspaceContext.length
    }));
    return;
  }

  const textForClaude = result.status === 'SANITIZED' ? result.sanitizedText : combinedPrompt;
  const claudeResult = await callClaude({
    instruction: ERROR_CONTEXT_ANALYSIS_INSTRUCTION,
    text: textForClaude
  });
  const usageSummary = recordClaudeUsage({
    status: result.status,
    inputTokens: claudeResult.usage.inputTokens,
    outputTokens: claudeResult.usage.outputTokens
  });

  sendJson(res, 200, addBudgetWarning({
    mode: 'error-context-analysis',
    status: result.status,
    risk: result.risk,
    findings: result.findings,
    sentToClaude: true,
    context,
    technology,
    filesReceived: workspaceContext.length,
    claudeResponse: claudeResult.text
  }, usageSummary));
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'claude-secure-proxy'
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/usage') {
    sendJson(res, 200, getUsageSummary());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/dashboard') {
    sendHtml(res, 200, renderDashboard(getUsageSummary()));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/usage/reset') {
    const acceptsHtml = req.headers.accept?.includes('text/html');
    const summary = resetUsage();

    if (acceptsHtml) {
      res.writeHead(303, { location: '/dashboard' });
      res.end();
      return;
    }

    sendJson(res, 200, summary);
    return;
  }

  if (req.method !== 'POST' && ['/sanitize', '/analyze', '/analyze-error', '/analyze-error-context', '/usage/reset'].includes(url.pathname)) {
    methodNotAllowed(res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/sanitize') {
    const body = await readJsonBody(req);
    const validationError = validateText(body.text);
    if (validationError) {
      sendJson(res, 400, { error: validationError });
      return;
    }
    sendJson(res, 200, sanitizeText(body.text));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/analyze') {
    const body = await readJsonBody(req);
    await handleAnalyze(body, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/analyze-error') {
    const body = await readJsonBody(req);
    await handleAnalyzeError(body, res);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/analyze-error-context') {
    const body = await readJsonBody(req);
    await handleAnalyzeErrorContext(body, res);
    return;
  }

  notFound(res);
}

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    sendJson(res, error.statusCode || 500, {
      error: error.message || 'Internal Server Error'
    });
  }
});

server.listen(PORT, () => {
  console.log(`claude-secure-proxy listening on http://localhost:${PORT}`);
});
