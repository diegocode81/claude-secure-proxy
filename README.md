# claude-secure-proxy

Proxy seguro para analizar texto con Claude despues de aplicar reglas de sanitizacion. Incluye endpoints para healthcheck, sanitizacion, analisis general y analisis QA especializado de logs, errores, stacktraces, codigo y pipelines.

## Requisitos

- Node.js 18 o superior
- Archivo `.env` con `ANTHROPIC_API_KEY`

## Configuracion

Edita el archivo `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-tu-api-key
CLAUDE_MODEL=claude-3-5-sonnet-latest
MAX_TOKENS=1800
MONTHLY_BUDGET_USD=80
BUDGET_WARNING_PERCENT=85
INPUT_COST_PER_1M_TOKENS=3
OUTPUT_COST_PER_1M_TOKENS=15
PORT=3000
```

`MONTHLY_BUDGET_USD` define el presupuesto mensual. `BUDGET_WARNING_PERCENT=85` activa la alerta desde el 85% del presupuesto; con 80 USD, la alerta empieza desde 68 USD. Los costos por millon de tokens deben coincidir con el precio real del modelo configurado en `CLAUDE_MODEL`.

Variables principales:

- `ANTHROPIC_API_KEY`: API key usada para llamar a Claude.
- `CLAUDE_MODEL`: modelo de Claude usado por el proxy.
- `MAX_TOKENS`: maximo de tokens de salida permitido por respuesta.
- `MONTHLY_BUDGET_USD`: presupuesto mensual estimado en USD.
- `BUDGET_WARNING_PERCENT`: porcentaje desde el que se agrega alerta de presupuesto.
- `INPUT_COST_PER_1M_TOKENS`: costo estimado por 1 millon de tokens de entrada.
- `OUTPUT_COST_PER_1M_TOKENS`: costo estimado por 1 millon de tokens de salida.
- `PORT`: puerto local del servicio.

## Ejecutar

```bash
npm start
```

Por defecto el servicio escucha en `http://localhost:3000`. Puedes cambiarlo modificando `PORT` en `.env`.

## Start / Stop del servicio

El archivo `.env` debe existir antes de iniciar el servicio. Si no existe, los scripts de start muestran:

```text
Missing .env file. Copy .env.example to .env and configure ANTHROPIC_API_KEY.
```

Los scripts guardan el PID en `data/proxy.pid` y los logs en `data/proxy.log`. No imprimen ni guardan `ANTHROPIC_API_KEY` por cuenta propia.

### Windows

Desde la raiz del proyecto:

```bat
scripts\start.bat
scripts\status.bat
scripts\stop.bat
```

Tambien pueden ejecutarse desde la carpeta `scripts`:

```bat
start.bat
status.bat
stop.bat
```

### Mac/Linux

Desde la raiz del proyecto:

```bash
chmod +x scripts/*.sh
./scripts/start.sh
./scripts/status.sh
./scripts/stop.sh
```

Tambien pueden ejecutarse desde la carpeta `scripts`:

```bash
cd scripts
./start.sh
./status.sh
./stop.sh
```

Atajos npm disponibles para Mac/Linux:

```bash
npm run proxy:start
npm run proxy:status
npm run proxy:stop
```

En Windows usa directamente los archivos `.bat`.

## Dashboard de consumo

Abre el dashboard local en:

```text
http://localhost:3000/dashboard
```

Esta pagina permite monitorear el consumo estimado de Claude API sin entrar al panel de Anthropic. El proxy acumula metricas locales cada vez que `/analyze`, `/analyze-error` o `/analyze-error-context` hacen una llamada real a Claude.

El dashboard muestra:

- Presupuesto mensual configurado.
- Gasto estimado acumulado del mes.
- Porcentaje usado.
- Tokens de entrada y salida acumulados.
- Requests enviados a Claude.
- Requests bloqueados por seguridad.
- Requests sanitizados y permitidos.
- Semaforo visual de presupuesto.
- Monto desde el que se activa la alerta, calculado con `BUDGET_WARNING_PERCENT`.

El semaforo se interpreta asi:

- Verde: menor al 60% del presupuesto.
- Amarillo: 60% a 85% del presupuesto.
- Rojo: mayor al 85% del presupuesto.

Con la configuracion actual:

