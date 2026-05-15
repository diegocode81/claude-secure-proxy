const vscode = require('vscode');

const PROXY_BASE_URL = 'http://localhost:3000';
const ANALYZE_ERROR_CONTEXT_URL = `${PROXY_BASE_URL}/analyze-error-context`;
const CONTEXT_OPTIONS = ['frontend', 'backend', 'api', 'mobile', 'pipeline', 'unknown'];
const DEFAULT_TECHNOLOGY = 'unknown';

const MAX_CANDIDATE_FILES = 50;
const MAX_RELEVANT_FILES = 10;
const MAX_SNIPPET_LINES = 120;
const MAX_CONTEXT_CHARS = 60000;
const MAX_FILE_BYTES = 512 * 1024;
const SEARCH_PATTERN = '**/*.{js,jsx,ts,tsx,java,cs,feature,json,yml,yaml,xml,gradle}';
const EXCLUDE_PATTERN = '{**/.env,**/.env.*,**/*secret*,**/*credential*,**/*password*,**/docker-compose.yml,**/docker-compose.yaml,**/*.properties,**/*.local.*,**/config/**,**/configs/**,**/secrets/**,**/credentials/**,**/node_modules/**,**/dist/**,**/build/**,**/coverage/**,**/.git/**,**/.next/**,**/target/**,**/bin/**,**/obj/**,**/package-lock.json,**/pnpm-lock.yaml,**/yarn.lock}';

const SENSITIVE_PATH_REGEX = /(^|[/\\])(?:\.env(?:\..*)?|docker-compose\.ya?ml|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|(^|[/\\])(?:config|configs|secrets|credentials|node_modules|dist|build|coverage|\.git|\.next|target|bin|obj)([/\\]|$)|secret|credential|password|\.properties$|\.local\./i;
const SENSITIVE_SNIPPET_REGEX = /\b(?:password|secret|client_secret|credentials|access_token|refresh_token)\b\s*[:=]|\bAuthorization\s*:\s*Bearer\b|BEGIN\s+(?:RSA\s+|DSA\s+|EC\s+|OPENSSH\s+|PGP\s+)?PRIVATE KEY/i;

const COMMON_WORDS = new Set([
  'error',
  'undefined',
  'null',
  'true',
  'false',
  'return',
  'const',
  'let',
  'var',
  'function',
  'class',
  'public',
  'private',
  'string',
  'number',
  'object',
  'cannot',
  'read',
  'properties',
  'reading',
  'typeerror',
  'exception',
  'at',
  'line',
  'from',
  'with',
  'async',
  'await',
  'new',
  'this',
  'that',
  'then',
  'catch',
  'throw'
]);

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeSecure.analyzeSelection', analyzeSelection),
    vscode.commands.registerCommand(
      'claudeSecure.analyzeSelectionWithWorkspaceContext',
      analyzeSelectionWithWorkspaceContext
    ),
    vscode.commands.registerCommand(
      'claude-secure-vscode.analyzeErrorWithContext',
      analyzeSelectionWithWorkspaceContext
    )
  );
}

function deactivate() {}

async function analyzeSelection() {
  const selectedText = getSelectedText();

  if (!selectedText) {
    vscode.window.showWarningMessage('Selecciona un texto primero.');
    return;
  }

  await analyzeSelectedError({
    selectedText,
    includeWorkspaceContext: false,
    progressTitle: 'Claude Seguro: analizando selección',
    markdownTitle: 'Claude Seguro - Analizar selección'
  });
}

async function analyzeSelectionWithWorkspaceContext() {
  const selectedText = getSelectedText();

  if (!selectedText) {
    vscode.window.showWarningMessage('Selecciona un log, error o stacktrace primero.');
    return;
  }

  await analyzeSelectedError({
    selectedText,
    includeWorkspaceContext: true,
    progressTitle: 'Claude Seguro: analizando error con contexto',
    markdownTitle: 'Claude Seguro - Análisis con contexto del proyecto'
  });
}

