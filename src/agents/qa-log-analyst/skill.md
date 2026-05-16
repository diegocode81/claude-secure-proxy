# QA Log Analyst Skill

## Estado

Activo. La implementación funcional actual se consume desde la extensión VS Code y los endpoints existentes del proxy.

## Propósito

Analizar errores, logs, stacktraces y contexto técnico para generar hallazgos QA accionables usando Claude como motor de razonamiento.

## Capacidades esperadas

- Identificar causa raíz probable.
- Extraer evidencia desde logs, stacktraces y snippets de código enviados por el cliente.
- Clasificar severidad.
- Estimar impacto QA y riesgo de regresión.
- Proponer validaciones QA.
- Sugerir próximos pasos técnicos.
- Evitar exponer secretos o datos sensibles.

## Contrato de entrada actual

Endpoints relacionados:

- `POST /analyze-error`
- `POST /analyze-error-context`

Campos principales usados actualmente:

- `text` para análisis simple de error.
- `errorText` para análisis con contexto.
- `context` para indicar área funcional o técnica.
- `technology` para indicar tecnología declarada.
- `workspaceContext` para snippets de archivos relevantes.

## Contrato de salida esperado

La respuesta del agente debe mantener una estructura clara con:

- Resumen.
- Causa probable.
- Evidencia.
- Severidad.
- Impacto.
- Validaciones QA recomendadas.
- Próxima acción recomendada.

## Reglas de seguridad

- Ningún contenido debe enviarse a Claude sin sanitización previa.
- Las llamadas reales deben pasar por control de presupuesto.
- No registrar secretos, logs completos, snippets sensibles ni respuestas completas salvo decisión explícita.
- No aceptar prompts libres desde frontend para reemplazar el rol del agente.
- Si se detectan secretos críticos, la solicitud debe bloquearse y no enviarse a Claude.

## Página visual

La página `/qa-log-analyst` es informativa. No llama directamente a Claude. Sirve como documentación operativa del módulo y permite descargar la extensión VS Code empaquetada.
