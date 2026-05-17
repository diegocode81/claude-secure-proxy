# Smoke Tests Obligatorios

Este documento define la matriz minima de validacion que debe ejecutarse antes y despues de cada refactor estructural de `claude-secure-proxy`.

El objetivo es proteger:

- Compatibilidad de QA Log Analyst.
- Endpoints legacy usados por la extension VS Code.
- Dashboard operativo.
- Sanitizacion y control de presupuesto.
- Runtime experimental de agentes sin activar ejecucion real.

## Reglas Generales

- No crear nuevos agentes si esta matriz no esta en verde.
- No cambiar contratos de request/response sin actualizar esta matriz.
- No ejecutar pruebas que llamen Claude real salvo que la tarea lo pida explicitamente.
- Para pruebas con servidor, usar un puerto temporal cuando sea posible, por ejemplo `PORT=3201`.
- El inicio del sistema debe seguir siendo `/dashboard`.
- El runtime generico de `qa-log-analyst` debe mantener `sentToClaude: false` mientras `execution.enabled` sea `false`.

## Comandos Base

| ID | Comando | Resultado esperado | Obligatorio |
|---|---|---|---|
| AUTO-001 | `npm test` | Todos los tests pasan. | Si |
| AUTO-002 | `npm run check` | No hay errores de sintaxis. | Si |
| AUTO-003 | `PORT=3201 node server.js` | Servidor levanta y muestra `/dashboard` en el log. | Si hay cambios en rutas/servidor |

## Gobernanza Documental

| ID | Validación | Resultado esperado | Obligatorio |
|---|---|---|---|
| GOV-001 | Existe `docs/AGENT_GOVERNANCE.md`. | Documento presente y actualizado si cambia gobierno de agentes. | Si |
| GOV-002 | Existe `docs/NEW_AGENT_READINESS_CHECKLIST.md`. | Checklist presente antes de crear nuevos agentes. | Si |
| GOV-003 | Existe `src/agents/shared/AGENT_STANDARD.md`. | Estándar presente para todo agente futuro. | Si |
| GOV-004 | Existe `docs/adr/0001-modular-qa-agent-platform.md`. | ADR base presente. | Si |
| GOV-005 | `/modules` no muestra formularios ni botones para crear agentes. | La página sigue siendo catálogo de gobierno visual. | Si |

## Rutas Visuales e Informativas

Ejecutar con el servidor levantado.

| ID | Metodo | Ruta | Resultado esperado | Protege |
|---|---|---|---|---|
| VIEW-001 | `GET` | `/` | `302` con `Location: /dashboard`. | Inicio del sistema |
| VIEW-002 | `GET` | `/dashboard` | `200`, HTML del dashboard. | Centro operativo |
| VIEW-003 | `GET` | `/modules` | `200`, catalogo de modulos. | Gobierno visual |
| VIEW-004 | `GET` | `/qa-log-analyst` | `200`, pagina informativa del modulo. | QA Log Analyst |
| VIEW-005 | `GET` | `/agent-builder` | `200`, placeholder visual Crear agentes. | Compatibilidad visual |
| VIEW-006 | `GET` | `/health` | `200`, JSON `{ "status": "ok" }`. | Healthcheck |

Comandos sugeridos:

```bash
curl -I http://127.0.0.1:3201/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3201/dashboard
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3201/modules
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3201/qa-log-analyst
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3201/agent-builder
curl -s http://127.0.0.1:3201/health
```

## Descarga de Extension VS Code

| ID | Metodo | Ruta | Resultado esperado | Protege |
|---|---|---|---|---|
| DL-001 | `HEAD` | `/downloads/secure-code-vscode` | `200`, `content-disposition` con `secure-code-vscode-0.1.0.vsix`. | Instalacion manual |
| DL-002 | `GET` | `/downloads/secure-code-vscode` | Descarga solo el `.vsix` conocido. | Seguridad de descarga |

Comando sugerido:

```bash
curl -I http://127.0.0.1:3201/downloads/secure-code-vscode
```

No debe existir descarga dinamica por parametro.

