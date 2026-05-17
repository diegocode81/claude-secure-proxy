# QA Log Analyst VS Code Extension

## Propósito

Este documento describe la extensión VS Code asociada al agente QA Log Analyst.

La extensión permite integrar el flujo de análisis de logs, errores y stacktraces desde Visual Studio Code hacia la plataforma QA.

Nombre de extensión:

Secure Code QA

## Naming neutral de LLM

La extensión usa un nombre neutral porque la plataforma podrá soportar distintos proveedores LLM en el futuro. Aunque actualmente la plataforma puede usar Claude como motor LLM, la extensión no debe depender en su nombre de un proveedor específico.

## Estado actual

La extensión existe como artefacto del proyecto.

La extensión puede descargarse desde la plataforma.

La extensión usa los endpoints legacy actuales de QA Log Analyst.

La extensión no debe modificarse automáticamente desde el frontend en esta fase.

La extensión no debe generar nuevas versiones VSIX desde el frontend en esta fase.

## Agente asociado

Agente asociado:

QA Log Analyst

Estado del agente:

Modo legacy

execution.enabled = false en runtime genérico

sentToClaude = false desde /agents/qa-log-analyst/run

endpoints funcionales legacy:

/analyze-error

/analyze-error-context

## Gestión desde frontend

La gestión desde frontend queda preparada solo como visión futura.

Actualmente está permitido:

Ver información de la extensión.

Descargar el VSIX existente.

Documentar capacidades actuales.

Documentar capacidades futuras.

Actualmente NO está permitido:

Editar archivos de la extensión.

Generar una nueva extensión.

Crear VSIX desde UI.

Cambiar comandos de VS Code desde UI.

Cambiar endpoints desde UI.

Llamar Claude desde la pantalla de gestión.

Activar runtime desde la pantalla de gestión.

## Generación controlada desde plataforma

La generación se realiza desde /qa-log-analyst/extension.

Usa scripts definidos en secure-code-vscode/package.json.

No llama Claude.

No edita agentes.

No modifica registry.

No publica extensiones.

No borra VSIX existentes.

Debe ser revisada antes de commit.

Si no existe script package, vsix, build, compile o vscode:prepublish, la UI debe mostrar No configurado.

## Comando de generación VSIX

La extensión VS Code de QA Log Analyst se genera desde la carpeta secure-code-vscode/ usando el script definido en secure-code-vscode/package.json.

Comando esperado:

npm run package

Este comando ejecuta:

npx @vscode/vsce package

La plataforma usa el endpoint POST /qa-log-analyst/extension/generate para invocar este script de forma controlada desde el backend.

La generación no llama Claude, no modifica agentes, no activa runtime y no publica la extensión.

## Configuración editable de extensión

La pantalla /qa-log-analyst/extension permite editar una configuración segura antes de generar el VSIX.

La configuración se guarda en:

secure-code-vscode/extension.config.json

Campos editables:

proxyBaseUrl

defaultTechnology

contextOptions

maxCandidateFiles

maxRelevantFiles

maxSnippetLines

maxContextChars

maxFileBytes

searchPattern

excludePattern

Las reglas sensibles SENSITIVE_PATH_REGEX y SENSITIVE_SNIPPET_REGEX no son editables desde la UI. Permanecen definidas internamente en extension.js.

ANALYZE_ERROR_CONTEXT_URL se deriva automáticamente desde proxyBaseUrl usando /analyze-error-context.

La configuración se administra con:

GET /qa-log-analyst/extension/config

POST /qa-log-analyst/extension/config

Estos endpoints no llaman Claude, no modifican agentes, no modifican registry y no activan runtime.

## Guía de variables configurables

| Variable | Uso | Cuándo cambiarla |
|---|---|---|
| proxyBaseUrl | URL base de la plataforma QA usada por la extensión. | cuando la plataforma deje de correr en localhost y pase a un dominio o ambiente compartido. |
| defaultTechnology | tecnología usada por defecto cuando no se selecciona otra. | cuando la extensión se use principalmente para backend, frontend, api, mobile o pipeline. |
| contextOptions | opciones disponibles para clasificar el contexto del error. | cuando se quieran agregar o quitar categorías visibles para el usuario. |
| maxCandidateFiles | límite inicial de archivos revisados. | si la búsqueda es lenta o si el workspace es muy grande. |
| maxRelevantFiles | límite de archivos relevantes enviados como contexto. | si se envía demasiado o muy poco contexto. |
| maxSnippetLines | límite de líneas extraídas por archivo. | si los snippets son demasiado largos o insuficientes. |
| maxContextChars | límite total de caracteres enviados al backend. | para controlar tamaño, costo y ruido. |
| maxFileBytes | tamaño máximo de archivo que puede procesarse. | si se necesita incluir o excluir archivos grandes. |
| searchPattern | tipos de archivos incluidos en la búsqueda. | si el stack usa otras extensiones de archivo. |
| excludePattern | rutas y archivos ignorados. | si se necesita excluir más carpetas generadas o sensibles. |

## Capacidades futuras

En una fase futura, la plataforma podrá evaluar:

Configuración visual del endpoint del proxy.

Configuración visual del agente asociado.

Configuración visual de comandos.

Validación de configuración antes de empaquetar.

Versionamiento de configuración.

Auditoría de cambios.

Revisión humana.

Generación controlada de VSIX.

Rollback de versión.

## Reglas de seguridad

Cualquier gestión futura de extensión debe cumplir:

No guardar secretos.

No exponer tokens.

No permitir endpoints arbitrarios sin validación.

No generar VSIX sin revisión.

No modificar archivos locales sin confirmación.

No saltarse sanitización.

No saltarse control de presupuesto.

No llamar Claude desde pantallas administrativas.

## Criterio de readiness futuro

Antes de permitir creación o edición real de extensión desde frontend se requiere:

Schema formal de configuración de extensión.

Contrato de entrada.

Contrato de salida.

Validación estricta.

Revisión humana.

Auditoría.

Versionamiento.

Rollback.

Smoke tests.

Tests automatizados.
