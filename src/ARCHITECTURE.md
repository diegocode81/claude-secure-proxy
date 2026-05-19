# Arquitectura de `src/`

## Estado de esta fase

La plataforma ya empezó una reorganización por capas, pero todavía conserva archivos legacy en la raíz de `src/` por compatibilidad.

Regla de esta fase: no mover ni borrar archivos funcionales existentes hasta que haya una migración explícita y cobertura suficiente.

## Capas objetivo

```txt
src/
  server.js
  config/
  llm/
  security/
  usage/
  settings/
  dashboard/
  agents/
  views/
  routes/
```

## Capas ya creadas

| Carpeta | Responsabilidad | Estado |
|---|---|---|
| `config/` | Carga y acceso a configuración/env. | Puente creado. |
| `llm/` | Clientes de modelos LLM. | Puente creado. |
| `security/` | Sanitización y controles de seguridad de entrada. | Puente creado. |
| `usage/` | Métricas, consumo y presupuesto. | Puentes creados. |
| `settings/` | Servicios de configuración de plataforma. | Activo. |
| `dashboard/` | Servicio del dashboard operativo. | Puente creado. |
| `agents/` | Perfiles, runtime común y documentación de agentes QA. | Activo. |
| `views/` | Vistas HTML renderizadas por servidor. | Activo. |
| `routes/` | Rutas HTTP separadas por dominio. | Iniciado con rutas visuales e informativas de bajo riesgo. |

## Auditoría de estructura actual

| Ruta | Existe | Responsabilidad actual |
|---|---|---|
| `src/agents/` | Sí | Agentes QA formales, registro central y runtime compartido. |
| `src/config/` | Sí | Carga de configuración/env. |
| `src/dashboard/` | Sí | Servicio del dashboard operativo. |
| `src/llm/` | Sí | Cliente LLM actual. |
| `src/security/` | Sí | Sanitización y controles de seguridad. |
| `src/usage/` | Sí | Consumo, métricas y presupuesto. |
| `src/settings/` | Sí | Configuración de plataforma, dashboard y LLM. |
| `src/routes/` | Sí | Rutas HTTP extraídas de bajo riesgo. |
| `src/views/` | Sí | Vistas HTML renderizadas por servidor. |
| `docs/` | Sí | Documentación operativa y gobernanza. |
| `docs/adr/` | Sí | Decisiones arquitectónicas. |

## Archivos raíz de `src/`

| Archivo | Clasificación actual | Detalle | Destino futuro |
|---|---|---|---|
| `src/server.js` | Entrypoint/orquestador interno | Contiene el servidor HTTP y conserva endpoints legacy/críticos. Delega rutas simples a `routes/`. | Separar gradualmente hacia `routes/`, dejando `server.js` como bootstrap. |
| `src/claude.js` | Wrapper de compatibilidad | Reexporta aliases legacy hacia la capa `llm/`. | Mantener temporalmente hasta eliminar imports legacy. |
| `src/env.js` | Wrapper de compatibilidad | Reexporta el loader de `.env` desde la capa `config/`. | Mantener temporalmente hasta eliminar imports legacy. |
| `src/sanitizer.js` | Wrapper de compatibilidad | Reexporta la capa real de sanitización. | Mantener temporalmente hasta eliminar imports legacy. |
| `src/usage.js` | Wrapper de compatibilidad | Reexporta la capa real de uso y presupuesto. | Mantener temporalmente hasta eliminar imports legacy. |
| `src/dashboard.js` | Wrapper de compatibilidad | Reexporta la capa real del dashboard. | Puede eliminarse solo cuando no queden imports legacy. |

## Puentes actuales

Estos archivos existen para que el código nuevo use rutas por capa y para mantener compatibilidad con imports legacy:

| Archivo | Reexporta desde |
|---|---|
| `src/env.js` | `./config/env.js` |
| `src/claude.js` | `./llm/llm.client.js` y `./llm/claude.client.js` |
| `src/sanitizer.js` | `./security/sanitizer.js` |
| `src/usage.js` | `./usage/usage-store.js` |
| `src/usage/budget-service.js` | `./usage-store.js` |
| `src/dashboard.js` | `./dashboard/dashboard.service.js` |
| `src/dashboard/dashboard.service.js` | `../views/dashboard.view.js` |

## Limpieza de wrappers raíz

| Wrapper | Estado | Decisión | Motivo |
|---|---|---|---|
| `src/env.js` | Wrapper usado por compatibilidad y por `npm run check` | Mantenido | La lógica real ya vive en `src/config/env.js`; eliminarlo podría romper imports legacy externos o scripts actuales. |
| `src/claude.js` | Wrapper usado por compatibilidad y por `npm run check` | Mantenido | La fachada genérica vive en `src/llm/llm.client.js`; se conserva para no romper imports legacy. |
| `src/sanitizer.js` | Wrapper usado por compatibilidad y por `npm run check` | Mantenido | La lógica real ya vive en `src/security/sanitizer.js`; se conserva como bridge seguro. |
| `src/usage.js` | Wrapper usado por compatibilidad y por `npm run check` | Mantenido | La lógica real ya vive en `src/usage/usage-store.js`; se conserva para contratos internos antiguos. |
| `src/dashboard.js` | Wrapper usado por compatibilidad y por `npm run check` | Mantenido | La capa real ya vive en `src/dashboard/dashboard.service.js`; se conserva para imports legacy. |

