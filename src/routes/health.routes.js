export function handleHealthRoutes({ req, res, pathname, sendJson }) {
  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'claude-secure-proxy'
    });
    return true;
  }

  return false;
}
