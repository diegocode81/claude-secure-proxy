import fs from 'node:fs';
import path from 'node:path';
import { getAgentProfile } from '../agents/registry.js';
import {
  buildAgentLlmSettingsFromInput,
  normalizeAgentLlmSettings
} from '../agents/shared/llm-settings.js';
import { getDefaultAgentGovernance } from '../agents/shared/governance.js';
import {
  buildInputContractFromIO,
  buildOutputSchemaFromIO,
  inferAgentIO,
  validateAgentIO
} from '../agents/shared/contracts.js';
import { buildUserInstructionsFromIO } from '../agents/shared/io.js';
import { withRefresh } from '../platform/platform-refresh.service.js';
import {
  normalizeInteraction,
  validateInteraction
} from './agent-interaction.js';

const AGENTS_DIR = path.resolve(process.cwd(), 'src', 'agents');
const REGISTRY_FILE = path.join(AGENTS_DIR, 'registry.js');
const PROTECTED_AGENT_IDS = ['qa-log-analyst'];
const UPDATE_FIELDS = [
  'name',
  'description',
  'capabilities',
  'skillMarkdown',
  'promptMarkdown',
  'contractMarkdown',
  'readmeMarkdown',
  'io',
  'inputMode',
  'acceptedInputTypes',
  'outputMode',
  'outputFields',
  'responsePreset',
  'downloadableOutput',
  'outputFileNamePattern',
  'responseDetailLevel',
  'maxOutputTokens',
  'temperaturePreset',
  'temperature'
];
const BLOCKED_UPDATE_FIELDS = [
  'id',
  'agentId',
  'execution',
  'enabled',
  'mode',
  'runtimeEndpoint',
  'legacyEndpoints',
  'status',
  'statusLabel',
  'navigationOrder',
  'readinessChecklistMarkdown',
  'governance',
  'interactionInstructions',
  'userInstructions',
  'inputContract',
  'outputSchema'
];
const EDITABLE_STATUSES = ['draft', 'review', 'disabled'];

function adminError(status, errors, statusCode = 400) {
  return {
    status,
    statusCode,
    sentToLLM: false,
    sentToClaude: false,
    errors: Array.isArray(errors) ? errors : [errors]
  };
}

function validateAgentId(agentId) {
  const id = String(agentId || '').trim();
  const errors = [];

  if (!id) {
    errors.push('agentId is required.');
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    errors.push('agentId must be kebab-case.');
  }

  if (id.includes('/') || id.includes('..') || id.includes(' ') || id.includes('--')) {
    errors.push('agentId cannot contain path traversal, spaces or double hyphens.');
  }

  return {
    id,
    valid: errors.length === 0,
    errors
  };
}

function assertManageableAgent(agentId) {
  const validation = validateAgentId(agentId);

  if (!validation.valid) {
    return {
      ok: false,
      error: adminError('AGENT_ADMIN_INVALID', validation.errors)
    };
  }

  if (PROTECTED_AGENT_IDS.includes(validation.id)) {
    return {
      ok: false,
      error: adminError('AGENT_PROTECTED', `${validation.id} is protected by the platform.`, 403)
    };
  }

  const agentDir = path.resolve(AGENTS_DIR, validation.id);

  if (!agentDir.startsWith(`${AGENTS_DIR}${path.sep}`)) {
    return {
      ok: false,
      error: adminError('AGENT_ADMIN_INVALID', 'Unsafe agent path.')
    };
  }

  const profileFile = path.join(agentDir, 'profile.js');
  const registeredProfile = getAgentProfile(validation.id);

  if (!fs.existsSync(agentDir) || !fs.existsSync(profileFile) || !registeredProfile) {
    return {
      ok: false,
      error: adminError('AGENT_NOT_FOUND', `Agent ${validation.id} was not found.`, 404)
    };
  }

  return {
    ok: true,
    id: validation.id,
    agentDir,
    profileFile,
    registeredProfile
  };
}

function parseProfileFile(profileFile) {
  const content = fs.readFileSync(profileFile, 'utf8');
  const match = content.match(/export const agentProfile = ([\s\S]*);?\s*$/);

  if (!match) {
    throw new Error('Agent profile file format is invalid.');
  }

  return JSON.parse(match[1].replace(/;\s*$/, ''));
}

