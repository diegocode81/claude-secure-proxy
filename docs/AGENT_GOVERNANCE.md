# Agent Governance

## Propósito

Este documento define las reglas obligatorias para crear, modificar, activar y gobernar agentes QA dentro de la plataforma.

La plataforma debe crecer de forma ordenada, segura y trazable. Ningún agente nuevo debe crearse si no cumple los estándares mínimos definidos aquí.

## Estado Actual

- QA Log Analyst es el único agente funcional formalizado.
- QA Log Analyst sigue en modo legacy.
- El runtime genérico existe, pero no debe ejecutar LLM para QA Log Analyst mientras `execution.enabled` sea `false`.
- La creación dinámica de agentes desde UI está fuera del alcance actual.
- Los agentes deben definirse por código versionado.

## Principios obligatorios

1. Todo agente debe tener un propósito QA claro.
2. Todo agente debe estar aislado en su propio módulo.
3. Todo agente debe tener contrato de entrada.
4. Todo agente debe tener contrato de salida.
5. Todo agente debe tener prompt oficial versionable.
6. Todo agente debe tener skill documentado.
7. Todo agente debe estar registrado en el registry central.
8. Todo agente debe pasar por sanitización antes de enviar datos a LLM.
9. Todo agente debe pasar por control de presupuesto antes de enviar datos a LLM.
10. Ningún endpoint debe llamar LLM directamente fuera del runtime común.
11. Ningún agente debe activarse sin smoke tests.
12. Ningún agente debe activarse sin plan de rollback.

## Estructura obligatoria por agente

Todo agente debe vivir en:

```txt
src/agents/<agent-id>/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
```

Cada agente formal debe estar registrado explícitamente en el registry central:

```txt
src/agents/registry.js
```

`profile.js` debe ser la fuente estructurada para:

- nombre del agente,
- estado,
- navegación,
- descripción,
- capacidades,
- endpoints relacionados,
- contrato de entrada,
- contrato de salida esperado,
- reglas de gobierno,
- modo de ejecución.

Los archivos Markdown son documentación oficial. No se deben leer dinámicamente desde el servidor para ejecutar prompts.

## Flujo Permitido Hacia LLM

Todo agente que ejecute LLM debe pasar por este flujo:

```txt
validar entrada
  -> sanitizar
  -> controlar presupuesto
  -> construir prompt controlado
  -> llamar LLM
  -> registrar uso
  -> normalizar respuesta
```

No está permitido:

- aceptar prompts libres desde frontend,
- duplicar sanitización dentro de cada agente,
- duplicar lógica de presupuesto dentro de cada agente,
- llamar LLM directamente desde una vista HTML,
- llamar LLM directamente desde un endpoint nuevo sin pasar por runtime o servicio aprobado,
- activar runtime real sin tests y smoke tests actualizados.

## Regla global de activación inicial

Todo agente nuevo debe iniciar obligatoriamente con:

```js
execution: {
  enabled: false
}
```

## Gestión Futura Desde UI

La UI puede listar agentes y módulos existentes.

La UI no puede actualmente:

- crear agentes,
- modificar prompts,
- modificar contratos,
- activar ejecución runtime,
- guardar configuración dinámica de agentes.

Antes de habilitar creación o configuración desde UI se requerirá:

- schema formal de agente,
- validación estricta de perfil,
- validación estricta de contrato de entrada,
- validación estricta de contrato de salida,
- control de permisos y roles,
- revisión humana antes de activar un agente,
- almacenamiento seguro de configuración,
- versionamiento de prompts,
- auditoría de cambios,
- pruebas automáticas por agente,
- mecanismo de rollback,
- estados `draft`, `review`, `active`, `disabled`,
- separación entre agentes definidos por código y agentes configurables desde UI,
- reglas que impidan llamadas a LLM sin sanitización,
- reglas que impidan llamadas a LLM sin control de presupuesto.

## QA Log Analyst

QA Log Analyst queda protegido como agente base.

Restricciones vigentes:

- No reemplazar `/analyze-error`.
- No reemplazar `/analyze-error-context`.
- No modificar contratos legacy.
- No romper la extensión VS Code.
- No activar `execution.enabled`.
- `POST /agents/qa-log-analyst/run` debe mantener `sentToClaude: false` mientras el runtime esté deshabilitado.

## Criterios de Gobierno Para Merge

Antes de aceptar un cambio estructural:

- `npm test` debe pasar.
- `npm run check` debe pasar.
- Debe revisarse `docs/SMOKE_TESTS.md`.
- Si el cambio afecta agentes, debe revisarse `docs/NEW_AGENT_READINESS_CHECKLIST.md`.
- Si el cambio afecta arquitectura, debe actualizarse `src/ARCHITECTURE.md` o un ADR.
