import { renderModulesView } from '../views/modules.view.js';
import { renderAgentBuilderView } from '../views/agent-builder.view.js';
import { getAgentProfile } from '../agents/registry.js';
import { renderAgentDetailView } from '../views/agent-detail.view.js';
import { renderAgentEditView } from '../views/agent-edit.view.js';
import { renderQaLogAnalystExtensionView } from '../views/qa-log-analyst-extension.view.js';
import { renderQaLogAnalystView } from '../views/qa-log-analyst.view.js';
import { getAgentEditableData } from '../agent-builder/agent-admin.service.js';

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

  if (req.method === 'GET') {
    const editMatch = pathname.match(/^\/([^/]+)\/edit$/);

    if (editMatch) {
      const agentId = decodeURIComponent(editMatch[1]);
      const editData = getAgentEditableData(agentId);

      if (editData.status === 'AGENT_EDIT_DATA') {
        sendHtml(res, 200, renderAgentEditView(editData));
        return true;
      }
    }
  }

  if (req.method === 'GET') {
    const agentId = pathname.slice(1);
    const profile = getAgentProfile(agentId);

    if (profile?.navigation?.path === pathname) {
      sendHtml(res, 200, renderAgentDetailView(profile));
      return true;
    }
  }

  return false;
}