async function analyzeSelectedError({ selectedText, includeWorkspaceContext, progressTitle, markdownTitle }) {
  const selectedContext = await vscode.window.showQuickPick(CONTEXT_OPTIONS, {
    placeHolder: 'Selecciona el contexto del error'
  });

  if (!selectedContext) {
    return;
  }

  try {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: progressTitle,
      cancellable: false
    }, async (progress) => {
      let workspaceContext = {
        files: [],
        skippedSensitiveFiles: 0
      };

      if (includeWorkspaceContext) {
        progress.report({ message: 'Extrayendo palabras clave...' });
        const searchTerms = extractWorkspaceSearchTerms(selectedText);

        progress.report({ message: 'Buscando contexto en el workspace...' });
        workspaceContext = await findWorkspaceContext(searchTerms);
      }

      progress.report({ message: 'Enviando al proxy local...' });
      const result = await postJson(ANALYZE_ERROR_CONTEXT_URL, {
        errorText: selectedText,
        context: selectedContext,
        technology: DEFAULT_TECHNOLOGY,
        workspaceContext: workspaceContext.files
      });

      progress.report({ message: 'Abriendo respuesta...' });
      await openMarkdown(renderMarkdownResponse({
        ...result,
        workspaceContextSent: workspaceContext
      }, markdownTitle));
    });
  } catch (error) {
    handleProxyError(error);
  }
}

function getSelectedText() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return '';
  }

  return editor.document.getText(editor.selection).trim();
}

function extractKeywords(text) {
  return extractWorkspaceSearchTerms(text).keywords;
}

function extractWorkspaceSearchTerms(text) {
  const keywords = new Set();
  const fileNames = new Set();
  const addKeyword = (value) => {
    if (!value) {
      return;
    }

    const cleaned = value.replace(/^[._-]+|[._-]+$/g, '');
    if (cleaned.length < 2 || COMMON_WORDS.has(cleaned.toLowerCase())) {
      return;
    }

    keywords.add(cleaned);
  };

  const addFileName = (value) => {
    if (!value) {
      return;
    }

    const cleaned = value.replace(/[:),\]]+$/g, '').replace(/:\d+$/, '');
    if (cleaned && !isSensitivePath(cleaned)) {
      fileNames.add(cleaned);
      addKeyword(cleaned);
    }
  };

  const fileRegex = /\b[\w.-]+\.(?:js|jsx|ts|tsx|java|cs|feature|json|ya?ml|xml|gradle)(?::\d+)?(?:[:),\]]?)/gi;
  for (const match of text.matchAll(fileRegex)) {
    addFileName(match[0]);
  }

  const textWithoutFileNames = text.replace(fileRegex, ' ');

  const propertyRegex = /(?:reading|property|method|function|variable|field|symbol|name)\s+['"`]([A-Za-z_$][\w$]*)['"`]/gi;
  for (const match of textWithoutFileNames.matchAll(propertyRegex)) {
    addKeyword(match[1]);
  }

  const stackFrameRegex = /\bat\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s+([\w.-]+\.(?:js|jsx|ts|tsx|java|cs|feature|json|ya?ml|xml|gradle))(?::\d+)?/gi;
  for (const match of text.matchAll(stackFrameRegex)) {
    for (const part of match[1].split('.')) {
      addKeyword(part);
    }
    addFileName(match[2]);
  }

  const callRegex = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  for (const match of textWithoutFileNames.matchAll(callRegex)) {
    addKeyword(match[1]);
  }

  const dottedRegex = /\.(\w[A-Za-z0-9_$]*)\b/g;
  for (const match of textWithoutFileNames.matchAll(dottedRegex)) {
    addKeyword(match[1]);
  }

  const identifierRegex = /\b[A-Z][A-Za-z0-9_$]{2,}\b|\b[A-Za-z_$][\w$]{2,}\b/g;
  for (const match of textWithoutFileNames.matchAll(identifierRegex)) {
    addKeyword(match[0]);
  }

  return {
    fileNames: Array.from(fileNames).slice(0, 20),
    keywords: Array.from(keywords).slice(0, 80)
  };
}

