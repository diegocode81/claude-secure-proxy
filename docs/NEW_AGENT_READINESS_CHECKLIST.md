# Checklist Antes de Crear un Nuevo Agente QA

Este checklist es obligatorio antes de crear, registrar o activar cualquier nuevo agente QA.

## Regla Principal

No se deben crear nuevos agentes hasta que QA Log Analyst siga estable y la plataforma base esté en verde.

## 1. Estabilidad de Plataforma

| Check | Requerido | Estado |
|---|---|---|
| `npm test` pasa. | Sí | Pendiente |
| `npm run check` pasa. | Sí | Pendiente |
| `docs/SMOKE_TESTS.md` fue ejecutado en la parte aplicable. | Sí | Pendiente |
| `/dashboard` responde. | Sí | Pendiente |
| `/modules` responde. | Sí | Pendiente |
| `/qa-log-analyst` responde. | Sí | Pendiente |
| `/` redirige a `/dashboard`. | Sí | Pendiente |

## 2. QA Log Analyst Protegido

| Check | Requerido | Estado |
|---|---|---|
| `/analyze-error` mantiene contrato legacy. | Sí | Pendiente |
| `/analyze-error-context` mantiene contrato legacy. | Sí | Pendiente |
| La extensión VS Code sigue compatible. | Sí | Pendiente |
| `POST /agents/qa-log-analyst/run` responde `sentToClaude: false`. | Sí | Pendiente |
| `qa-log-analyst.execution.enabled` sigue en `false`. | Sí | Pendiente |

## 3. Definición del Nuevo Agente

No crear archivos hasta que esta sección tenga una decisión técnica aprobada.

| Check | Requerido | Estado |
|---|---|---|
| Propósito del agente definido. | Sí | Pendiente |
| Casos de uso definidos. | Sí | Pendiente |
| Entradas esperadas definidas. | Sí | Pendiente |
| Salida esperada definida. | Sí | Pendiente |
| Riesgos de seguridad identificados. | Sí | Pendiente |
| Criterios de aceptación definidos. | Sí | Pendiente |
| Decisión de modo inicial: visual, legacy o runtime. | Sí | Pendiente |

## 4. Estructura Obligatoria

Todo nuevo agente formal debe tener:

```txt
src/agents/<agent-id>/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
```

| Check | Requerido | Estado |
|---|---|---|
| `agent-id` en kebab-case. | Sí | Pendiente |
| `profile.js` completo. | Sí | Pendiente |
| `skill.md` documenta capacidades y límites. | Sí | Pendiente |
| `prompt.md` documenta prompt oficial. | Sí | Pendiente |
| `contract.md` documenta entrada, salida, estados y errores. | Sí | Pendiente |
| `README.md` explica uso, integración y restricciones. | Sí | Pendiente |
| Registro en `src/agents/registry.js`. | Sí | Pendiente |

## 5. Gobierno de Runtime

| Check | Requerido | Estado |
|---|---|---|
| Entrada validada con schema o contrato declarado. | Sí | Pendiente |
| Campos desconocidos definidos como permitidos o bloqueados. | Sí | Pendiente |
| Prompt controlado por código. | Sí | Pendiente |
| No se leen Markdown dinámicamente para ejecutar prompts. | Sí | Pendiente |
| Sanitización obligatoria antes de LLM. | Sí | Pendiente |
| Control de presupuesto obligatorio antes de LLM. | Sí | Pendiente |
| Respuesta normalizada con contrato estándar. | Sí | Pendiente |
| Tests unitarios mínimos agregados. | Sí | Pendiente |
| Smoke tests actualizados. | Sí | Pendiente |

## 6. Gestión Desde UI

La creación desde UI está fuera del alcance actual.

| Check | Requerido | Estado |
|---|---|---|
| No se agregaron formularios de creación de agentes. | Sí | Pendiente |
| No se agregaron botones de creación de agentes. | Sí | Pendiente |
| No se agregaron endpoints para crear agentes. | Sí | Pendiente |
| No se agregó base de datos para agentes dinámicos. | Sí | Pendiente |
| `/modules` sigue siendo catálogo, no consola de creación. | Sí | Pendiente |

## 7. Aprobación

Un nuevo agente solo puede avanzar cuando:

- todos los checks requeridos estén resueltos,
- exista revisión humana,
- exista cobertura mínima,
- no se rompa QA Log Analyst,
- no se omita sanitización,
- no se omita control de presupuesto.
