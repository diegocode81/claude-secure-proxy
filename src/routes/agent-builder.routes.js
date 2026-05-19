import {
  createAgentFromInput,
  getAgentBuilderSchema
} from '../agent-builder/agent-builder.service.js';
import { suggestAgentDefinition } from '../agent-builder/agent-suggestion.service.js';

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

export async function handleAgentBuilderRoutes({
  req,
  res,
  pathname,
  sendJson
}) {
  if (req.method === 'GET' && pathname === '/agent-builder/schema') {
    sendJson(res, 200, getAgentBuilderSchema());
    return true;
  }

  if (req.method === 'POST' && pathname === '/agent-builder/create') {
    try {
      const body = await readJsonBody(req);
      const result = createAgentFromInput(body);
      const statusCode = result.status === 'AGENT_CREATION_INVALID' ? 400 : 200;
      sendJson(res, statusCode, result);
    } catch (error) {
      sendJson(res, error.statusCode || 400, {
        status: 'AGENT_CREATION_INVALID',
        sentToClaude: false,
        errors: [error.message],
        warnings: []
      });
    }
    return true;
  }

  if (req.method === 'POST' && pathname === '/agent-builder/suggest') {
    try {
      const body = await readJsonBody(req);
      const result = await suggestAgentDefinition(body);
      const statusCode = [
        'AGENT_AI_SUGGESTION_INVALID_INPUT',
        'AGENT_AI_SUGGESTION_INVALID_OUTPUT',
        'LLM_API_KEY_NOT_CONFIGURED',
        'LLM_AUTHENTICATION_ERROR',
        'LLM_NOT_CONFIGURED'
      ].includes(result.status) ? 400 : 200;

      sendJson(res, statusCode, result);
    } catch (error) {
      sendJson(res, error.statusCode || 400, {
        status: 'AGENT_AI_SUGGESTION_INVALID_INPUT',
        sentToLLM: false,
        sentToClaude: false,
        errors: [error.message]
      });
    }
    return true;
  }

  if (['/agent-builder/schema', '/agent-builder/create', '/agent-builder/suggest'].includes(pathname)) {
    sendJson(res, 405, {
      error: 'Method Not Allowed',
      sentToLLM: false,
      sentToClaude: false
    });
    return true;
  }

  return false;
}