async function findWorkspaceContext(searchTerms) {
  const normalizedTerms = Array.isArray(searchTerms)
    ? { fileNames: [], keywords: searchTerms }
    : {
        fileNames: Array.isArray(searchTerms?.fileNames) ? searchTerms.fileNames : [],
        keywords: Array.isArray(searchTerms?.keywords) ? searchTerms.keywords : []
      };

  if (normalizedTerms.fileNames.length === 0 && normalizedTerms.keywords.length === 0) {
    return {
      files: [],
      skippedSensitiveFiles: 0
    };
  }

  const relevantFiles = [];
  const seenPaths = new Set();
  let totalChars = 0;
  let filesRead = 0;
  let skippedSensitiveFiles = 0;

  const tryAddFile = async (uri, reasonHint) => {
    if (
      relevantFiles.length >= MAX_RELEVANT_FILES ||
      totalChars >= MAX_CONTEXT_CHARS ||
      filesRead >= MAX_CANDIDATE_FILES
    ) {
      return;
    }

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const normalizedPath = relativePath.toLowerCase();
    if (seenPaths.has(normalizedPath) || isSensitivePath(relativePath)) {
      return;
    }

    seenPaths.add(normalizedPath);
    filesRead += 1;

    const content = await readWorkspaceFile(uri);
    if (!content) {
      return;
    }

    const match = findFirstKeywordMatch(content, uri, normalizedTerms.keywords, reasonHint);
    if (!match) {
      return;
    }

    const snippet = extractSnippet(content, match.keyword);
    if (containsSensitiveSnippet(snippet)) {
      skippedSensitiveFiles += 1;
      return;
    }

    const remainingChars = MAX_CONTEXT_CHARS - totalChars;
    const finalSnippet = snippet.length > remainingChars ? snippet.slice(0, remainingChars) : snippet;

    relevantFiles.push({
      filePath: relativePath,
      language: detectLanguage(uri.fsPath),
      reason: match.reason,
      snippet: finalSnippet
    });

    totalChars += finalSnippet.length;
  };

  for (const fileName of normalizedTerms.fileNames) {
    if (
      relevantFiles.length >= MAX_RELEVANT_FILES ||
      totalChars >= MAX_CONTEXT_CHARS ||
      filesRead >= MAX_CANDIDATE_FILES
    ) {
      break;
    }

    const directMatches = await vscode.workspace.findFiles(`**/${fileName}`, EXCLUDE_PATTERN, MAX_CANDIDATE_FILES);
    for (const uri of directMatches) {
      await tryAddFile(uri, `File name mentioned in error: ${fileName}`);
    }
  }

  if (
    relevantFiles.length < MAX_RELEVANT_FILES &&
    totalChars < MAX_CONTEXT_CHARS &&
    filesRead < MAX_CANDIDATE_FILES
  ) {
    const remainingReads = MAX_CANDIDATE_FILES - filesRead;
    const uris = await vscode.workspace.findFiles(SEARCH_PATTERN, EXCLUDE_PATTERN, remainingReads);

    for (const uri of uris) {
      await tryAddFile(uri);
    }
  }

  return {
    files: relevantFiles,
    skippedSensitiveFiles
  };
}

function isSensitivePath(filePath) {
  return SENSITIVE_PATH_REGEX.test(String(filePath));
}

function containsSensitiveSnippet(snippet) {
  return SENSITIVE_SNIPPET_REGEX.test(String(snippet));
}

function findFirstKeywordMatch(content, uri, keywords, reasonHint = '') {
  const relativePath = vscode.workspace.asRelativePath(uri, false);
  const lowerContent = content.toLowerCase();
  const lowerPath = relativePath.toLowerCase();

  if (reasonHint) {
    const fileNameKeyword = relativePath.split(/[\\/]/).pop() || relativePath;
    const contentKeyword = keywords.find((keyword) => lowerContent.includes(keyword.toLowerCase()));
    return {
      keyword: contentKeyword || fileNameKeyword,
      reason: reasonHint
    };
  }

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();

    if (lowerContent.includes(lowerKeyword)) {
      return {
        keyword,
        reason: `Contains symbol from error: ${keyword}`
      };
    }
  }

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();

    if (lowerPath.includes(lowerKeyword)) {
      return {
        keyword,
        reason: `File path matches symbol from error: ${keyword}`
      };
    }
  }

  return null;
}

async function readWorkspaceFile(uri) {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.size > MAX_FILE_BYTES) {
      return '';
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    if (looksBinary(bytes)) {
      return '';
    }

    return Buffer.from(bytes).toString('utf8');
  } catch {
    return '';
  }
}

function looksBinary(bytes) {
  const sampleLength = Math.min(bytes.length, 8000);

  for (let index = 0; index < sampleLength; index += 1) {
    if (bytes[index] === 0) {
      return true;
    }
  }

  return false;
}

function extractSnippet(content, keyword) {
  const lines = content.split(/\r?\n/);
  const lowerKeyword = String(keyword).toLowerCase();
  const matchLine = lines.findIndex((line) => line.toLowerCase().includes(lowerKeyword));
  const safeMatchLine = matchLine >= 0 ? matchLine : 0;
  const start = Math.max(0, safeMatchLine - 40);
  const end = Math.min(lines.length, start + MAX_SNIPPET_LINES);

  return lines.slice(start, end).join('\n');
}

function detectLanguage(filePath) {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const fileName = filePath.split(/[\\/]/).pop()?.toLowerCase();

  if (fileName === 'build.gradle' || extension === 'gradle') {
    return 'gradle';
  }

  const languages = {
    js: 'javascript',
    jsx: 'javascriptreact',
    ts: 'typescript',
    tsx: 'typescriptreact',
    java: 'java',
    cs: 'csharp',
    feature: 'gherkin',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml'
  };

  return languages[extension] || 'unknown';
}