```bash
MONTHLY_BUDGET_USD=80
BUDGET_WARNING_PERCENT=85
```

La alerta se activa desde:

```text
80 * 0.85 = 68 USD
```

Es decir, cuando el gasto estimado acumulado llega a 68 USD o mas, las respuestas de `/analyze` y `/analyze-error` incluyen un warning.

El calculo de gasto es estimado:

```text
cost = (inputTokens / 1000000 * INPUT_COST_PER_1M_TOKENS) + (outputTokens / 1000000 * OUTPUT_COST_PER_1M_TOKENS)
```

El valor final depende del precio real del modelo configurado por Anthropic. Si cambias `CLAUDE_MODEL`, revisa tambien `INPUT_COST_PER_1M_TOKENS` y `OUTPUT_COST_PER_1M_TOKENS`.

Cuando el gasto llega al porcentaje configurado en `BUDGET_WARNING_PERCENT`, `/analyze` y `/analyze-error` agregan:

```json
{
  "warning": "WARNING: Monthly budget usage is above 85%."
}
```

La llamada a Claude sigue permitida mientras el consumo sea menor al 100% del presupuesto. El warning solo avisa que ya estas en zona de riesgo de gasto.

Cuando el gasto llega al 100% o mas, se bloquean nuevas llamadas a Claude:

```json
{
  "status": "BUDGET_EXCEEDED",
  "sentToClaude": false,
  "message": "Monthly Claude API budget exceeded."
}
```

Este bloqueo evita seguir acumulando consumo desde el proxy. Los requests bloqueados por presupuesto no se envian a Claude.

## Uso JSON

```bash
curl http://localhost:3000/usage
```

Respuesta:

```json
{
  "month": "YYYY-MM",
  "budgetUsd": 80,
  "estimatedCostUsd": 0,
  "usagePercent": 0,
  "inputTokens": 0,
  "outputTokens": 0,
  "totalRequests": 0,
  "blockedRequests": 0,
  "sanitizedRequests": 0,
  "allowedRequests": 0
}
```

El consumo se guarda localmente en `data/usage.json`. Ese archivo solo contiene metricas: mes, tokens, conteos y costo estimado. No guarda texto original, logs ni respuestas completas.

Ejemplo del archivo local:

```json
{
  "month": "2026-05",
  "inputTokens": 0,
  "outputTokens": 0,
  "totalRequests": 0,
  "blockedRequests": 0,
  "sanitizedRequests": 0,
  "allowedRequests": 0,
  "estimatedCostUsd": 0
}
```

Si cambia el mes, el proxy reinicia automaticamente las metricas para el mes actual.

## Resetear consumo

Para reiniciar el consumo del mes actual:

```bash
curl -X POST http://localhost:3000/usage/reset
```

## Endpoints existentes

### GET /health

```bash
curl http://localhost:3000/health
```

### POST /sanitize

```bash
curl -X POST http://localhost:3000/sanitize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Error para usuario qa@example.com desde 10.10.1.20"
  }'
```

### Casos manuales del sanitizer

Debe ser `ALLOWED`:

```text
Error: Cannot read properties of undefined (reading 'customerId')
validateCustomerData customer.service.ts:48
```

Debe ser `BLOCKED`:

```text
password=abc123
client_secret=abc123
Authorization: Bearer abc.def.ghi
```

### POST /analyze

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "API devuelve 500 al consultar /customers/123"
  }'
