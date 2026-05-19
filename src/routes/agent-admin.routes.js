import {
  activateAgent,
  deactivateAgent,
  deleteAgent,
  getAgentEditableData,
  updateAgent
} from '../agent-builder/agent-admin.service.js';

function matchAgentAdminPath(pathname) {
  const editMatch = pathname.match(/^\/agents\/([^/]+)\/edit$/);
  if (editMatch) {
    return {
      agentId: decodeURIComponent(editMatch[1]),
      action: 'edit-data'
    };
  }

  const actionMatch = pathname.match(/^\/agents\/([^/]+)\/(activate|deactivate)$/);
  if (actionMatch) {
    return {
      agentId: decodeURIComponent(actionMatch[1]),
      action: actionMatch[2]
    };
  }

  const deleteMatch = pathname.match(/^\/agents\/([^/]+)$/);
  if (deleteMatch) {
    return {
      agentId: decodeURIComponent(deleteMatch[1]),
      action: reqMethodToActionPlaceholder()
    };
  }

  return null;
}

function reqMethodToActionPlaceholder() {
  return 'agent-root';
}

function readEmptyBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 0) {
        reject(Object.assign(new Error('Request body is not allowed for agent administration.'), { statusCode: 400 }));
        req.destroy();
      }
    });
    req.on('end', () => resolve());
    req.on('error', reject);
  });
}

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

function sendResult(sendJson, res, result) {
  const statusCode = result.statusCode
    || (['AGENT_ADMIN_INVALID', 'AGENT_ADMIN_FAILED', 'AGENT_UPDATE_INVALID'].includes(result.status) ? 400 : 200);
  const { statusCode: _statusCode, ...payload } = result;

  sendJson(res, statusCode, payload);
}

export async function handleAgentAdminRoutes({
  req,
  res,
  pathname,
  sendJson
}) {
  const match = matchAgentAdminPath(pathname);

  if (!match) {
    return false;
  }

  if (match.action === 'edit-data') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method Not Allowed', sentToLLM: false, sentToClaude: false });
      return true;
    }

    sendResult(sendJson, res, getAgentEditableData(match.agentId));
    return true;
  }

  if (match.action === 'activate' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed', sentToLLM: false, sentToClaude: false });
    return true;
  }

  if (match.action === 'deactivate' && req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed', sentToLLM: false, sentToClaude: false });
    return true;
  }

  if (match.action === 'agent-root' && !['DELETE', 'PUT'].includes(req.method)) {
    return false;
  }

  try {
    if (match.action === 'agent-root' && req.method === 'PUT') {
      const body = await readJsonBody(req);
      sendResult(sendJson, res, updateAgent(match.agentId, body));
      return true;
    }

    await readEmptyBody(req);

    if (match.action === 'activate') {
      sendResult(sendJson, res, activateAgent(match.agentId));
      return true;
    }

    if (match.action === 'deactivate') {
      sendResult(sendJson, res, deactivateAgent(match.agentId));
      return true;
    }

    if (match.action === 'agent-root' && req.method === 'DELETE') {
      sendResult(sendJson, res, deleteAgent(match.agentId));
      return true;
    }

    sendJson(res, 405, { error: 'Method Not Allowed', sentToLLM: false, sentToClaude: false });
    return true;
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      status: 'AGENT_ADMIN_INVALID',
      sentToLLM: false,
      sentToClaude: false,
      errors: [error.message || 'Agent administration failed.']
    });
    return true;
  }
}