async function postJson(url, body) {
  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw Object.assign(new Error('No se pudo conectar a claude-secure-proxy.'), {
      cause: error,
      code: 'PROXY_CONNECTION_FAILED'
    });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `claude-secure-proxy respondio con HTTP ${response.status}.`);
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('claude-secure-proxy respondio con JSON invalido.');
  }

  return payload;
}

function renderMarkdownResponse(result, title = 'Claude Seguro - Análisis con contexto del proyecto') {
  const workspaceContextResult = normalizeWorkspaceContextResult(result.workspaceContextSent);
  const workspaceContext = workspaceContextResult.files;

  if (result.status === 'BLOCKED') {
    vscode.window.showErrorMessage('Bloqueado por seguridad. No se envió a Claude.');
    return renderBlockedMarkdown(result);
  }

  if (result.status === 'BUDGET_EXCEEDED') {
    vscode.window.showErrorMessage('Presupuesto mensual excedido.');
    const { workspaceContextSent, ...proxyResponse } = result;
    return [
      '# Claude Seguro - Presupuesto mensual excedido',
      '',
      '```json',
      JSON.stringify(proxyResponse, null, 2),
      '```'
    ].join('\n');
  }

  const lines = [
    `# ${title}`,
    '',
    '## Estado del filtro',
    '',
    `- Estado: ${result.status || 'unknown'}`,
    `- Riesgo: ${result.risk || 'unknown'}`,
    '- Hallazgos:',
    ...formatFindings(result.findings),
    '',
    '## Contexto enviado',
    '',
    `- Cantidad de archivos enviados: ${workspaceContext.length}`,
    `- Cantidad de archivos descartados por sensibilidad: ${workspaceContextResult.skippedSensitiveFiles}`
  ];

  if (workspaceContext.length === 0) {
    lines.push('- No se encontraron archivos relacionados en el workspace.');
  } else {
    for (const file of workspaceContext) {
      lines.push(`- ${file.filePath}: ${file.reason}`);
    }
  }

  lines.push('', '## Respuesta de Claude', '', result.claudeResponse || 'Sin respuesta de Claude.');

  return lines.join('\n');
}

function renderBlockedMarkdown(result) {
  const workspaceContextResult = normalizeWorkspaceContextResult(result.workspaceContextSent);
  const lines = [
    '# Claude Seguro - Bloqueado por seguridad',
    '',
    '## Contexto enviado',
    '',
    `- Cantidad de archivos enviados: ${workspaceContextResult.files.length}`,
    `- Cantidad de archivos descartados por sensibilidad: ${workspaceContextResult.skippedSensitiveFiles}`
  ];

  if (workspaceContextResult.files.length === 0) {
    lines.push('- No se encontraron archivos relacionados en el workspace.');
  } else {
    for (const file of workspaceContextResult.files) {
      lines.push(`- ${file.filePath}: ${file.reason}`);
    }
  }

  lines.push(
    '',
    '## Hallazgos',
    '',
    ...formatFindings(result.findings),
    '',
    '## Texto sanitizado',
    '',
    '```text',
    result.sanitizedText || '',
    '```'
  );

  return lines.join('\n');
}

function normalizeWorkspaceContextResult(value) {
  if (Array.isArray(value)) {
    return {
      files: value,
      skippedSensitiveFiles: 0
    };
  }

  return {
    files: Array.isArray(value?.files) ? value.files : [],
    skippedSensitiveFiles: Number(value?.skippedSensitiveFiles || 0)
  };
}

function formatFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return ['- Sin hallazgos.'];
  }

  return findings.map((finding) => {
    if (typeof finding === 'string') {
      return `- ${finding}`;
    }

    const type = finding.type || 'UNKNOWN';
    const message = finding.message || finding.reason || '';
    return `- ${type}: ${message}`;
  });
}

async function openMarkdown(content) {
  const document = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content
  });

  await vscode.window.showTextDocument(document, {
    preview: false,
    viewColumn: vscode.ViewColumn.Beside
  });
}

function handleProxyError(error) {
  if (error?.code === 'PROXY_CONNECTION_FAILED') {
    vscode.window.showErrorMessage(
      'No se pudo conectar a claude-secure-proxy. Verifica que http://localhost:3000 esté activo.'
    );
    return;
  }

  vscode.window.showErrorMessage(error instanceof Error ? error.message : String(error));
}

module.exports = {
  activate,
  deactivate,
  extractKeywords,
  extractWorkspaceSearchTerms,
  findWorkspaceContext,
  extractSnippet,
  detectLanguage,
  containsSensitiveSnippet,
  isSensitivePath,
  postJson,
  renderMarkdownResponse
};