```

## POST /analyze-error

Especializado en analisis QA de logs y errores de frontend, backend, APIs, mobile, automatizacion y pipelines CI/CD.

Body:

```json
{
  "text": "log, stacktrace, error, codigo o fragmento de pipeline",
  "context": "frontend | backend | api | mobile | pipeline | unknown",
  "technology": "React | Angular | Node.js | .NET | Java | Karate | Appium | WebdriverIO | Azure DevOps | GitHub Actions | unknown"
}
```

Antes de llamar a Claude, el endpoint aplica `sanitizeText(text)`:

- `BLOCKED`: no llama a Claude.
- `SANITIZED`: envia `sanitizedText`.
- `ALLOWED`: envia el `text` original.

### Respuesta si pasa el filtro

```json
{
  "mode": "error-analysis",
  "status": "ALLOWED",
  "risk": "LOW",
  "findings": [],
  "sentToClaude": true,
  "context": "frontend",
  "technology": "React",
  "claudeResponse": "..."
}
```

### Respuesta si se bloquea

```json
{
  "mode": "error-analysis",
  "status": "BLOCKED",
  "risk": "HIGH",
  "findings": [],
  "sentToClaude": false,
  "message": "El contenido contiene datos sensibles críticos y no fue enviado a Claude.",
  "sanitizedText": "..."
}
```

## POST /analyze-error-context

Especializado en analisis de errores con contexto de workspace enviado por una extension de VS Code u otro cliente. El proxy no lee carpetas locales ni archivos del disco; solo analiza el `workspaceContext` recibido en el body.

Body:

```json
{
  "errorText": "log, stacktrace o error seleccionado",
  "context": "frontend | backend | api | mobile | pipeline | unknown",
  "technology": "React | Angular | Node.js | .NET | Java | Karate | Appium | WebdriverIO | Azure DevOps | GitHub Actions | unknown",
  "workspaceContext": [
    {
      "filePath": "src/components/UserList.jsx",
      "language": "javascript",
      "reason": "Contains method mentioned in error: loadUsers",
      "snippet": "async function loadUsers() { ... }"
    }
  ]
}
```

Reglas del endpoint:

- `errorText` es obligatorio.
- `workspaceContext` es opcional.
- Se aceptan maximo 10 archivos en `workspaceContext`.
- Cada `snippet` se limita a 300 lineas.
- El prompt combinado entre `errorText` y `workspaceContext` se limita a 60.000 caracteres.
- Antes de llamar a Claude, el prompt combinado pasa por `sanitizeText`.
- Si el resultado es `BLOCKED`, no se llama a Claude.
- Si el resultado es `SANITIZED`, se envia `sanitizedText`.
- Si el resultado es `ALLOWED`, se envia el prompt combinado original.
- No se guarda `errorText`, `workspaceContext`, snippets ni respuestas en `data/usage.json`.

Respuesta si pasa el filtro:

```json
{
  "mode": "error-context-analysis",
  "status": "ALLOWED",
  "risk": "LOW",
  "findings": [],
  "sentToClaude": true,
  "context": "frontend",
  "technology": "React",
  "filesReceived": 1,
  "claudeResponse": "..."
}
```

Respuesta si se bloquea:

```json
{
  "mode": "error-context-analysis",
  "status": "BLOCKED",
  "risk": "HIGH",
  "findings": [],
  "sentToClaude": false,
  "message": "El contenido contiene datos sensibles críticos y no fue enviado a Claude.",
  "sanitizedText": "..."
}
```

## Extension VS Code

El proyecto incluye una extension local en `secure-code-vscode`.

Comandos:

```text
Claude Seguro: Analizar selección
Claude Seguro: Analizar error con contexto del proyecto
```

La extension:

- Lee el texto seleccionado en el editor activo.
- Pide solo el contexto del error: `frontend`, `backend`, `api`, `mobile`, `pipeline` o `unknown`.
- Asigna automaticamente `technology: "unknown"`.
- Para `Claude Seguro: Analizar error con contexto del proyecto`, extrae nombres de archivo, simbolos, metodos, variables y clases desde patrones como `at metodo archivo.ts:48`, `at Clase.metodo archivo.ts:112`, `reading 'customerId'`, `reading "customerId"` y `archivo.ts:linea`.
- Si el error menciona archivos concretos como `customer.service.ts` o `loan.controller.ts`, primero busca esos nombres directamente con `vscode.workspace.findFiles("**/nombre-archivo")`.
- Si necesita mas contexto, busca por contenido en archivos permitidos: `js`, `jsx`, `ts`, `tsx`, `java`, `cs`, `feature`, `json`, `yml`, `yaml`, `xml` y `gradle`.
- Excluye completamente archivos y carpetas sensibles: `.env`, `.env.*`, nombres con `secret`, `credential` o `password`, `docker-compose.yml`, `docker-compose.yaml`, `*.properties`, `*.local.*`, `config`, `configs`, `secrets`, `credentials`, `node_modules`, `dist`, `build`, `coverage`, `.git`, `.next`, `target`, `bin`, `obj` y lockfiles.
- Antes de agregar un snippet al `workspaceContext`, descarta el archivo si el snippet contiene asignaciones de `password`, `secret`, `client_secret`, `credentials`, `access_token`, `refresh_token`, `Authorization: Bearer` o `BEGIN PRIVATE KEY`.
- Toma maximo 10 archivos, lee maximo 50 archivos candidatos, limita el contexto total a 60.000 caracteres y extrae snippets de hasta 120 lineas.
- Cada snippet usa hasta 40 lineas antes y 80 despues de la primera coincidencia encontrada.
- Envia el analisis a `POST http://localhost:3000/analyze-error-context`.
- Muestra la respuesta del proxy en una pestaña Markdown con cantidad de archivos enviados, lista de archivos enviados y cantidad de archivos descartados por sensibilidad.
- Si no encuentra archivos relacionados, muestra `No se encontraron archivos relacionados en el workspace.`