## Usage y Presupuesto

| ID | Metodo | Ruta | Body | Resultado esperado | Protege |
|---|---|---|---|---|---|
| USAGE-001 | `GET` | `/usage` | N/A | `200`, JSON con `month`, `budgetUsd`, `estimatedCostUsd`, `usagePercent`, contadores. | Dashboard y control operativo |
| USAGE-002 | `POST` | `/usage/reset` | N/A | `200`, JSON de uso reiniciado si no se solicita HTML. | Reset via API |
| USAGE-003 | `POST` | `/usage/reset` | Header `Accept: text/html` | `303` hacia `/dashboard`. | Reset desde dashboard |

Comandos sugeridos:

```bash
curl -s http://127.0.0.1:3201/usage
curl -s -X POST http://127.0.0.1:3201/usage/reset
curl -i -X POST -H "Accept: text/html" http://127.0.0.1:3201/usage/reset
```

Nota: `POST /usage/reset` modifica `data/usage.json`. Usarlo con cuidado si se quiere conservar medicion local.

## Sanitizacion

| ID | Metodo | Ruta | Body | Resultado esperado | Protege |
|---|---|---|---|---|---|
| SEC-001 | `POST` | `/sanitize` | `{ "text": "Error qa@example.com desde 10.10.1.20" }` | `200`, `status: "SANITIZED"` y datos redactados. | Redaccion PII/infra |
| SEC-002 | `POST` | `/sanitize` | `{ "text": "password=abc123" }` | `200`, `status: "BLOCKED"`, `sentToClaude` no aplica. | Bloqueo de secretos |
| SEC-003 | `GET` | `/sanitize` | N/A | `405`. | Contrato HTTP |

Comandos sugeridos:

```bash
curl -s -X POST http://127.0.0.1:3201/sanitize \
  -H "content-type: application/json" \
  -d '{"text":"Error qa@example.com desde 10.10.1.20"}'

curl -s -X POST http://127.0.0.1:3201/sanitize \
  -H "content-type: application/json" \
  -d '{"text":"password=abc123"}'
```

## QA Log Analyst Legacy

Estos endpoints son criticos porque la extension VS Code depende de ellos.

| ID | Metodo | Ruta | Body | Resultado esperado | Protege |
|---|---|---|---|---|---|
| LOG-001 | `GET` | `/analyze-error` | N/A | `405`. | Contrato HTTP |
| LOG-002 | `POST` | `/analyze-error` | `{ "text": "" }` | `400`, error de validacion. | Validacion legacy |
| LOG-003 | `POST` | `/analyze-error` | Texto con secreto critico | `200`, `status: "BLOCKED"`, `sentToClaude: false`. | Seguridad antes de Claude |
| LOG-004 | `POST` | `/analyze-error-context` | `{ "errorText": "" }` | `400`, error de validacion. | Validacion context |
| LOG-005 | `POST` | `/analyze-error-context` | `workspaceContext` que no sea array | `400`. | Contrato extension |
| LOG-006 | `POST` | `/analyze-error-context` | Texto con secreto critico | `200`, `status: "BLOCKED"`, `sentToClaude: false`. | Seguridad con contexto |

Comandos sin llamada real a Claude:

```bash
curl -i http://127.0.0.1:3201/analyze-error

curl -s -X POST http://127.0.0.1:3201/analyze-error \
  -H "content-type: application/json" \
  -d '{"text":""}'

curl -s -X POST http://127.0.0.1:3201/analyze-error \
  -H "content-type: application/json" \
  -d '{"text":"password=abc123","context":"backend","technology":"Node.js"}'

curl -s -X POST http://127.0.0.1:3201/analyze-error-context \
  -H "content-type: application/json" \
  -d '{"errorText":"","workspaceContext":[]}'

curl -s -X POST http://127.0.0.1:3201/analyze-error-context \
  -H "content-type: application/json" \
  -d '{"errorText":"TypeError","workspaceContext":"invalid"}'
```

No usar datos validos no sensibles para estos endpoints en smoke tests automaticos locales, porque podrian llamar Claude si hay API key y presupuesto disponible.

