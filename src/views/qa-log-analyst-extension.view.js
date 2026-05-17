import { renderLayout } from './layout.js';

const downloadPath = '/downloads/secure-code-vscode';

export function renderQaLogAnalystExtensionView() {
  const content = `
    <header class="page-header">
      <div>
        <h1>Extensión VS Code - QA Log Analyst</h1>
        <p>Gestiona el artefacto VSIX de la extensión de Visual Studio Code usada por QA Log Analyst. Puedes descargar la extensión existente o regenerarla si el archivo fue eliminado o necesita actualizarse.</p>
      </div>
      <div class="status-pill pending">Gestión controlada</div>
    </header>

    <section class="panel">
      <h2>Acciones de extensión</h2>
      <div class="actions">
        <a class="button" href="${downloadPath}">Descargar extensión VS Code</a>
        <button type="button" id="generate-extension">Generar extensión VS Code</button>
      </div>
      <div class="field">
        <p>Esta pantalla solo descarga o regenera el artefacto VSIX de QA Log Analyst. No edita código, no crea agentes, no activa runtime y no llama Claude.</p>
      </div>
    </section>

    <section class="summary">
      <div class="panel">
        <div class="metric-label">Nombre de extensión</div>
        <div class="metric-value">Secure Code QA</div>
      </div>
      <div class="panel">
        <div class="metric-label">Carpeta</div>
        <div class="metric-value">secure-code-vscode/</div>
      </div>
      <div class="panel">
        <div class="metric-label">Estado package.json</div>
        <div class="metric-value" id="extension-package-status">Cargando</div>
      </div>
      <div class="panel">
        <div class="metric-label">Comando de generación</div>
        <div class="metric-value" id="extension-recommended-command">Cargando</div>
      </div>
      <div class="panel">
        <div class="metric-label">VSIX detectado</div>
        <div class="metric-value" id="extension-vsix-detected">Cargando</div>
      </div>
    </section>

    <section class="panel">
      <h2>Configuración de extensión</h2>
      <p>Estos valores se guardan en la configuración de la extensión y se aplican al generar un nuevo VSIX. Cambia solo lo necesario según el ambiente donde se instalará la extensión.</p>
      <p>Después de guardar configuración, usa Generar extensión VS Code para crear un VSIX con los nuevos valores.</p>
      <div class="field">
        <label for="proxyBaseUrl">URL base de plataforma</label>
        <p class="form-note">Dominio o URL donde corre la plataforma QA. La extensión usará esta URL para enviar logs y contexto al backend.</p>
        <p class="form-note">Ejemplos: <code>http://localhost:3000</code>, <code>https://qa-platform.miempresa.com</code></p>
        <input id="proxyBaseUrl" name="proxyBaseUrl" type="url">
      </div>
      <div class="field">
        <label for="defaultTechnology">Tecnología por defecto</label>
        <p class="form-note">Valor usado cuando el usuario no selecciona una tecnología específica desde VS Code. Sirve para orientar el análisis del error.</p>
        <p class="form-note">Ejemplos: <code>unknown</code>, <code>backend</code>, <code>frontend</code>, <code>api</code>, <code>mobile</code>, <code>pipeline</code></p>
        <input id="defaultTechnology" name="defaultTechnology" type="text">
      </div>
      <div class="field">
        <label for="contextOptions">Opciones de contexto</label>
        <p class="form-note">Lista de contextos que el usuario podrá elegir desde la extensión. Ayuda a clasificar de dónde viene el error.</p>
        <p class="form-note">Ejemplos: <code>frontend</code>, <code>backend</code>, <code>api</code>, <code>mobile</code>, <code>pipeline</code>, <code>unknown</code></p>
        <input id="contextOptions" name="contextOptions" type="text">
      </div>
      <div class="summary">
        <div class="field">
          <label for="maxCandidateFiles">Máximo de archivos candidatos</label>
          <p class="form-note">Cantidad máxima de archivos que la extensión revisa inicialmente al buscar contexto relacionado con el error.</p>
          <p class="form-note">Un valor alto puede hacer más lenta la búsqueda.</p>
          <input id="maxCandidateFiles" name="maxCandidateFiles" type="number" min="1">
        </div>
        <div class="field">
          <label for="maxRelevantFiles">Máximo de archivos relevantes</label>
          <p class="form-note">Cantidad máxima de archivos seleccionados como más relevantes para enviar contexto al backend.</p>
          <p class="form-note">Debe ser menor o igual al máximo de archivos candidatos.</p>
          <input id="maxRelevantFiles" name="maxRelevantFiles" type="number" min="1">
        </div>
        <div class="field">
          <label for="maxSnippetLines">Máximo de líneas por snippet</label>
          <p class="form-note">Cantidad máxima de líneas que se extraen por archivo relevante para construir el contexto enviado.</p>
          <p class="form-note">Un valor alto aumenta el tamaño del contexto.</p>
          <input id="maxSnippetLines" name="maxSnippetLines" type="number" min="1">
        </div>
        <div class="field">
          <label for="maxContextChars">Máximo de caracteres de contexto</label>
          <p class="form-note">Límite total de caracteres que la extensión puede enviar como contexto al backend.</p>
          <p class="form-note">Ayuda a controlar tamaño, costo y ruido del análisis.</p>
          <input id="maxContextChars" name="maxContextChars" type="number" min="1">
        </div>
      </div>
      <div class="field">
        <label for="maxFileBytes">Máximo de bytes por archivo</label>
        <p class="form-note">Tamaño máximo permitido por archivo al momento de leer contexto desde el workspace.</p>
        <p class="form-note">Evita procesar archivos demasiado grandes o pesados.</p>
        <input id="maxFileBytes" name="maxFileBytes" type="number" min="1">
      </div>
      <div class="field">
        <label for="searchPattern">Patrón de búsqueda</label>
        <p class="form-note">Define qué tipos de archivos puede revisar la extensión al buscar contexto técnico.</p>
        <p class="form-note">Ejemplo: <code>**/*.{js,jsx,ts,tsx,java,cs,feature,json,yml,yaml,xml,gradle}</code></p>
        <input id="searchPattern" name="searchPattern" type="text">
      </div>
      <div class="field">
        <label for="excludePattern">Patrón de exclusión</label>
        <p class="form-note">Define archivos o carpetas que la extensión debe ignorar para evitar ruido o información sensible.</p>
        <p class="form-note">Ejemplos: <code>.env</code>, <code>node_modules</code>, <code>dist</code>, <code>build</code>, <code>.git</code>, <code>secret</code>, <code>credential</code>, <code>password</code></p>
        <input id="excludePattern" name="excludePattern" type="text">
      </div>
      <div class="field panel">
        <h2>Recomendación segura</h2>
        <p>Para ambientes locales usa http://localhost:3000. Para ambientes compartidos usa el dominio HTTPS de la plataforma. No incluyas tokens, passwords, API keys ni secretos en ningún campo.</p>
      </div>
      <div class="field">
        <p>Después de guardar cambios, debes presionar Generar extensión VS Code para crear un nuevo VSIX con la configuración actualizada.</p>
      </div>
      <div class="actions">
        <button type="button" id="save-extension-config">Guardar configuración</button>
      </div>
      <div class="field">
        <p>Las reglas sensibles de seguridad no son editables desde esta pantalla.</p>
      </div>
      <div class="field">
        <pre id="extension-config-result">Sin cambios.</pre>
      </div>
    </section>

    <section class="panel" id="generation-result-panel" hidden>
      <h2>Último resultado de generación</h2>
      <pre id="extension-generation-result"></pre>
    </section>

    <section class="panel">
      <h2>Nota operativa</h2>
      <p>La generación usa únicamente comandos definidos en <code>secure-code-vscode/package.json</code>. Si no existe un comando soportado, el backend responde con error controlado y no modifica la extensión.</p>
    </section>

    <script>
      const infoUrl = '/qa-log-analyst/extension/info';
      const configUrl = '/qa-log-analyst/extension/config';
      const generateUrl = '/qa-log-analyst/extension/generate';
      const generateButton = document.getElementById('generate-extension');
      const saveConfigButton = document.getElementById('save-extension-config');
      const resultPanel = document.getElementById('generation-result-panel');
      const resultNode = document.getElementById('extension-generation-result');
      const configResultNode = document.getElementById('extension-config-result');
      const numberFields = [
        'maxCandidateFiles',
        'maxRelevantFiles',
        'maxSnippetLines',
        'maxContextChars',
        'maxFileBytes'
      ];

      function setText(id, value) {
        document.getElementById(id).textContent = value || 'No configurado';
      }

      function setValue(id, value) {
        document.getElementById(id).value = Array.isArray(value) ? value.join(', ') : value;
      }

      function getValue(id) {
        return document.getElementById(id).value;
      }

      function renderInfo(info) {
        setText('extension-package-status', info.packageJsonExists ? 'Disponible' : 'No disponible');
        setText('extension-recommended-command', info.recommendedCommand || 'No configurado');
        setText('extension-vsix-detected', Array.isArray(info.vsixFiles) && info.vsixFiles.length > 0 ? 'sí' : 'no');
      }

      function renderConfig(config) {
        setValue('proxyBaseUrl', config.proxyBaseUrl);
        setValue('defaultTechnology', config.defaultTechnology);
        setValue('contextOptions', config.contextOptions);
        setValue('maxCandidateFiles', config.maxCandidateFiles);
        setValue('maxRelevantFiles', config.maxRelevantFiles);
        setValue('maxSnippetLines', config.maxSnippetLines);
        setValue('maxContextChars', config.maxContextChars);
        setValue('maxFileBytes', config.maxFileBytes);
        setValue('searchPattern', config.searchPattern);
        setValue('excludePattern', config.excludePattern);
      }

      function readConfigForm() {
        return {
          proxyBaseUrl: getValue('proxyBaseUrl'),
          defaultTechnology: getValue('defaultTechnology'),
          contextOptions: getValue('contextOptions').split(',').map((item) => item.trim()).filter(Boolean),
          maxCandidateFiles: Number(getValue('maxCandidateFiles')),
          maxRelevantFiles: Number(getValue('maxRelevantFiles')),
          maxSnippetLines: Number(getValue('maxSnippetLines')),
          maxContextChars: Number(getValue('maxContextChars')),
          maxFileBytes: Number(getValue('maxFileBytes')),
          searchPattern: getValue('searchPattern'),
          excludePattern: getValue('excludePattern')
        };
      }

      async function loadExtensionInfo() {
        try {
          const response = await fetch(infoUrl);
          const info = await response.json();
          renderInfo(info);
        } catch (error) {
          setText('extension-package-status', 'No disponible');
          setText('extension-recommended-command', 'No configurado');
          setText('extension-vsix-detected', 'no');
        }
      }

      async function loadExtensionConfig() {
        try {
          const response = await fetch(configUrl);
          const payload = await response.json();
          renderConfig(payload.config);
        } catch (error) {
          configResultNode.textContent = 'No se pudo cargar configuración: ' + error.message;
        }
      }

      async function saveExtensionConfig() {
        saveConfigButton.disabled = true;
        configResultNode.textContent = 'Guardando...';
        try {
          const response = await fetch(configUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify(readConfigForm())
          });
          const result = await response.json();
          configResultNode.textContent = JSON.stringify(result, null, 2);
          if (response.ok && result.config) {
            renderConfig(result.config);
          }
        } catch (error) {
          configResultNode.textContent = 'Error controlado: ' + error.message;
        } finally {
          saveConfigButton.disabled = false;
        }
      }

      async function generateExtension() {
        generateButton.disabled = true;
        generateButton.textContent = 'Generando...';
        resultPanel.hidden = false;
        resultNode.textContent = 'Cargando...';

        try {
          const response = await fetch(generateUrl, { method: 'POST' });
          const result = await response.json();
          resultNode.textContent = JSON.stringify(result, null, 2);
          await loadExtensionInfo();
        } catch (error) {
          resultNode.textContent = 'Error controlado: ' + error.message;
        } finally {
          generateButton.disabled = false;
          generateButton.textContent = 'Generar extensión VS Code';
        }
      }

      generateButton.addEventListener('click', generateExtension);
      saveConfigButton.addEventListener('click', saveExtensionConfig);
      loadExtensionInfo();
      loadExtensionConfig();
    </script>
  `;

  return renderLayout({
    title: 'Claude Secure Proxy - Extensión VS Code QA Log Analyst',
    activePath: '/qa-log-analyst',
    content
  });
}
