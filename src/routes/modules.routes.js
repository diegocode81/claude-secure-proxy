import { renderModulesView } from '../views/modules.view.js';
import { renderAgentBuilderView } from '../views/agent-builder.view.js';
import { renderQaLogAnalystExtensionView } from '../views/qa-log-analyst-extension.view.js';
import { renderQaLogAnalystView } from '../views/qa-log-analyst.view.js';

export function handleModulesRoutes({ req, res, pathname, sendHtml }) {
  if (req.method === 'GET' && pathname === '/modules') {
    sendHtml(res, 200, renderModulesView());
    return true;
  }

  if (req.method === 'GET' && pathname === '/qa-log-analyst') {
    sendHtml(res, 200, renderQaLogAnalystView());
    return true;
  }

  if (req.method === 'GET' && pathname === '/qa-log-analyst/extension') {
    sendHtml(res, 200, renderQaLogAnalystExtensionView());
    return true;
  }

  if (req.method === 'GET' && pathname === '/agent-builder') {
    sendHtml(res, 200, renderAgentBuilderView());
    return true;
  }

  return false;
}
