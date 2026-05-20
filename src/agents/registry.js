import { qaLogAnalystProfile } from './qa-log-analyst/profile.js';
import { agentProfile as qaChistesProfile } from './qa-chistes/profile.js';

export const AGENT_MODULE_FILE_STANDARD = [
  'profile.js',
  'skill.md',
  'prompt.md',
  'contract.md',
  'README.md'
];

export const AGENT_PROFILE_REQUIRED_FIELDS = [
  'id',
  'name',
  'status',
  'statusLabel',
  'description',
  'usage',
  'navigation',
  'relatedEndpoints',
  'execution',
  'capabilities',
  'outputContract',
  'governance'
];

export const agentRegistry = [
  qaLogAnalystProfile,
  qaChistesProfile
];

const runtimeAgentRegistry = [];

function getAllAgentProfiles() {
  return [
    ...agentRegistry,
    ...runtimeAgentRegistry
  ].filter(Boolean);
}

export function registerRuntimeAgentProfile(profile) {
  if (!profile?.id || getAllAgentProfiles().some((item) => item.id === profile.id)) {
    return false;
  }

  runtimeAgentRegistry.push(profile);
  return true;
}

export const platformModuleRegistry = [
  {
    id: 'dashboard',
    type: 'system',
    name: 'Dashboard',
    navigation: {
      label: 'Dashboard',
      path: '/dashboard',
      order: 0
    }
  },
  {
    id: 'modules',
    type: 'system',
    name: 'Módulos',
    navigation: {
      label: 'Módulos',
      path: '/modules',
      order: 5
    }
  },
  {
    id: 'agent-builder',
    type: 'visual-placeholder',
    name: 'Crear agentes',
    status: 'active',
    statusLabel: 'Creación gobernada habilitada',
    description: 'Crea estructura base de agentes QA desde la plataforma con ejecución deshabilitada y revisión humana pendiente.',
    navigation: {
      label: 'Crear agentes',
      path: '/agent-builder',
      order: 20
    },
    capabilities: [
      'Crear estructura estándar de agente',
      'Validar contratos y campos obligatorios',
      'Registrar agente en el registry',
      'Mantener runtime deshabilitado por defecto'
    ],
    governance: [
      'No es un agente registrado',
      'No activa agentes',
      'No elimina agentes',
      'No permite sobrescribir QA Log Analyst',
      'No llama a LLM'
    ]
  }
];

export function listAgentProfiles() {
  return getAllAgentProfiles();
}

export function getAgentProfile(agentId) {
  return getAllAgentProfiles().find((profile) => profile.id === agentId) || null;
}

export function listAgentNavigationItems() {
  return getAllAgentProfiles()
    .filter((profile) => profile.navigation)
    .map((profile) => ({
      label: profile.navigation.label || profile.name,
      href: profile.navigation.path,
      order: Number(profile.navigation.order ?? 100),
      agentId: profile.id,
      status: profile.status
    }))
    .sort((left, right) => left.order - right.order);
}

export function listPlatformNavigationItems() {
  const moduleItems = platformModuleRegistry.map((module) => ({
    label: module.navigation.label || module.name,
    href: module.navigation.path,
    order: Number(module.navigation.order ?? 100),
    moduleId: module.id,
    type: module.type,
    status: module.status
  }));

  return [
    ...moduleItems,
    ...listAgentNavigationItems()
  ].sort((left, right) => left.order - right.order);
}

export function listModuleCatalogItems() {
  const activeAgents = getAllAgentProfiles().map((profile) => ({
    id: profile.id,
    type: 'agent',
    name: profile.name,
    status: profile.status,
    statusLabel: profile.statusLabel,
    description: profile.description,
    path: profile.navigation?.path || '',
    capabilities: profile.capabilities,
    execution: profile.execution,
    inputContract: profile.inputContract,
    outputSchema: profile.outputSchema,
    governance: profile.governance
  }));

  const platformModules = platformModuleRegistry
    .filter((module) => module.type === 'visual-placeholder')
    .map((module) => ({
      id: module.id,
      type: module.type,
      name: module.name,
      status: module.status || 'disabled',
      statusLabel: module.statusLabel || 'No habilitado',
      description: module.description || '',
      path: module.navigation?.path || '',
      capabilities: module.capabilities || [],
      governance: module.governance || []
    }));

  return [
    ...activeAgents,
    ...platformModules
  ];
}

export function assertAgentProfileShape(profile) {
  const missingFields = AGENT_PROFILE_REQUIRED_FIELDS.filter((field) => !(field in profile));

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}