## Reglas de importación desde ahora

- Código nuevo debe importar desde las carpetas por capa, no desde archivos legacy de raíz.
- No importar directamente desde `src/claude.js`, `src/env.js`, `src/sanitizer.js` o `src/usage.js` en código nuevo.
- `src/server.js` puede seguir siendo el orquestador mientras no exista `src/routes/`.
- No mover lógica real a nuevas carpetas sin una tarea explícita de migración.
- Mantener endpoints legacy hasta que exista una versión nueva y probada.

## Capa LLM

`src/llm/llm.client.js` es la fachada genérica para llamadas al LLM. Código nuevo debe importar `callLlm` desde esa capa.

`src/llm/claude.client.js` se conserva como cliente provider-specific para Anthropic/Claude mientras ese sea un proveedor soportado.

No crear nuevos nombres internos acoplados a Claude para conceptos genéricos. Usar Claude o Anthropic solo cuando se hable del proveedor real, variables de entorno o compatibilidad legacy.

## Configuración de plataforma

La capa `src/settings/` contiene servicios de configuración de plataforma.

Esta capa:

- No contiene agentes.
- No se registra en `src/agents/registry.js`.
- No debe llamar LLM directamente.
- No debe exponer secretos completos.
- Puede usar `data/platform-settings.json` como configuración local/runtime mientras no exista almacenamiento seguro de secretos.

La configuración de proxy es gobierno de plataforma:

- No es agente.
- No debe exponer secretos.
- No debe saltar sanitización.
- No debe permitir desactivar bloqueo de secretos desde UI.
- No debe llamar LLM desde pantallas administrativas.

## Agentes

El primer módulo formal es:

```txt
src/agents/qa-log-analyst/
```

Estado:

- Funcionalidad real actual: endpoints legacy `/analyze-error` y `/analyze-error-context`.
- Runtime genérico: preparado en `/agents/qa-log-analyst/run`, pero con `execution.enabled = false`.
- El LLM no se llama desde el runtime genérico mientras el flag esté deshabilitado.

Documentos obligatorios de gobierno para agentes:

- `docs/AGENT_GOVERNANCE.md`
- `docs/NEW_AGENT_READINESS_CHECKLIST.md`
- `src/agents/shared/AGENT_STANDARD.md`
- `docs/SMOKE_TESTS.md`

## Visión futura: gestión de agentes desde UI

En el futuro la plataforma podrá tener una sección visual para listar, crear o configurar agentes QA desde el frontend.

Por ahora los agentes no son dinámicos y deben definirse por código para mantener control, seguridad, trazabilidad y revisión técnica.

La creación de agentes desde UI queda explícitamente fuera del alcance actual.

Antes de permitir creación o configuración de agentes desde el frontend se requerirá:

- Schema formal de agente.
- Validación estricta del perfil del agente.
- Validación estricta del contrato de entrada.
- Validación estricta del contrato de salida.
- Control de permisos y roles.
- Revisión humana antes de activar un agente.
- Almacenamiento seguro de configuración.
- Versionamiento de prompts.
- Auditoría de cambios.
- Pruebas automáticas por agente.
- Mecanismo de rollback.
- Estado de publicación del agente: `draft`, `review`, `active`, `disabled`.
- Separación entre agentes definidos por código y agentes configurables desde UI.
- Reglas para evitar que un usuario cree un agente que llame LLM sin sanitización.
- Reglas para evitar que un usuario cree un agente que llame LLM sin control de presupuesto.

### Regla actual

Actualmente todos los agentes deben definirse por código y cumplir obligatoriamente con:

```txt
src/agents/<agent-id>/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
```

Además:

- La UI puede listar módulos/agentes existentes.
- `/modules` es actualmente un catálogo de gobierno visual, no una consola de creación.
- La UI no puede crear agentes.
- La UI no puede modificar prompts.
- La UI no puede activar ejecución runtime.
- La fuente de verdad de agentes sigue siendo el código versionado.
- Cada agente formal debe registrarse explícitamente en `src/agents/registry.js`.

## Próximos pasos recomendados

1. Ejecutar `docs/NEW_AGENT_READINESS_CHECKLIST.md` antes de proponer cualquier nuevo agente.
2. Evaluar extracción de `GET /usage` y `POST /usage/reset` a `src/routes/usage.routes.js`.
3. Extraer endpoints legacy QA Log a `src/routes/qa-log.routes.js` solo cuando haya cobertura suficiente.
4. Ampliar `npm run check` para validar directamente archivos reales por capa.
5. Agregar smoke tests automatizados para rutas visuales e informativas.
6. Ampliar tests antes de eliminar cualquier wrapper legacy.

## Restricciones vigentes

- No romper `/analyze-error`.
- No romper `/analyze-error-context`.
- No romper la extensión VS Code.
- No activar runtime genérico sin decisión explícita.
- No crear nuevos agentes hasta cerrar completamente `QA Log Analyst`.
