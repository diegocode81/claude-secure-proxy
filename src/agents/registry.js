import { qaLogAnalystProfile } from './qa-log-analyst/profile.js';

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
  qaLogAnalystProfile
];

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
    status: 'disabled',
    statusLabel: 'No habilitado',
    description: 'Prepara la futura creación gobernada de agentes QA desde la plataforma. No crea agentes todavía.',
    navigation: {
      label: 'Crear agentes',
      path: '/agent-builder',
      order: 20
    },
    capabilities: [
      'Mostrar requisitos futuros para crear agentes',
      'Documentar gobierno de agentes',
      'Separar visión futura de funcionalidad activa',
      'Evitar creación dinámica prematura'
    ],
    governance: [
      'No es un agente registrado',
      'No crea agentes todavía',
      'No edita agentes',
      'No activa agentes',
      'No elimina agentes',
      'No llama a Claude'
    ]
  }
];

export function listAgentProfiles() {
  return agentRegistry;
}

export function getAgentProfile(agentId) {
  return agentRegistry.find((profile) => profile.id === agentId) || null;
}

export function listAgentNavigationItems() {
  return agentRegistry
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
  const activeAgents = agentRegistry.map((profile) => ({
    id: profile.id,
    type: 'agent',
    name: profile.name,
    status: profile.status,
    statusLabel: profile.statusLabel,
    description: profile.description,
    path: profile.navigation?.path || '',
    capabilities: profile.capabilities,
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
