import fs from 'node:fs';
import path from 'node:path';
import { getAgentProfile, listAgentProfiles, registerRuntimeAgentProfile } from '../agents/registry.js';
import {
  DEFAULT_AGENT_LLM_SETTINGS,
  buildAgentLlmSettingsFromInput
} from '../agents/shared/llm-settings.js';
import { getDefaultAgentGovernance } from '../agents/shared/governance.js';
import {
  DEFAULT_AGENT_IO,
  buildInputContractFromIO,
  buildOutputSchemaFromIO,
  validateAgentIO
} from '../agents/shared/contracts.js';
import { buildUserInstructionsFromIO } from '../agents/shared/io.js';
import { withRefresh } from '../platform/platform-refresh.service.js';
import {
  DEFAULT_INTERACTION,
  validateInteraction
} from './agent-interaction.js';

const AGENTS_DIR = path.resolve(process.cwd(), 'src', 'agents');
const REGISTRY_FILE = path.join(AGENTS_DIR, 'registry.js');
const ALLOWED_STATUSES = ['draft', 'review', 'disabled'];
const REQUIRED_FILES = [
  'profile.js',
  'skill.md',
  'prompt.md',
  'contract.md',
  'README.md',
  'readiness-checklist.md'
];

const INPUT_FIELDS = [
  'name',
  'id',
  'description',
  'role',
  'useCases',
  'skill',
  'prompt',
  'contractMarkdown',
  'inputContract',
  'outputSchema',
  'io',
  'capabilities',
  'readinessChecklistMarkdown',
  'status',
  'statusLabel',
  'navigationOrder',
  'inputMode',
  'acceptedInputTypes',
  'outputMode',
  'outputFields',
  'responsePreset',
  'downloadableOutput',
  'outputFileNamePattern',
  'interactionInstructions',
  'userInstructions',
  'responseDetailLevel',
  'maxOutputTokens',
  'temperaturePreset',
  'temperature'
];

function toKebabCase(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toImportName(agentId) {
  return `${agentId.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase())}Profile`;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseJsonField(value, fieldName, errors) {
  if (isPlainObject(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    errors.push(`${fieldName} must be a JSON object.`);
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!isPlainObject(parsed)) {
      errors.push(`${fieldName} must be a JSON object.`);
      return null;
    }
    return parsed;
  } catch {
    errors.push(`${fieldName} must be valid JSON.`);
    return null;
  }
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

function validateAgentId(agentId, errors) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agentId)) {
    errors.push('id must be kebab-case with lowercase letters, numbers and single hyphens.');
  }

  if (agentId.includes('/') || agentId.includes('..') || agentId.includes(' ') || agentId.includes('--')) {
    errors.push('id cannot contain path traversal, spaces or double hyphens.');
  }

  if (agentId === 'qa-log-analyst') {
    errors.push('qa-log-analyst is protected and cannot be created or overwritten.');
  }
}

function getNextNavigationOrder() {
  const orders = listAgentProfiles()
    .map((agent) => Number(agent?.navigation?.order))
    .filter((order) => Number.isFinite(order));

  return orders.length > 0 ? Math.max(...orders) + 10 : 100;
}

function getAcceptedInputTypesForIO(io) {
  return io.inputMode === 'text'
    ? ['text']
    : ['text', 'json', 'csv', 'html', 'markdown', 'pdf'];
}

function createInvalidResponse(errors, warnings = []) {
  return {
    status: 'AGENT_CREATION_INVALID',
    sentToClaude: false,
    errors,
    warnings
  };
}

