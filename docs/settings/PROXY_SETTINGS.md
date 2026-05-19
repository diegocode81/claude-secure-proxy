# Proxy Settings

## Propósito

El proxy de plataforma centraliza las solicitudes hacia el LLM y aplica controles antes de permitir cualquier ejecución de IA.

## Qué configura la pestaña Proxy

La pestaña Proxy de `/settings` permite configurar parámetros seguros de operación:

- URL pública del proxy.
- Puerto del servidor.
- Orígenes permitidos.
- Tamaño máximo de request.
- Máximo de caracteres de contexto.

## Campos editables

- `publicBaseUrl`
- `port`
- `allowedOrigins`
- `maxRequestBodyKb`
- `maxContextChars`

Estos valores son configuración local/runtime y pueden requerir reinicio o redeploy para tener efecto fuera de la pantalla.

## Campos solo lectura

- `sanitizeEnabled`
- `secretBlockingEnabled`
- `budgetGuardEnabled`
- `protectedEndpoints`
- `blockedFindingTypes`

## Protecciones no desactivables

La sanitización no se puede desactivar desde UI porque evita que contenido sensible llegue al LLM.

El bloqueo de secretos no se puede desactivar desde UI porque protege passwords, tokens, API keys, credenciales y claves privadas.

El control de presupuesto no se puede desactivar desde UI porque evita ejecuciones sin gobierno de uso, tokens y costo.

## Almacenamiento

`data/platform-settings.json` contiene configuración local/runtime.

`data/` no debe entrar al commit.

## Seguridad

La pantalla de configuración de proxy no llama LLM.

No expone secretos.

No permite editar regex sensibles ni lógica crítica de filtrado.

## Validaciones HTTP desde Codex

Las validaciones del proxy pueden requerir llamadas HTTP locales a http://localhost:3000.

En el sandbox de Codex, curl puede fallar con Operation not permitted aunque el servidor esté activo. En ese caso, se debe repetir el curl con permisos escalados antes de reportar que el servidor está caído.

Validación recomendada:

Confirmar que existe un proceso escuchando en el puerto esperado.
Ejecutar GET /health.
Si curl falla por permisos del sandbox, repetir con permisos escalados.
Ejecutar las pruebas HTTP restantes solo después de confirmar /health.
