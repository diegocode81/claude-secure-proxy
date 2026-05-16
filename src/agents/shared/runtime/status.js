export const AGENT_RUNTIME_STATUS = {
  BLOCKED: 'BLOCKED',
  SANITIZED: 'SANITIZED',
  ALLOWED: 'ALLOWED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  ERROR: 'ERROR'
};

export function createAgentError(message, statusCode = 400, details = {}) {
  return Object.assign(new Error(message), {
    statusCode,
    details
  });
}
