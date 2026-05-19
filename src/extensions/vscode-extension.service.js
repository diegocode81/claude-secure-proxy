import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { withRefresh } from '../platform/platform-refresh.service.js';

const EXTENSION_DIR = path.resolve(process.cwd(), 'secure-code-vscode');
const PACKAGE_JSON_PATH = path.join(EXTENSION_DIR, 'package.json');
const EXTENSION_CONFIG_PATH = path.join(EXTENSION_DIR, 'extension.config.json');
const DOWNLOAD_PATH = '/downloads/secure-code-vscode';
const BUILD_SCRIPT_PRIORITY = [
  'package',
  'vsix',
  'build',
  'compile',
  'vscode:prepublish'
];
const GENERATION_TIMEOUT_MS = 120000;
const OUTPUT_LIMIT = 6000;
const DEFAULT_EXTENSION_CONFIG = {
  proxyBaseUrl: 'http://localhost:3000',
  defaultTechnology: 'unknown',
  contextOptions: ['frontend', 'backend', 'api', 'mobile', 'pipeline', 'unknown'],
  maxCandidateFiles: 50,
  maxRelevantFiles: 10,
  maxSnippetLines: 120,
  maxContextChars: 60000,
  maxFileBytes: 524288,
  searchPattern: '/*.{js,jsx,ts,tsx,java,cs,feature,json,yml,yaml,xml,gradle}',
  excludePattern: '{/.env,/.env.*,/secret*,/credential*,/password*,/node_modules/,/dist/,/build/,/.git/}'
};
const EDITABLE_CONFIG_FIELDS = Object.keys(DEFAULT_EXTENSION_CONFIG);
const BLOCKED_CONFIG_FIELDS = [
  'SENSITIVE_PATH_REGEX',
  'SENSITIVE_SNIPPET_REGEX',
  'sensitivePathRegex',
  'sensitiveSnippetRegex',
  'secret',
  'token',
  'password',
  'apiKey'
];

function summarizeOutput(output = '') {
  if (output.length <= OUTPUT_LIMIT) {
    return output;
  }

  return output.slice(-OUTPUT_LIMIT);
}

function readExtensionPackageJson() {
  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
  } catch (error) {
    return {
      __readError: error.message
    };
  }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function validateConfigValue(field, value) {
  if (field === 'contextOptions') {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }

  if (['maxCandidateFiles', 'maxRelevantFiles', 'maxSnippetLines', 'maxContextChars', 'maxFileBytes'].includes(field)) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  return typeof value === 'string';
}

function normalizeExtensionConfig(rawConfig = {}) {
  const config = {};
  const warnings = [];

  for (const field of EDITABLE_CONFIG_FIELDS) {
    if (validateConfigValue(field, rawConfig[field])) {
      config[field] = rawConfig[field];
    } else {
      config[field] = DEFAULT_EXTENSION_CONFIG[field];
      if (field in rawConfig) {
        warnings.push(`Invalid value for ${field}. Default applied.`);
      }
    }
  }

  return {
    config,
    warnings
  };
}