## Runtime Experimental de Agentes

Mientras `qa-log-analyst.execution.enabled` sea `false`, el runtime generico no debe llamar Claude.

| ID | Metodo | Ruta | Body | Resultado esperado | Protege |
|---|---|---|---|---|---|
| AGENT-001 | `POST` | `/agents/qa-log-analyst/run` | `{ "input": { "errorText": "x" } }` | `200`, `status: "AGENT_EXECUTION_DISABLED"`, `sentToClaude: false`, `inputWarnings: []`. | Runtime seguro |
| AGENT-002 | `POST` | `/agents/qa-log-analyst/run` | `{ "input": { "logText": "x" } }` | `200`, `status: "AGENT_EXECUTION_DISABLED"`, `sentToClaude: false`, `inputWarnings: []`. | Campos alternativos |
| AGENT-003 | `POST` | `/agents/qa-log-analyst/run` | `{ "input": { "foo": "bar" } }` | `400`, `status: "AGENT_INPUT_INVALID"`, `sentToClaude: false`. | Bloqueo de campos desconocidos |
| AGENT-004 | `POST` | `/agents/qa-log-analyst/run` | `{ "input": { "errorText": "x", "foo": "bar" } }` | `400`, `status: "AGENT_INPUT_INVALID"`, `sentToClaude: false`. | Contrato por agente |
| AGENT-005 | `GET` | `/agents/qa-log-analyst/run` | N/A | `405`. | Metodo correcto |
| AGENT-006 | `POST` | `/agents/unknown/run` | `{ "input": {} }` | `404`, `status: "AGENT_NOT_FOUND"`, `sentToClaude: false`. | Registro central |

Comandos sugeridos:

```bash
curl -s -X POST http://127.0.0.1:3201/agents/qa-log-analyst/run \
  -H "content-type: application/json" \
  -d '{"input":{"errorText":"x"}}'

curl -s -X POST http://127.0.0.1:3201/agents/qa-log-analyst/run \
  -H "content-type: application/json" \
  -d '{"input":{"logText":"x"}}'

curl -s -X POST http://127.0.0.1:3201/agents/qa-log-analyst/run \
  -H "content-type: application/json" \
  -d '{"input":{"foo":"bar"}}'
```

## Compatibilidad de Extension VS Code

| ID | Validacion | Resultado esperado |
|---|---|---|
| EXT-001 | El archivo `.vsix` existe en `secure-code-vscode/`. | Existe el archivo esperado. |
| EXT-002 | La pagina `/qa-log-analyst` muestra descarga de extension. | Boton o enlace visible. |
| EXT-003 | `/downloads/secure-code-vscode` no acepta parametro de archivo. | Solo sirve el `.vsix` conocido. |
| EXT-004 | `/analyze-error` mantiene request legacy con `text`, `context`, `technology`. | No cambia contrato. |
| EXT-005 | `/analyze-error-context` mantiene request legacy con `errorText`, `context`, `technology`, `workspaceContext`. | No cambia contrato. |

## Criterios de Cierre

Un refactor se considera apto para continuar solo si:

- `npm test` pasa.
- `npm run check` pasa.
- La documentación de gobernanza sigue consistente: `docs/AGENT_GOVERNANCE.md`, `docs/NEW_AGENT_READINESS_CHECKLIST.md` y `src/agents/shared/AGENT_STANDARD.md`.
- Las rutas visuales principales responden.
- `/` redirige a `/dashboard`.
- Los endpoints legacy de QA Log no cambiaron contrato.
- Los casos con secretos siguen bloqueados antes de Claude.
- El runtime generico mantiene `sentToClaude: false` cuando esta deshabilitado.
- No se agregaron dependencias sin justificacion explicita.
- No se crearon agentes nuevos sin completar el checklist de preparación.

## Registro Manual

Usar esta tabla en cada refactor importante.

| Fecha | Cambio validado | Responsable | Resultado | Notas |
|---|---|---|---|---|
| YYYY-MM-DD |  |  | Pendiente |  |
