# Administración de agentes

## Propósito

Este documento describe las acciones administrativas disponibles para agentes QA creados desde la plataforma.

## Activar agente

Activar un agente cambia su estado a `active`, `statusLabel` a `Activo`, `execution.enabled` a `true` y `execution.mode` a `runtime-enabled`.

La activación no llama LLM. Solo cambia configuración del agente.

Un agente activo debe seguir pasando por sanitización y control de presupuesto antes de enviar data al LLM.

## Desactivar agente

Desactivar un agente cambia su estado a `disabled`, `statusLabel` a `Deshabilitado`, `execution.enabled` a `false` y `execution.mode` a `runtime-disabled`.

Desactivar evita que el agente envíe data al LLM desde el runtime.

## Eliminar agente

Eliminar un agente quita su registro de `src/agents/registry.js` y elimina su carpeta `src/agents/<agent-id>/`.

La eliminación requiere confirmación explícita desde la pantalla del agente.

No se debe eliminar un agente sin revisar el impacto en navegación, módulos y referencias documentales.

## Edición de agentes

Los agentes creados desde UI pueden editarse desde su pantalla de detalle.

La edición permite actualizar:

- Nombre visible.
- Descripción.
- Estado `draft`, `review` o `disabled`.
- Etiqueta de estado.
- Orden de navegación.
- Capacidades.
- Contrato de entrada.
- Contrato de salida.
- `skill.md`.
- `prompt.md`.
- `contract.md`.
- `README.md`.
- `readiness-checklist.md`.

La edición no permite cambiar `agentId`.

La gobernanza es interna: la plataforma la conserva y aplica desde backend/perfil/validaciones, pero no se muestra ni se edita desde pantallas de agentes.

La edición no permite modificar `execution.enabled`, `execution.mode`, endpoint runtime ni endpoints legacy.

El estado `active` no se asigna desde edición. Para activar un agente se debe usar la acción Activar agente.

QA Log Analyst está protegido y no es editable desde esta funcionalidad.

Editar un agente no llama LLM.

Después de editar se debe revisar el agente antes de activarlo.

## QA Log Analyst protegido

`qa-log-analyst` es el agente base protegido de la plataforma.

No puede activarse, desactivarse ni eliminarse desde las acciones administrativas.

QA Log Analyst conserva `mode = legacy` y su comportamiento actual.

## Runtime

`runtime-enabled` indica que el agente quedó habilitado para ejecución gobernada por el runtime común.

`runtime-disabled` indica que el agente queda visible, pero no puede ejecutar ni enviar data al LLM.

## Seguridad

Las acciones administrativas no llaman LLM.

Las acciones administrativas no deben saltarse sanitización.

Las acciones administrativas no deben saltarse control de presupuesto.

Las acciones administrativas no exponen API keys ni secretos.

## Riesgos

- Activar agentes sin revisión humana puede producir respuestas incompletas o no gobernadas.
- Eliminar agentes borra archivos y debe hacerse solo con confirmación explícita.
- Un agente activo sin implementación runtime puede responder con error controlado de runtime no configurado.

## Validaciones

Antes de considerar aprobada una administración de agente:

- QA Log Analyst debe seguir protegido.
- `npm run check` debe pasar.
- `npm test` debe pasar.
- Activar debe devolver `AGENT_ACTIVATED`.
- Desactivar debe devolver `AGENT_DEACTIVATED`.
- Eliminar debe devolver `AGENT_DELETED` solo para agentes no protegidos.
