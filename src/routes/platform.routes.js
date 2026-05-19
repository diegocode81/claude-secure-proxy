import {
  clearPlatformRefreshState,
  getPlatformRefreshState
} from '../platform/platform-refresh.service.js';

export function handlePlatformRoutes({
  req,
  res,
  pathname,
  sendJson
}) {
  if (req.method === 'GET' && pathname === '/platform/refresh-state') {
    sendJson(res, 200, {
      ...getPlatformRefreshState(),
      sentToLLM: false,
      sentToClaude: false
    });
    return true;
  }

  if (req.method === 'POST' && pathname === '/platform/refresh-state/clear') {
    sendJson(res, 200, {
      status: 'PLATFORM_REFRESH_STATE_CLEARED',
      refresh: clearPlatformRefreshState(),
      sentToLLM: false,
      sentToClaude: false
    });
    return true;
  }

  if (['/platform/refresh-state', '/platform/refresh-state/clear'].includes(pathname)) {
    sendJson(res, 405, {
      error: 'Method Not Allowed',
      sentToLLM: false,
      sentToClaude: false
    });
    return true;
  }

  return false;
}
