import {
  getPlatformSettings,
  saveDashboardSettings,
  saveLlmSettings,
  saveProxySettings
} from '../settings/platform-settings.service.js';
import { renderSettingsView } from '../views/settings.view.js';

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

export async function handleSettingsRoutes({
  req,
  res,
  pathname,
  sendHtml,
  sendJson
}) {
  if (req.method === 'GET' && pathname === '/settings') {
    sendHtml(res, 200, renderSettingsView());
    return true;
  }

  if (req.method === 'GET' && pathname === '/settings/config') {
    sendJson(res, 200, getPlatformSettings());
    return true;
  }

  if (req.method === 'POST' && pathname === '/settings/dashboard') {
    try {
      const body = await readJsonBody(req);
      const result = saveDashboardSettings(body);
      const statusCode = result.status === 'SETTINGS_VALIDATION_ERROR' ? 400 : 200;
      sendJson(res, statusCode, result);
    } catch (error) {
      sendJson(res, error.statusCode || 400, {
        status: 'SETTINGS_VALIDATION_ERROR',
        sentToClaude: false,
        errors: [error.message]
      });
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/settings/llm') {
    try {
      const body = await readJsonBody(req);
      const result = saveLlmSettings(body);
      const statusCode = result.status === 'SETTINGS_VALIDATION_ERROR' ? 400 : 200;
      sendJson(res, statusCode, result);
    } catch (error) {
      sendJson(res, error.statusCode || 400, {
        status: 'SETTINGS_VALIDATION_ERROR',
        sentToClaude: false,
        errors: [error.message]
      });
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/settings/proxy') {
    try {
      const body = await readJsonBody(req);
      const result = saveProxySettings(body);
      const statusCode = result.status === 'SETTINGS_VALIDATION_ERROR' ? 400 : 200;
      sendJson(res, statusCode, result);
    } catch (error) {
      sendJson(res, error.statusCode || 400, {
        status: 'SETTINGS_VALIDATION_ERROR',
        sentToLLM: false,
        sentToClaude: false,
        errors: [error.message]
      });
    }
    return true;
  }

  if ([
    '/settings',
    '/settings/config',
    '/settings/dashboard',
    '/settings/llm',
    '/settings/proxy'
  ].includes(pathname)) {
    sendJson(res, 405, {
      error: 'Method Not Allowed',
      sentToLLM: false,
      sentToClaude: false
    });
    return true;
  }

  return false;
}
