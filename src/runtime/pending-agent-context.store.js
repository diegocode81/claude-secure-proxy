const pendingAgentContexts = new Map();

function normalizeClarificationCount(value, fallback = 1) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : fallback;
}

// MVP temporal: contexto pendiente en memoria por agente.
// No persiste entre reinicios y solo mantiene la última interacción pendiente.
export function savePendingAgentContext(agentId, payload) {
  const normalizedAgentId = String(agentId || '').trim();
  if (!normalizedAgentId) return;

  const now = new Date().toISOString();
  const existing = pendingAgentContexts.get(normalizedAgentId);
  const existingClarificationCount = normalizeClarificationCount(existing?.clarificationCount, 1);
  const clarificationCount = payload?.clarificationCount
    ? normalizeClarificationCount(payload.clarificationCount, existingClarificationCount)
    : existing
      ? existingClarificationCount + 1
      : 1;

  pendingAgentContexts.set(normalizedAgentId, {
    agentId: normalizedAgentId,
    originalUserInput: String(payload?.originalUserInput || existing?.originalUserInput || ''),
    previousAgentResponse: String(payload?.previousAgentResponse || ''),
    clarificationCount,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    status: 'needs_more_information'
  });
}

export function getPendingAgentContext(agentId) {
  const normalizedAgentId = String(agentId || '').trim();
  const context = pendingAgentContexts.get(normalizedAgentId);
  return context
    ? {
        ...context,
        clarificationCount: normalizeClarificationCount(context.clarificationCount, 1)
      }
    : null;
}

export function clearPendingAgentContext(agentId) {
  const normalizedAgentId = String(agentId || '').trim();
  if (!normalizedAgentId) return;
  pendingAgentContexts.delete(normalizedAgentId);
}
