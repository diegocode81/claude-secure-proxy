# Platform Refresh Policy

## Propósito

La plataforma registra un estado de refresh cuando una acción cambia configuración, agentes, navegación, artefactos de extensión o consumo visible. El objetivo es avisar al usuario qué debe refrescar sin reiniciar procesos automáticamente.

## Por qué existe

Algunas acciones actualizan archivos o estado runtime local. El navegador puede mantener información anterior hasta recargar la página. Además, cambios estructurales como crear o eliminar agentes pueden requerir reiniciar manualmente el servidor si Node mantiene imports o registry en memoria.

## Cuándo basta refrescar navegador

Normalmente basta recargar la página cuando cambian:

- Configuración Dashboard.
- Configuración LLM.
- Estado de un agente.
- Metadata o documentación de un agente.
- Configuración de extensión.
- Consumo visible en Dashboard.

## Cuándo se recomienda reiniciar servidor

Se recomienda reiniciar manualmente si después de refrescar el navegador no aparecen cambios de:

- Agentes creados o eliminados.
- Navegación generada desde registry.
- Configuración de Proxy como puerto, URL pública u orígenes.

La plataforma no reinicia el servidor automáticamente por seguridad.

## Reasons soportados

- agent-created
- agent-updated
- agent-activated
- agent-deactivated
- agent-deleted
- settings-dashboard-updated
- settings-llm-updated
- settings-proxy-updated
- extension-config-updated
- extension-generated
- usage-updated
- platform-config-updated

## Endpoints

- GET /platform/refresh-state devuelve el estado actual.
- POST /platform/refresh-state/clear marca el aviso como revisado.

## Reinicio Manual

La plataforma no expone endpoint de reinicio y no muestra botones de reinicio.

Si un cambio requiere reiniciar el servidor, el usuario debe hacerlo manualmente desde terminal.

No se debe implementar reinicio desde UI/API.

No se usan comandos shell desde la plataforma para reiniciar procesos.

No se llama LLM para gestionar refresh o mensajes de reinicio manual.

## Cobertura

El refresh cubre acciones de agentes, settings Dashboard, settings LLM, settings Proxy y extensión VS Code. Usage/Dashboard puede marcarse cuando una acción visible llama al LLM y registra consumo.

## Regla para Codex

Si una validación HTTP local falla en Codex con Operation not permitted, repetir el curl con permisos escalados antes de concluir que el servidor está caído. Validar primero GET /health.
