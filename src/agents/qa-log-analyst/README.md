# QA Log Analyst

## Estado

Primer módulo/agente formal de la plataforma QA asistida por IA.

## Responsabilidad

Analizar errores, logs, stacktraces y contexto técnico para producir diagnóstico QA accionable usando Claude.

## Archivos del módulo

- `profile.js`: metadatos del agente y prompts exportados para el servidor.
- `skill.md`: capacidades, reglas y propósito del agente.
- `prompt.md`: instrucciones actuales enviadas a Claude.
- `contract.md`: contrato actual de endpoints y respuestas.
- `README.md`: guía corta del módulo.

## Integraciones actuales

- Página visual: `/qa-log-analyst`
- Descarga de extensión: `/downloads/claude-secure-vscode`
- Endpoints:
  - `POST /analyze-error`
  - `POST /analyze-error-context`
- Cliente principal: extensión VS Code local.

## Reglas de evolución

- Mantener compatibilidad con la extensión VS Code.
- No cambiar contratos actuales sin crear una versión nueva.
- Todo contenido enviado a Claude debe pasar por sanitización.
- Toda llamada a Claude debe respetar control de presupuesto.
- No aceptar prompts libres desde frontend para reemplazar el rol del agente.