Body enviado por la extension:

```json
{
  "errorText": "...",
  "context": "frontend",
  "technology": "unknown",
  "workspaceContext": []
}
```

Para probarla en VS Code:

1. Abre la carpeta `secure-code-vscode` en VS Code.
2. Presiona `F5` para lanzar Extension Development Host.
3. En otra ventana/proyecto, selecciona un error.
4. Ejecuta el comando desde la paleta de comandos.

El proxy debe estar ejecutandose con `npm start` antes de usar la extension.

## Ejemplos curl

### 1. Analizar error frontend React

```bash
curl -X POST http://localhost:3000/analyze-error \
  -H "Content-Type: application/json" \
  -d '{
    "text": "TypeError: Cannot read properties of undefined (reading '\''map'\'') at CustomerList.jsx:42:18\nconst rows = response.data.items.map(item => item.name);",
    "context": "frontend",
    "technology": "React"
  }'
```

### 6. Analizar error con contexto de workspace desde VS Code

```bash
curl -X POST http://localhost:3000/analyze-error-context \
  -H "Content-Type: application/json" \
  -d '{
    "errorText": "TypeError: Cannot read properties of undefined (reading '\''map'\'') at UserList.jsx:18:31",
    "context": "frontend",
    "technology": "unknown",
    "workspaceContext": [
      {
        "filePath": "src/components/UserList.jsx",
        "language": "javascript",
        "reason": "Contains component and map usage mentioned in the stacktrace",
        "snippet": "export function UserList({ users }) {\n  return users.map(user => <li key={user.id}>{user.name}</li>);\n}"
      },
      {
        "filePath": "src/pages/UsersPage.jsx",
        "language": "javascript",
        "reason": "Passes users prop into UserList",
        "snippet": "const [users, setUsers] = useState();\nreturn <UserList users={users} />;"
      }
    ]
  }'
```

### 2. Analizar error backend .NET

```bash
curl -X POST http://localhost:3000/analyze-error \
  -H "Content-Type: application/json" \
  -d '{
    "text": "System.NullReferenceException: Object reference not set to an instance of an object. at CustomerService.GetCustomer(Guid id) in CustomerService.cs:line 87",
    "context": "backend",
    "technology": ".NET"
  }'
```

### 3. Analizar log de Karate

```bash
curl -X POST http://localhost:3000/analyze-error \
  -H "Content-Type: application/json" \
  -d '{
    "text": "classpath:features/customer.feature:23 - status code was: 500, expected: 200, response: {\"error\":\"Internal Server Error\"}",
    "context": "api",
    "technology": "Karate"
  }'
```

### 4. Analizar log de Appium/WebdriverIO

```bash
curl -X POST http://localhost:3000/analyze-error \
  -H "Content-Type: application/json" \
  -d '{
    "text": "[WebdriverIO] Error: element (//android.widget.Button[@text=\"Login\"]) still not displayed after 10000ms\n[Appium] NoSuchElementError: An element could not be located on the page using the given search parameters.",
    "context": "mobile",
    "technology": "Appium"
  }'
```

### 5. Analizar error de pipeline

```bash
curl -X POST http://localhost:3000/analyze-error \
  -H "Content-Type: application/json" \
  -d '{
    "text": "##[error]npm ERR! code ELIFECYCLE\n##[error]Command failed with exit code 1\nTask: npm test\nBranch: feature/customer-validation",
    "context": "pipeline",
    "technology": "Azure DevOps"
  }'
```