function writeProfileFile(profileFile, profile) {
  fs.writeFileSync(profileFile, `export const agentProfile = ${JSON.stringify(profile, null, 2)};\n`);
}

function readTextFile(agentDir, fileName) {
  const target = path.join(agentDir, fileName);

  if (!fs.existsSync(target)) {
    return '';
  }

  return fs.readFileSync(target, 'utf8');
}

function writeTextFile(agentDir, fileName, content) {
  const target = path.join(agentDir, fileName);
  const resolved = path.resolve(target);

  if (!resolved.startsWith(`${agentDir}${path.sep}`)) {
    throw new Error('Unsafe agent file path.');
  }

  fs.writeFileSync(resolved, `${String(content || '').trimEnd()}\n`);
  return path.relative(process.cwd(), resolved);
}

function updateProfileState(agentContext, nextState) {
  const profile = parseProfileFile(agentContext.profileFile);

  const nextProfile = {
    ...profile,
    status: nextState.status,
    statusLabel: nextState.statusLabel,
    execution: {
      ...(profile.execution || {}),
      enabled: nextState.executionEnabled,
      mode: nextState.executionMode,
      runtimeEndpoint: profile.execution?.runtimeEndpoint || `/agents/${agentContext.id}/run`,
      legacyEndpoints: profile.execution?.legacyEndpoints || []
    }
  };

  writeProfileFile(agentContext.profileFile, nextProfile);
  Object.assign(agentContext.registeredProfile, nextProfile);

  return nextProfile;
}

function toImportName(agentId) {
  return `${agentId.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())}Profile`;
}

