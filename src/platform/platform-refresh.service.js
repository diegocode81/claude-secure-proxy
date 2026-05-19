import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const REFRESH_FILE = path.join(DATA_DIR, 'platform-refresh.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createEmptyState(extra = {}) {
  return {
    refreshRequired: false,
    browserRefreshRecommended: false,
    serverRestartRecommended: false,
    reason: null,
    message: '',
    changedAreas: [],
    lastUpdatedAt: null,
    ...extra
  };
}

function writeRefreshState(state) {
  ensureDataDir();
  fs.writeFileSync(REFRESH_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}

export function getPlatformRefreshState() {
  ensureDataDir();

  if (!fs.existsSync(REFRESH_FILE)) {
    return createEmptyState();
  }

  try {
    const state = JSON.parse(fs.readFileSync(REFRESH_FILE, 'utf8'));

    return {
      ...createEmptyState(),
      ...state,
      changedAreas: Array.isArray(state.changedAreas) ? state.changedAreas : []
    };
  } catch {
    return createEmptyState();
  }
}

export function clearPlatformRefreshState() {
  return writeRefreshState(createEmptyState({
    lastClearedAt: new Date().toISOString()
  }));
}

export function buildRefreshNotice(reason = 'platform-config-updated') {
  const notices = {
    'agent-created': {
      changedAreas: ['agents', 'registry', 'navigation'],
      browserRefreshRecommended: true,
      serverRestartRecommended: true,
      message: 'Se creó un agente nuevo. Refresca el navegador. Si el agente no aparece en navegación o runtime, reinicia el servidor manualmente.'
    },
    'agent-updated': {
      changedAreas: ['agents', 'navigation'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se actualizó el agente. Refresca el navegador para ver los cambios.'
    },
    'agent-activated': {
      changedAreas: ['agents', 'runtime'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se activó el agente. Refresca la página del agente para ver el estado actualizado.'
    },
    'agent-deactivated': {
      changedAreas: ['agents', 'runtime'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se desactivó el agente. Refresca la página del agente para ver el estado actualizado.'
    },
    'agent-deleted': {
      changedAreas: ['agents', 'registry', 'navigation'],
      browserRefreshRecommended: true,
      serverRestartRecommended: true,
      message: 'Se eliminó un agente. Refresca el navegador. Si el agente sigue apareciendo en navegación, reinicia el servidor manualmente.'
    },
    'settings-dashboard-updated': {
      changedAreas: ['settings', 'dashboard'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se actualizó la configuración del dashboard. Refresca la pantalla para verificar los valores.'
    },
    'settings-llm-updated': {
      changedAreas: ['settings', 'llm'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se actualizó la configuración del LLM. Refresca la pantalla para verificar los valores.'
    },
    'settings-proxy-updated': {
      changedAreas: ['settings', 'proxy'],
      browserRefreshRecommended: true,
      serverRestartRecommended: true,
      message: 'Se actualizó la configuración del proxy. Refresca el navegador. Algunos cambios como puerto, URL pública u orígenes pueden requerir reiniciar o redeplegar la plataforma.'
    },
    'extension-config-updated': {
      changedAreas: ['extension', 'config'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se actualizó la configuración de la extensión. Refresca la pantalla y genera un nuevo VSIX si necesitas aplicar los cambios.'
    },
    'extension-generated': {
      changedAreas: ['extension', 'vsix'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se generó la extensión VS Code. Refresca la información de extensión para ver el nuevo VSIX.'
    },
    'usage-updated': {
      changedAreas: ['usage', 'dashboard'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se actualizó el consumo de LLM. Refresca el dashboard para ver el uso actualizado.'
    },
    'platform-config-updated': {
      changedAreas: ['platform'],
      browserRefreshRecommended: true,
      serverRestartRecommended: false,
      message: 'Se actualizó configuración de plataforma. Refresca la pantalla para ver los cambios.'
    }
  };

  return {
    reason,
    ...(notices[reason] || notices['platform-config-updated'])
  };
}

export function markPlatformRefreshRequired(options = {}) {
  const state = {
    refreshRequired: true,
    browserRefreshRecommended: Boolean(options.browserRefreshRecommended),
    serverRestartRecommended: Boolean(options.serverRestartRecommended),
    reason: options.reason || 'platform-config-updated',
    message: options.message || buildRefreshNotice(options.reason).message,
    changedAreas: Array.isArray(options.changedAreas) ? options.changedAreas : [],
    lastUpdatedAt: new Date().toISOString()
  };

  return writeRefreshState(state);
}

export function withRefresh(responseObject, reason) {
  const notice = buildRefreshNotice(reason);
  const refresh = markPlatformRefreshRequired(notice);

  return {
    ...responseObject,
    refresh
  };
}