function writeExtensionConfig(config) {
  fs.mkdirSync(EXTENSION_DIR, { recursive: true });
  fs.writeFileSync(EXTENSION_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function ensureExtensionConfigFile() {
  if (!fs.existsSync(EXTENSION_CONFIG_PATH)) {
    writeExtensionConfig(DEFAULT_EXTENSION_CONFIG);
    return {
      created: true,
      config: DEFAULT_EXTENSION_CONFIG
    };
  }

  const rawConfig = readJsonFile(EXTENSION_CONFIG_PATH);
  const { config } = normalizeExtensionConfig(rawConfig || {});

  return {
    created: false,
    config
  };
}

export function getQaLogVsCodeExtensionConfig() {
  const rawConfig = readJsonFile(EXTENSION_CONFIG_PATH);
  const { config, warnings } = normalizeExtensionConfig(rawConfig || {});

  return {
    sentToClaude: false,
    config,
    defaults: DEFAULT_EXTENSION_CONFIG,
    configFileExists: fs.existsSync(EXTENSION_CONFIG_PATH),
    warnings
  };
}

export function saveQaLogVsCodeExtensionConfig(input = {}) {
  const errors = [];
  const warnings = [];
  const inputKeys = Object.keys(input || {});

  for (const field of inputKeys) {
    if (BLOCKED_CONFIG_FIELDS.includes(field)) {
      errors.push(`Field ${field} is not allowed.`);
    } else if (!EDITABLE_CONFIG_FIELDS.includes(field)) {
      errors.push(`Unknown field ${field}.`);
    }
  }

  for (const field of EDITABLE_CONFIG_FIELDS) {
    if (!(field in input)) {
      errors.push(`Missing field ${field}.`);
    } else if (!validateConfigValue(field, input[field])) {
      errors.push(`Invalid type for ${field}.`);
    }
  }

  if (errors.length > 0) {
    return {
      status: 'EXTENSION_CONFIG_INVALID',
      sentToClaude: false,
      config: getQaLogVsCodeExtensionConfig().config,
      warnings,
      errors
    };
  }

  const config = EDITABLE_CONFIG_FIELDS.reduce((result, field) => ({
    ...result,
    [field]: input[field]
  }), {});

  writeExtensionConfig(config);

  return withRefresh({
    status: 'EXTENSION_CONFIG_SAVED',
    sentToClaude: false,
    config,
    warnings,
    errors
  }, 'extension-config-updated');
}

function listVsixFiles() {
  if (!fs.existsSync(EXTENSION_DIR)) {
    return [];
  }

  return fs.readdirSync(EXTENSION_DIR)
    .filter((fileName) => fileName.endsWith('.vsix'))
    .sort();
}

function getAvailableScripts(packageJson) {
  if (!packageJson || packageJson.__readError || typeof packageJson.scripts !== 'object' || packageJson.scripts === null) {
    return {};
  }

  return packageJson.scripts;
}

function getVsCodeCommands(packageJson) {
  const commands = packageJson?.contributes?.commands;

  if (!Array.isArray(commands)) {
    return [];
  }

  return commands.map((command) => ({
    command: command.command || '',
    title: command.title || ''
  }));
}

export function getQaLogVsCodeExtensionBuildPlan() {
  const packageJson = readExtensionPackageJson();
  const availableScripts = getAvailableScripts(packageJson);
  const recommendedScript = BUILD_SCRIPT_PRIORITY.find((scriptName) => availableScripts[scriptName]);
  const warnings = [];

  if (!recommendedScript) {
    warnings.push('No package/build script found for VS Code extension generation.');
  }

  return {
    canGenerate: Boolean(recommendedScript),
    recommendedCommand: recommendedScript ? `npm run ${recommendedScript}` : '',
    recommendedScript: recommendedScript || '',
    warnings
  };
}

export function getQaLogVsCodeExtensionInfo() {
  const extensionDirExists = fs.existsSync(EXTENSION_DIR);
  const packageJsonExists = fs.existsSync(PACKAGE_JSON_PATH);
  const packageJson = readExtensionPackageJson();
  const availableScripts = getAvailableScripts(packageJson);
  const buildPlan = getQaLogVsCodeExtensionBuildPlan();
  const warnings = [...buildPlan.warnings];

  if (packageJson?.__readError) {
    warnings.push(`Could not read extension package.json: ${packageJson.__readError}`);
  }

  return {
    sentToClaude: false,
    extensionDirExists,
    packageJsonExists,
    packageName: packageJson?.name || '',
    packageVersion: packageJson?.version || '',
    displayName: packageJson?.displayName || '',
    publisher: packageJson?.publisher || '',
    availableScripts,
    vscodeCommands: getVsCodeCommands(packageJson),
    vsixFiles: listVsixFiles(),
    downloadPath: DOWNLOAD_PATH,
    canGenerate: buildPlan.canGenerate,
    recommendedCommand: buildPlan.recommendedCommand,
    warnings
  };
}

function runNpmScript(scriptName) {
  return new Promise((resolve) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCommand, ['run', scriptName], {
      cwd: EXTENSION_DIR,
      shell: false
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      child.kill('SIGTERM');
      settled = true;
      resolve({
        exitCode: null,
        timedOut: true,
        stdout: summarizeOutput(stdout),
        stderr: summarizeOutput(stderr || 'Extension generation timed out after 120 seconds.')
      });
    }, GENERATION_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (settled) {
        return;
      }

      clearTimeout(timeout);
      settled = true;
      resolve({
        exitCode: null,
        timedOut: false,
        stdout: summarizeOutput(stdout),
        stderr: summarizeOutput(stderr || error.message)
      });
    });

    child.on('close', (exitCode) => {
      if (settled) {
        return;
      }

      clearTimeout(timeout);
      settled = true;
      resolve({
        exitCode,
        timedOut: false,
        stdout: summarizeOutput(stdout),
        stderr: summarizeOutput(stderr)
      });
    });
  });
}

export async function generateQaLogVsCodeExtension() {
  ensureExtensionConfigFile();
  const info = getQaLogVsCodeExtensionInfo();
  const vsixBefore = info.vsixFiles;

  if (!info.canGenerate) {
    return {
      status: 'EXTENSION_GENERATION_NOT_CONFIGURED',
      sentToClaude: false,
      canGenerate: false,
      command: '',
      recommendedCommand: '',
      message: 'No package/build script found for VS Code extension generation.',
      vsixFilesBefore: vsixBefore,
      vsixFilesAfter: vsixBefore,
      vsixBefore,
      vsixAfter: vsixBefore,
      newVsixCreated: false,
      stdout: '',
      stderr: ''
    };
  }

  const buildPlan = getQaLogVsCodeExtensionBuildPlan();
  const result = await runNpmScript(buildPlan.recommendedScript);
  const vsixAfter = listVsixFiles();
  const newVsixFiles = vsixAfter.filter((fileName) => !vsixBefore.includes(fileName));
  const completed = result.exitCode === 0;

  const response = {
    status: completed ? 'EXTENSION_GENERATION_COMPLETED' : 'EXTENSION_GENERATION_FAILED',
    sentToClaude: false,
    canGenerate: true,
    command: buildPlan.recommendedCommand,
    recommendedCommand: buildPlan.recommendedCommand,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    vsixFilesBefore: vsixBefore,
    vsixFilesAfter: vsixAfter,
    vsixBefore,
    vsixAfter,
    newVsixCreated: newVsixFiles.length > 0,
    newVsixFiles,
    stdout: result.stdout,
    stderr: result.stderr
  };

  return completed ? withRefresh(response, 'extension-generated') : response;
}
