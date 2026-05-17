import {
  generateQaLogVsCodeExtension,
  getQaLogVsCodeExtensionConfig,
  getQaLogVsCodeExtensionInfo,
  saveQaLogVsCodeExtensionConfig
} from '../extensions/vscode-extension.service.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let bytes = 0;

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1024 * 1024) {
        reject(Object.assign(new Error('Body too large.'), { statusCode: 413 }));
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
        reject(Object.assign(new Error('Invalid JSON body.'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export async function handleExtensionRoutes({
  req,
  res,
  pathname,
  sendJson
}) {
  if (req.method === 'GET' && pathname === '/qa-log-analyst/extension/info') {
    sendJson(res, 200, getQaLogVsCodeExtensionInfo());
    return true;
  }

  if (req.method === 'GET' && pathname === '/qa-log-analyst/extension/config') {
    sendJson(res, 200, getQaLogVsCodeExtensionConfig());
    return true;
  }

  if (req.method === 'POST' && pathname === '/qa-log-analyst/extension/config') {
    try {
      const body = await readJsonBody(req);
      const result = saveQaLogVsCodeExtensionConfig(body);
      const statusCode = result.status === 'EXTENSION_CONFIG_INVALID' ? 400 : 200;
      sendJson(res, statusCode, result);
    } catch (error) {
      sendJson(res, error.statusCode || 400, {
        status: 'EXTENSION_CONFIG_INVALID',
        sentToClaude: false,
        config: getQaLogVsCodeExtensionConfig().config,
        warnings: [],
        errors: [error.message]
      });
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/qa-log-analyst/extension/generate') {
    const result = await generateQaLogVsCodeExtension();
    const statusCode = result.status === 'EXTENSION_GENERATION_FAILED' ? 500 : 200;
    sendJson(res, statusCode, result);
    return true;
  }

  if ([
    '/qa-log-analyst/extension/info',
    '/qa-log-analyst/extension/config',
    '/qa-log-analyst/extension/generate'
  ].includes(pathname)) {
    sendJson(res, 405, {
      error: 'Method Not Allowed',
      sentToClaude: false
    });
    return true;
  }

  return false;
}
