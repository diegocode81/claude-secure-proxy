export const MAX_AGENT_UPLOAD_BYTES = 2 * 1024 * 1024;

export const ALLOWED_AGENT_UPLOAD_EXTENSIONS = [
  '.txt',
  '.json',
  '.csv',
  '.html',
  '.htm',
  '.md',
  '.pdf'
];

export const BLOCKED_AGENT_UPLOAD_EXTENSIONS = [
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
  '.js',
  '.ts',
  '.mjs',
  '.cjs',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.env',
  '.pem',
  '.key'
];

const INPUT_TYPE_EXTENSIONS = {
  text: ['.txt'],
  json: ['.json'],
  csv: ['.csv'],
  html: ['.html', '.htm'],
  markdown: ['.md'],
  pdf: ['.pdf']
};

export function getFileExtension(fileName) {
  if (typeof fileName !== 'string' || !fileName.trim()) {
    return '';
  }

  const normalized = fileName.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf('.');
  return lastDot >= 0 ? normalized.slice(lastDot) : '';
}

function allowedExtensionsForTypes(acceptedInputTypes = []) {
  const types = Array.isArray(acceptedInputTypes) ? acceptedInputTypes : [];
  const extensions = types.flatMap((type) => INPUT_TYPE_EXTENSIONS[type] || []);
  return extensions.length > 0 ? extensions : INPUT_TYPE_EXTENSIONS.text;
}

export function validateAgentUploadFile({ fileName, sizeBytes, acceptedInputTypes } = {}) {
  if (typeof fileName !== 'string' || !fileName.trim()) {
    return {
      valid: false,
      error: 'El nombre del archivo es requerido.'
    };
  }

  if (!Number.isFinite(Number(sizeBytes))) {
    return {
      valid: false,
      error: 'El tamaño del archivo es requerido.'
    };
  }

  if (Number(sizeBytes) > MAX_AGENT_UPLOAD_BYTES) {
    return {
      valid: false,
      error: 'El archivo supera el tamaño máximo permitido de 2 MB.'
    };
  }

  const extension = getFileExtension(fileName);

  if (BLOCKED_AGENT_UPLOAD_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: 'Este tipo de archivo está bloqueado por seguridad.'
    };
  }

  const allowedForAgent = allowedExtensionsForTypes(acceptedInputTypes);

  if (!ALLOWED_AGENT_UPLOAD_EXTENSIONS.includes(extension) || !allowedForAgent.includes(extension)) {
    return {
      valid: false,
      error: 'La extensión del archivo no está permitida para este agente.'
    };
  }

  return {
    valid: true,
    extension
  };
}