function createProfile({
  id,
  name,
  status,
  statusLabel,
  description,
  inputContract,
  outputSchema,
  io,
  capabilities,
  governance,
  navigationOrder,
  interaction,
  llmSettings
}) {
  return {
    id,
    name,
    status,
    statusLabel,
    description,
    usage: 'Agente creado desde la UI de creación gobernada. La ejecución real permanece deshabilitada hasta aprobación.',
    capabilities,
    io,
    inputContract,
    outputSchema,
    outputContract: Array.isArray(outputSchema.fields) ? outputSchema.fields : [],
    relatedEndpoints: [`/agents/${id}/run`],
    execution: {
      enabled: false,
      mode: 'runtime-disabled',
      runtimeEndpoint: `/agents/${id}/run`,
      legacyEndpoints: []
    },
    navigation: {
      label: name,
      path: `/${id}`,
      order: navigationOrder
    },
    governance,
    interaction,
    llmSettings
  };
}

function writeFileSafe(agentDir, fileName, content) {
  const target = path.join(agentDir, fileName);
  const resolved = path.resolve(target);

  if (!resolved.startsWith(`${agentDir}${path.sep}`)) {
    throw new Error('Unsafe agent file path.');
  }

  fs.writeFileSync(resolved, `${content.trimEnd()}\n`);
  return resolved;
}

function renderProfile(profile) {
  return `export const agentProfile = ${JSON.stringify(profile, null, 2)};`;
}

function renderSkill({ name, description, role, skill }) {
  return `# ${name} Skill

## Propósito

${description}

## Rol QA

${role}

## Skill

${skill}

## Límites

- No ejecuta análisis real hasta aprobación.
- No debe inventar información sin evidencia.
- Debe pedir más contexto cuando la entrada sea insuficiente.

## Reglas de calidad

- Diferenciar evidencia de hipótesis.
- Mantener recomendaciones accionables.
- Reportar preguntas abiertas.

## Estado

La ejecución real permanece deshabilitada hasta completar checklist, pruebas, sanitización, presupuesto y revisión humana.`;
}

function renderPrompt({ name, prompt, outputSchema }) {
  return `# ${name} Prompt

## Prompt oficial

${prompt}

## Reglas de seguridad

- No exponer secretos.
- No saltarse sanitización.
- No saltarse control de presupuesto.
- No llamar LLM fuera del runtime común.

## Reglas de no invención

- No inventar hechos sin evidencia suficiente.
- Separar evidencia, hipótesis y preguntas abiertas.

## Contrato de salida esperado

\`\`\`json
${JSON.stringify(outputSchema, null, 2)}
\`\`\``;
}

function renderContract({ name, inputContract, outputSchema, contractMarkdown }) {
  if (contractMarkdown) {
    return contractMarkdown;
  }

  return `# ${name} Contract

## Request esperado

\`\`\`json
{
  "input": ${JSON.stringify(inputContract, null, 2)}
}
\`\`\`

## Response esperado

\`\`\`json
${JSON.stringify(outputSchema, null, 2)}
\`\`\`

## Estados esperados

- AGENT_EXECUTION_DISABLED
- AGENT_INPUT_INVALID
- AGENT_RESPONSE_READY

## Errores esperados

- Input inválido.
- Campos desconocidos.
- Ejecución deshabilitada.

## Ejemplo seguro

Este agente inicia deshabilitado y no llama LLM durante la creación.`;
}

function renderReadme({ id, name, description, status, useCases }) {
  return `# ${name}

## Propósito

${description}

## Casos de uso

${toList(useCases).map((item) => `- ${item}`).join('\n') || '- No definidos.'}

## Estado

${status}

## Ruta visual

\`/${id}\`

## Endpoint runtime

\`/agents/${id}/run\`

## Ejecución

La ejecución real está deshabilitada:

\`\`\`js
execution: {
  enabled: false,
  mode: 'runtime-disabled'
}
\`\`\`

## Archivos del agente

- profile.js
- skill.md
- prompt.md
- contract.md
- README.md
- readiness-checklist.md

## Validaciones pendientes

- Sanitización.
- Control de presupuesto.
- Smoke tests.
- Revisión humana.
- Plan de rollback.`;
}

