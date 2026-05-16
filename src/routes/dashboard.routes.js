import { renderDashboard } from '../dashboard/dashboard.service.js';
import { getUsageSummary } from '../usage/usage-store.js';

export function handleDashboardRoutes({ req, res, pathname, sendHtml }) {
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/') {
    res.writeHead(302, { location: '/dashboard' });
    res.end();
    return true;
  }

  if (req.method === 'GET' && pathname === '/dashboard') {
    sendHtml(res, 200, renderDashboard(getUsageSummary()));
    return true;
  }

  return false;
}