function removeAgentFromRegistry(agentId) {
  const registryContent = fs.readFileSync(REGISTRY_FILE, 'utf8');
  const importName = toImportName(agentId);
  const importPattern = new RegExp(`^import \\{ agentProfile as ${importName} \\} from '\\./${agentId}/profile\\.js';\\n`, 'm');
  const withoutImport = registryContent.replace(importPattern, '');
  const entryPattern = new RegExp(`\\n\\s*,?\\s*${importName}(?=\\n|,)`, 'm');
  const withoutEntry = withoutImport
    .replace(entryPattern, '')
    .replace(/,\s*,/g, ',')
    .replace(/export const agentRegistry = \[\n\s*,/, 'export const agentRegistry = [')
    .replace(/,\s*\n\];/, '\n];');

  fs.writeFileSync(REGISTRY_FILE, withoutEntry);
  return withoutEntry !== registryContent;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAcceptedInputTypesForIO(io) {
  return io.inputMode === 'text'
    ? ['text']
    : ['text', 'json', 'csv', 'html', 'markdown', 'pdf'];
}

function validateStringField(value, fieldName, min, max, errors) {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (normalized.length < min || normalized.length > max) {
    errors.push(`${fieldName} must be between ${min} and ${max} characters.`);
  }

  return normalized;
}

function validateMarkdownField(value, fieldName, min, errors) {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (normalized.length < min) {
    errors.push(`${fieldName} must be at least ${min} characters.`);
  }

  return normalized;
}

export function getAgentProtectionInfo(agentId) {
  const id = String(agentId || '').trim();

  return {
    agentId: id,
    protected: PROTECTED_AGENT_IDS.includes(id),
    reason: PROTECTED_AGENT_IDS.includes(id)
      ? 'Agente base protegido por la plataforma.'
      : ''
  };
}

export function getAgentEditableData(agentId) {
  const agentContext = assertManageableAgent(agentId);

  if (!agentContext.ok) {
    return agentContext.error;
  }

  try {
    const profile = parseProfileFile(agentContext.profileFile);

    return {
      status: 'AGENT_EDIT_DATA',
      sentToLLM: false,
      sentToClaude: false,
      id: profile.id,
      name: profile.name,
      description: profile.description,
      statusValue: profile.status,
      statusLabel: profile.statusLabel,
      navigationOrder: Number(profile.navigation?.order ?? 100),
      capabilities: profile.capabilities || [],
      governance: profile.governance || [],
      io: inferAgentIO(profile),
      inputContract: profile.inputContract || {},
      outputSchema: profile.outputSchema || {},
      interaction: normalizeInteraction(profile.interaction || {}),
      llmSettings: normalizeAgentLlmSettings(profile.llmSettings || {}),
      skillMarkdown: readTextFile(agentContext.agentDir, 'skill.md'),
      promptMarkdown: readTextFile(agentContext.agentDir, 'prompt.md'),
      contractMarkdown: readTextFile(agentContext.agentDir, 'contract.md'),
      readmeMarkdown: readTextFile(agentContext.agentDir, 'README.md'),
      readinessChecklistMarkdown: readTextFile(agentContext.agentDir, 'readiness-checklist.md'),
      execution: profile.execution || {
        enabled: false,
        mode: 'runtime-disabled',
        runtimeEndpoint: `/agents/${profile.id}/run`,
        legacyEndpoints: []
      }
    };
  } catch (error) {
    return adminError('AGENT_ADMIN_FAILED', error.message || 'Failed to read editable agent data.');
  }
}

export function activateAgent(agentId) {
  const agentContext = assertManageableAgent(agentId);

  if (!agentContext.ok) {
    return agentContext.error;
  }

  const profile = updateProfileState(agentContext, {
    status: 'active',
    statusLabel: 'Activo',
    executionEnabled: true,
    executionMode: 'runtime-enabled'
  });

  return withRefresh({
    status: 'AGENT_ACTIVATED',
    sentToLLM: false,
    sentToClaude: false,
    agentId: agentContext.id,
    execution: profile.execution
  }, 'agent-activated');
}

export function deactivateAgent(agentId) {
  const agentContext = assertManageableAgent(agentId);

  if (!agentContext.ok) {
    return agentContext.error;
  }

  const profile = updateProfileState(agentContext, {
    status: 'disabled',
    statusLabel: 'Deshabilitado',
    executionEnabled: false,
    executionMode: 'runtime-disabled'
  });

  return withRefresh({
    status: 'AGENT_DEACTIVATED',
    sentToLLM: false,
    sentToClaude: false,
    agentId: agentContext.id,
    execution: profile.execution
  }, 'agent-deactivated');
}

export function deleteAgent(agentId) {
  const agentContext = assertManageableAgent(agentId);

  if (!agentContext.ok) {
    return agentContext.error;
  }

  const registryUpdated = removeAgentFromRegistry(agentContext.id);
  fs.rmSync(agentContext.agentDir, { recursive: true, force: true });

  return withRefresh({
    status: 'AGENT_DELETED',
    sentToLLM: false,
    sentToClaude: false,
    agentId: agentContext.id,
    registryUpdated,
    folderDeleted: !fs.existsSync(agentContext.agentDir)
  }, 'agent-deleted');
}

export function updateAgent(agentId, payload) {
  const agentContext = assertManageableAgent(agentId);

  if (!agentContext.ok) {
    return agentContext.error;
  }

  const input = isPlainObject(payload) ? payload : {};
  const fields = Object.keys(input);
  const unknownFields = fields.filter((field) => !UPDATE_FIELDS.includes(field));
  const blockedFields = fields.filter((field) => BLOCKED_UPDATE_FIELDS.includes(field));
  const errors = [];

  if (unknownFields.length > 0) {
    errors.push(`Unknown fields are not allowed: ${unknownFields.join(', ')}.`);
  }

  if (blockedFields.length > 0) {
    errors.push(`Protected fields cannot be edited: ${blockedFields.join(', ')}.`);
  }

  if (Object.values(input).some((value) => value === 'runtime-enabled')) {
    errors.push('runtime-enabled cannot be assigned from edit form.');
  }

  let profile;
  try {
    profile = parseProfileFile(agentContext.profileFile);
  } catch (error) {
    return adminError('AGENT_ADMIN_FAILED', error.message || 'Failed to parse profile.');
  }

  const name = validateStringField(input.name, 'name', 3, 80, errors);
  const description = validateStringField(input.description, 'description', 10, 300, errors);
  const skillMarkdown = validateMarkdownField(input.skillMarkdown, 'skillMarkdown', 30, errors);
  const promptMarkdown = validateMarkdownField(input.promptMarkdown, 'promptMarkdown', 30, errors);
  const contractMarkdown = validateMarkdownField(input.contractMarkdown, 'contractMarkdown', 30, errors);
  const readmeMarkdown = validateMarkdownField(input.readmeMarkdown, 'readmeMarkdown', 20, errors);

  const capabilities = toList(input.capabilities);
  const governance = Array.isArray(profile.governance) && profile.governance.length > 0
    ? profile.governance
    : getDefaultAgentGovernance();
  const llmSettings = buildAgentLlmSettingsFromInput({
    responseDetailLevel: input.responseDetailLevel,
    maxOutputTokens: input.maxOutputTokens,
    temperaturePreset: input.temperaturePreset,
    temperature: input.temperature
  }, errors);
  const io = validateAgentIO({
    inputMode: input.io?.inputMode ?? input.inputMode ?? inferAgentIO(profile).inputMode,
    outputMode: input.io?.outputMode ?? input.outputMode ?? inferAgentIO(profile).outputMode,
    responsePreset: input.io?.responsePreset ?? input.responsePreset ?? inferAgentIO(profile).responsePreset,
    outputFields: input.io?.outputFields ?? input.outputFields ?? inferAgentIO(profile).outputFields
  }, errors);
  const userInstructions = buildUserInstructionsFromIO(io);
  const interaction = validateInteraction({
    inputMode: io.inputMode === 'text_and_file' ? 'text-and-file' : io.inputMode,
    acceptedInputTypes: input.acceptedInputTypes || getAcceptedInputTypesForIO(io),
    outputMode: io.outputMode === 'download'
      ? 'downloadable-report'
      : io.outputMode === 'screen_and_download'
        ? 'screen-and-download'
        : 'screen',
    downloadableOutput: io.outputMode === 'download' || io.outputMode === 'screen_and_download',
    outputFileNamePattern: input.outputFileNamePattern,
    instructions: userInstructions
  }, errors);

  if (capabilities.length === 0) {
    errors.push('capabilities must include at least one item.');
  }

  if (errors.length > 0) {
    return adminError('AGENT_UPDATE_INVALID', errors);
  }

  const preservedExecution = {
    ...(profile.execution || {}),
    runtimeEndpoint: profile.execution?.runtimeEndpoint || `/agents/${agentContext.id}/run`,
    legacyEndpoints: profile.execution?.legacyEndpoints || []
  };
  const nextInputContract = buildInputContractFromIO(io);
  const nextOutputSchema = buildOutputSchemaFromIO(io);
  const nextProfile = {
    ...profile,
    id: profile.id,
    name,
    status: profile.status,
    statusLabel: profile.statusLabel,
    description,
    capabilities,
    io,
    inputContract: nextInputContract,
    outputSchema: nextOutputSchema,
    outputContract: nextOutputSchema.fields,
    execution: preservedExecution,
    navigation: {
      ...(profile.navigation || {}),
      label: name,
      path: profile.navigation?.path || `/${profile.id}`,
      order: Number(profile.navigation?.order ?? 100)
    },
    governance,
    interaction,
    llmSettings
  };

  try {
    writeProfileFile(agentContext.profileFile, nextProfile);
    const updatedFiles = [
      path.relative(process.cwd(), agentContext.profileFile),
      writeTextFile(agentContext.agentDir, 'skill.md', skillMarkdown),
      writeTextFile(agentContext.agentDir, 'prompt.md', promptMarkdown),
      writeTextFile(agentContext.agentDir, 'contract.md', contractMarkdown),
      writeTextFile(agentContext.agentDir, 'README.md', readmeMarkdown)
    ];

    Object.assign(agentContext.registeredProfile, nextProfile);

    return withRefresh({
      status: 'AGENT_UPDATED',
      sentToLLM: false,
      sentToClaude: false,
      agentId: agentContext.id,
      updatedFiles,
      executionPreserved: true,
      execution: nextProfile.execution
    }, 'agent-updated');
  } catch (error) {
    return adminError('AGENT_ADMIN_FAILED', error.message || 'Failed to update agent.');
  }
}