function renderReadinessChecklist() {
  return `# Readiness Checklist

- [ ] Propósito QA revisado.
- [ ] Skill revisado.
- [ ] Prompt oficial revisado.
- [ ] Contrato de entrada validado.
- [ ] Contrato de salida validado.
- [ ] Configuración de interacción validada.
- [ ] Configuración LLM validada.
- [ ] Sanitización activa.
- [ ] Control de presupuesto activo.
- [ ] Prueba con input válido ejecutada.
- [ ] Prueba con input inválido ejecutada.
- [ ] Prueba anti prompt-injection ejecutada.
- [ ] Revisión humana completada.
- [ ] Plan de rollback definido.`;
}

function updateRegistryFile(agentId) {
  const registryContent = fs.readFileSync(REGISTRY_FILE, 'utf8');

  if (registryContent.includes(`./${agentId}/profile.js`)) {
    return false;
  }

  const importName = toImportName(agentId);
  const importLine = `import { agentProfile as ${importName} } from './${agentId}/profile.js';`;
  const withImport = registryContent.replace(
    /(import .+?;\n)(?!import)/s,
    (match) => `${match}${importLine}\n`
  );
  const withRegistry = withImport.replace(
    /export const agentRegistry = \[\n([\s\S]*?)\n\];/,
    (match, entries) => {
      const trimmed = entries.trim();
      const nextEntries = trimmed.endsWith(',')
        ? `${entries}\n  ${importName}`
        : `${entries},\n  ${importName}`;
      return `export const agentRegistry = [\n${nextEntries}\n];`;
    }
  );

  fs.writeFileSync(REGISTRY_FILE, withRegistry);
  return true;
}

export function getAgentBuilderSchema() {
  return {
    statuses: ALLOWED_STATUSES,
    requiredStructure: REQUIRED_FILES,
    defaults: {
      inputContract: {
        required: ['text'],
        requiredAnyOf: [],
        optional: ['context'],
        disallowUnknownFields: true,
        fields: {
          text: {
            type: 'string',
            minLength: 1,
            maxLength: 60000
          },
          context: {
            type: 'string',
            required: false,
            maxLength: 20000
          }
        }
      },
      outputSchema: {
        fields: ['summary', 'data', 'risks', 'recommendations', 'openQuestions']
      },
      io: DEFAULT_AGENT_IO,
      governance: getDefaultAgentGovernance(),
      interaction: DEFAULT_INTERACTION,
      llmSettings: DEFAULT_AGENT_LLM_SETTINGS
    },
    validation: {
      id: 'kebab-case, no path traversal, no duplicates',
      execution: 'always disabled with runtime-disabled mode',
      sentToClaude: false
    },
    sentToClaude: false
  };
}

