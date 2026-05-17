# secure-code-vscode

Extension local de VS Code para enviar selecciones a QA IA Platform y analizar errores con snippets relevantes del workspace.

## Requisito

El proxy local debe estar activo antes de ejecutar los comandos:

```bash
npm start
```

La extension llama a:

- `POST http://localhost:3000/analyze-error-context`

Si el proxy no esta activo, VS Code muestra:

```text
No se pudo conectar a QA IA Platform. Verifica que http://localhost:3000 esté activo.
```

## Analizar seleccion

Usa el comando:

```text
Secure Code QA: Analizar selección
```

Tambien aparece en el menu contextual del editor cuando hay texto seleccionado.

Flujo:

1. Selecciona texto en el editor.
2. Ejecuta `Secure Code QA: Analizar selección`.
3. Selecciona el contexto:
   - `frontend`
   - `backend`
   - `api`
   - `mobile`
   - `pipeline`
   - `unknown`
4. La extension envia el texto seleccionado a QA IA Platform con `technology: "unknown"` y `workspaceContext: []`.
5. El proxy aplica el filtro de seguridad.
6. VS Code abre una pestaña Markdown con el estado del filtro y la respuesta de Claude.

## Analizar error con contexto del proyecto

Usa el comando:

```text
Secure Code QA: Analizar error con contexto del proyecto
```

Tambien aparece en el menu contextual del editor cuando hay texto seleccionado.

Flujo:

1. Selecciona un log, error o stacktrace en el editor.
2. Ejecuta `Secure Code QA: Analizar error con contexto del proyecto`.
3. Selecciona el contexto:
   - `frontend`
   - `backend`
   - `api`
   - `mobile`
   - `pipeline`
   - `unknown`
4. La extension asigna automaticamente `technology: "unknown"`.
5. La extension extrae nombres de archivo, metodos, clases y variables del error.
6. Primero busca archivos mencionados por nombre exacto y luego busca coincidencias por contenido en el workspace abierto.
7. Envia al proxy el error seleccionado, el contexto declarado, `technology: "unknown"` y snippets relevantes.
8. VS Code abre una pestaña Markdown con el resultado.

Si no hay seleccion, muestra:

```text
Selecciona un log, error o stacktrace primero.
```

## Ejemplo de log

```text
TypeError: Cannot read properties of undefined (reading 'customerId')
    at validateCustomerData (src/services/customer.service.ts:42:13)
    at getCustomerInfo (src/components/UserList.jsx:88:9)
```

Con ese texto, la extension puede extraer palabras como:

- `customer.service.ts`
- `UserList.jsx`
- `validateCustomerData`
- `getCustomerInfo`
- `customerId`

Luego busca esas palabras en archivos del workspace y toma fragments cercanos a la primera coincidencia.

## Contexto enviado

La extension no manda todo el proyecto.

Solo envia:

- El texto seleccionado.
- El contexto elegido en el QuickPick.
- `technology: "unknown"`.
- Maximo 10 archivos relacionados.
- Maximo 50 archivos leidos.
- Maximo 120 lineas por snippet.
- Aproximadamente 60.000 caracteres totales de contexto del workspace.
- Cantidad de archivos descartados por sensibilidad.

Si no encuentra archivos relacionados, envia `workspaceContext: []` y el Markdown incluye:

```text
No se encontraron archivos relacionados en el workspace.
```

## Archivos incluidos y excluidos

Busca candidatos con:

```text
**/*.{js,jsx,ts,tsx,java,cs,feature,json,yml,yaml,xml,gradle}
```

Excluye:

```text
**/.env
**/.env.*
**/*secret*
**/*credential*
**/*password*
**/docker-compose.yml
**/docker-compose.yaml
**/*.properties
**/*.local.*
**/config/**
**/configs/**
**/secrets/**
**/credentials/**
**/node_modules/**
**/dist/**
**/build/**
**/coverage/**
**/.git/**
**/.next/**
**/target/**
**/bin/**
**/obj/**
**/package-lock.json
**/pnpm-lock.yaml
**/yarn.lock
```

Lee maximo 50 archivos candidatos y descarta archivos grandes o binarios.

## Limites de seguridad

- No guarda archivos, snippets ni logs en disco.
- No imprime contenido sensible en consola.
- No envia el proyecto completo.
- Antes de enviar un snippet, descarta el archivo si contiene `password=`, `password:`, `secret=`, `secret:`, `client_secret=`, `credentials=`, `access_token=`, `refresh_token=`, `Authorization: Bearer` o `BEGIN PRIVATE KEY`.
- El proxy puede bloquear el envio si detecta contenido sensible critico.
- Si el proxy responde `BLOCKED`, VS Code muestra un error y abre Markdown con hallazgos y texto sanitizado.
- Si el proxy responde `BUDGET_EXCEEDED`, VS Code muestra un error y abre Markdown con la respuesta JSON.
- Si el proxy responde `ALLOWED` o `SANITIZED`, VS Code abre el analisis con estado del filtro, contexto enviado y respuesta de Claude.

## Desarrollo

Validar sintaxis:

```bash
cd secure-code-vscode
npm run check
```

Probar en VS Code:

```bash
code .
```

Luego presiona `F5` para abrir el Extension Development Host.

Empaquetar como `.vsix`:

```bash
npm install -g @vscode/vsce
vsce package
```
Actualizar extención
```bash
vsce package --allow-missing-repository
```
y reinstalar en visual la extención