export function createAgentFromInput(input) {
  const unknownFields = Object.keys(input || {}).filter((field) => !INPUT_FIELDS.includes(field));
  const errors = [];
  const warnings = [];

  if (unknownFields.length > 0) {
    errors.push(`Unknown fields are not allowed: ${unknownFields.join(', ')}.`);
  }

  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const id = typeof input?.id === 'string' ? input.id.trim() : '';
  const description = typeof input?.description === 'string' ? input.description.trim() : '';
  const role = typeof input?.role === 'string' ? input.role.trim() : '';
  const contractMarkdown = typeof input?.contractMarkdown === 'string' ? input.contractMarkdown.trim() : '';
  const skill = typeof input?.skill === 'string' ? input.skill.trim() : '';
  const prompt = typeof input?.prompt === 'string' ? input.prompt.trim() : '';
  const status = 'draft';
  const statusLabel = 'Borrador';
  const navigationOrder = getNextNavigationOrder();
  const io = validateAgentIO({
    inputMode: input?.io?.inputMode ?? input?.inputMode,
    outputMode: input?.io?.outputMode ?? input?.outputMode,
    responsePreset: input?.io?.responsePreset ?? input?.responsePreset,
    outputFields: input?.io?.outputFields ?? input?.outputFields
  }, errors);
  const userInstructions = buildUserInstructionsFromIO(io);
  const inputContract = buildInputContractFromIO(io);
  const outputSchema = buildOutputSchemaFromIO(io);
  const capabilities = toList(input?.capabilities);
  const governance = getDefaultAgentGovernance();
  const useCases = toList(input?.useCases);
  const llmSettings = buildAgentLlmSettingsFromInput({
    responseDetailLevel: input?.responseDetailLevel,
    maxOutputTokens: input?.maxOutputTokens,
    temperaturePreset: input?.temperaturePreset,
    temperature: input?.temperature
  }, errors);
  const interaction = validateInteraction({
    inputMode: io.inputMode === 'text_and_file' ? 'text-and-file' : io.inputMode,
    acceptedInputTypes: input?.acceptedInputTypes || getAcceptedInputTypesForIO(io),
    outputMode: io.outputMode === 'download'
      ? 'downloadable-report'
      : io.outputMode === 'screen_and_download'
        ? 'screen-and-download'
        : 'screen',
    downloadableOutput: io.outputMode === 'download' || io.outputMode === 'screen_and_download',
    outputFileNamePattern: input?.outputFileNamePattern,
    instructions: userInstructions
  }, errors);

  if (name.length < 3 || name.length > 80) {
    errors.push('name must be between 3 and 80 characters.');
  }

  validateAgentId(id, errors);

  if (description.length < 10 || description.length > 300) {
    errors.push('description must be between 10 and 300 characters.');
  }

  if (skill.length < 30) {
    errors.push('skill must be at least 30 characters.');
  }

  if (prompt.length < 30) {
    errors.push('prompt must be at least 30 characters.');
  }

  if (contractMarkdown && contractMarkdown.length < 30) {
    errors.push('contractMarkdown must be at least 30 characters.');
  }

  if (getAgentProfile(id)) {
    errors.push(`Agent ${id} is already registered.`);
  }

  const agentDir = path.resolve(AGENTS_DIR, id);

  if (!agentDir.startsWith(`${AGENTS_DIR}${path.sep}`)) {
    errors.push('Unsafe agent path.');
  }

  if (fs.existsSync(agentDir)) {
    errors.push(`Agent directory already exists: src/agents/${id}.`);
  }

  if (errors.length > 0) {
    return createInvalidResponse(errors, warnings);
  }

  const profile = createProfile({
    id,
    name,
    status,
    statusLabel,
    description,
    inputContract,
    outputSchema,
    io,
    capabilities,
    governance,
    navigationOrder,
    interaction,
    llmSettings
  });

  fs.mkdirSync(agentDir, { recursive: false });

  const createdFiles = [
    writeFileSafe(agentDir, 'profile.js', renderProfile(profile)),
    writeFileSafe(agentDir, 'skill.md', renderSkill({ name, description, role, skill })),
    writeFileSafe(agentDir, 'prompt.md', renderPrompt({ name, prompt, outputSchema })),
    writeFileSafe(agentDir, 'contract.md', renderContract({ name, inputContract, outputSchema, contractMarkdown })),
    writeFileSafe(agentDir, 'README.md', renderReadme({ id, name, description, status, useCases })),
    writeFileSafe(agentDir, 'readiness-checklist.md', renderReadinessChecklist())
  ].map((filePath) => path.relative(process.cwd(), filePath));

  const registryUpdated = updateRegistryFile(id);
  registerRuntimeAgentProfile(profile);

  return withRefresh({
    status: 'AGENT_CREATED',
    sentToClaude: false,
    agentId: id,
    route: `/${id}`,
    createdFiles,
    registryUpdated,
    warnings
  }, 'agent-created');
}

export function suggestAgentId(name) {
  return toKebabCase(name);
}
