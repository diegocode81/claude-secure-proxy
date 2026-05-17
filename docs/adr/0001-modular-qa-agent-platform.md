# ADR 0001: Plataforma QA Modular con Agentes Gobernados por Claude

## Estado

Aceptado.

## Fecha

2026-05-16.

## Contexto

`claude-secure-proxy` nació como un proxy local seguro para enviar contenido sanitizado a Claude y controlar consumo de tokens/costo. El proyecto ya tiene:

- Dashboard operativo en `/dashboard`.
- QA Log Analyst funcional desde la extensión VS Code.
- Endpoints legacy usados por la extensión:
  - `POST /analyze-error`
  - `POST /analyze-error-context`
- Sanitización antes de enviar datos a Claude.
- Control local de uso y presupuesto.
- Runtime común experimental para agentes:
  - `POST /agents/:agentId/run`
- Registro central de agentes en `src/agents/registry.js`.
- Primer módulo formal en `src/agents/qa-log-analyst/`.
- Rutas visuales e informativas parcialmente extraídas a `src/routes/`.

El objetivo de producto es evolucionar hacia una plataforma QA asistida por IA con módulos especializados, manteniendo a Claude como cerebro común y evitando que cada módulo implemente lógica aislada, prompts libres o llamadas directas no gobernadas.

## Decisión

Adoptamos una arquitectura modular de plataforma QA basada en agentes, con estas reglas:

1. Claude será el proveedor LLM central de la plataforma.
2. Ningún módulo QA debe llamar Claude directamente desde frontend o vistas.
3. Todo flujo real hacia Claude debe pasar por:
   - validación de entrada,
   - sanitización,
   - control de presupuesto,
   - construcción de prompt controlado,
   - llamada al cliente LLM,
   - normalización de respuesta.
4. Cada módulo QA formal debe vivir bajo `src/agents/<agent-id>/`.
5. Cada agente formal debe declarar al menos:
   - `profile.js`
   - `skill.md`
   - `prompt.md`
   - `contract.md`
   - `README.md`
6. `profile.js` será la fuente ejecutable para metadatos del módulo, navegación, capacidades, contrato de entrada/salida y reglas de gobierno.
7. Los archivos `.md` serán documentación oficial del módulo, no runtime dinámico por ahora.
8. El registro central `src/agents/registry.js` será la fuente para navegación, catálogo y resolución de agentes.
9. El runtime genérico `POST /agents/:agentId/run` existe como ruta experimental segura, pero no reemplaza endpoints legacy hasta una decisión explícita.
10. QA Log Analyst seguirá en modo legacy hasta que exista cobertura suficiente y una migración explícita.

## Arquitectura Aprobada

La estructura objetivo gradual es:

```txt
src/
  server.js
  config/
  llm/
  security/
  usage/
  dashboard/
  agents/
  views/
  routes/
```

Responsabilidades:

| Capa | Responsabilidad |
|---|---|
| `config/` | Carga y acceso a configuración/env. |
| `llm/` | Cliente Claude y futuros clientes LLM si se requieren. |
| `security/` | Sanitización y controles de seguridad de entrada. |
| `usage/` | Métricas, consumo y presupuesto. |
| `dashboard/` | Servicio del dashboard operativo. |
| `agents/` | Perfiles, contratos, prompts documentados y runtime común. |
| `views/` | HTML renderizado por servidor. |
| `routes/` | Rutas HTTP separadas por dominio. |

## Estado Actual de QA Log Analyst

QA Log Analyst es el primer módulo formal de la plataforma.

Ruta documental:

```txt
src/agents/qa-log-analyst/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
```

Modo actual:

- Funcionalidad real: legacy.
- Cliente principal: extensión VS Code.
- Endpoints productivos:
  - `POST /analyze-error`
  - `POST /analyze-error-context`
- Runtime genérico:
  - `POST /agents/qa-log-analyst/run`
  - `execution.enabled = false`
  - `execution.mode = "legacy"`
  - `sentToClaude = false`

El runtime genérico puede validar contrato de entrada, pero no debe llamar Claude mientras `execution.enabled` sea `false`.

## Reglas Para Nuevos Agentes

Antes de crear un nuevo agente formal:

- QA Log Analyst debe permanecer estable.
- `docs/SMOKE_TESTS.md` debe pasar para la plataforma base.
- El nuevo agente debe tener página visual o entrada clara en catálogo.
- El nuevo agente debe registrarse en `src/agents/registry.js` solo cuando tenga perfil completo.
- El nuevo agente debe declarar contrato de entrada en `profile.js`.
- El nuevo agente debe tener prompt controlado documentado.
- Ningún agente debe aceptar prompts libres desde frontend como reemplazo de su rol.
- Ningún agente debe omitir sanitización o control de presupuesto.

## Compatibilidad Legacy

Se mantiene compatibilidad con archivos y rutas legacy mediante wrappers y migración gradual.

No se deben eliminar wrappers hasta que:

- no existan imports activos hacia el archivo legacy,
- haya cobertura de tests,
- la matriz de smoke tests pase,
- exista una tarea explícita para remover compatibilidad.

Rutas legacy protegidas:

| Ruta | Estado |
|---|---|
| `POST /analyze` | Mantener contrato actual. |
| `POST /analyze-error` | Mantener contrato actual. |
| `POST /analyze-error-context` | Mantener contrato actual. |
| `POST /sanitize` | Mantener contrato actual. |
| `GET /usage` | Mantener contrato actual. |
| `POST /usage/reset` | Mantener contrato actual. |
| `GET /health` | Mantener contrato actual. |

## Consecuencias

### Positivas

- La plataforma puede crecer con nuevos módulos sin duplicar reglas críticas.
- El dashboard conserva su rol como centro de control de consumo.
- QA Log Analyst queda protegido mientras se migra gradualmente.
- Los agentes futuros tendrán estructura y contrato documental uniforme.
- La navegación y catálogo pueden derivarse del registro central.
- El runtime genérico puede evolucionar sin forzar una migración inmediata de endpoints legacy.

### Costos

- Durante la transición existirán wrappers y rutas duplicadas a nivel estructural.
- `src/server.js` seguirá siendo parcialmente orquestador hasta completar la extracción de rutas.
- Algunos archivos `.md` de agentes serán documentación oficial, pero no fuente dinámica de runtime.
- Se requiere disciplina para no conectar prompts o agentes nuevos antes de cerrar smoke tests.

### Riesgos

- Activar runtime real prematuramente podría romper compatibilidad con la extensión VS Code.
- Mover endpoints legacy sin cobertura suficiente puede cambiar contratos de respuesta.
- Permitir prompts libres desde frontend puede saltarse gobierno, sanitización o presupuesto.
- Duplicar lógica de sanitización/presupuesto por módulo generaría inconsistencias.

## Decisiones Explícitas de No Hacer Por Ahora

- No crear más agentes hasta cerrar estabilidad de QA Log Analyst.
- No reemplazar `/analyze-error` ni `/analyze-error-context` por `/agents/qa-log-analyst/run`.
- No activar `execution.enabled` para QA Log Analyst.
- No leer `prompt.md`, `skill.md` ni `contract.md` dinámicamente desde servidor.
- No implementar login.
- No crear base de datos.
- No instalar dependencias nuevas para esta arquitectura.
- No cambiar el modelo de Claude dentro de esta decisión.

## Validación Obligatoria

Cada refactor estructural debe validar:

- `npm test`
- `npm run check`
- matriz aplicable de `docs/SMOKE_TESTS.md`

Criterios mínimos:

- `/` redirige a `/dashboard`.
- `/dashboard` responde.
- `/qa-log-analyst` responde.
- `/downloads/secure-code-vscode` sirve solo el `.vsix` conocido.
- `/analyze-error` y `/analyze-error-context` mantienen contrato legacy.
- Casos con secretos se bloquean antes de Claude.
- `/agents/qa-log-analyst/run` mantiene `sentToClaude: false` mientras execution esté deshabilitado.

## Evolución Esperada

Orden recomendado:

1. Mantener estable QA Log Analyst.
2. Extraer rutas de bajo riesgo desde `src/server.js`.
3. Agregar cobertura antes de mover endpoints legacy.
4. Migrar clientes internos hacia capas (`llm/`, `config/`, `security/`, `usage/`).
5. Solo después, diseñar futuros agentes QA especializados siguiendo gobernanza, plantilla y checklist.
6. Activar runtime real por agente únicamente con flag explícito, contrato probado y smoke tests actualizados.

## Referencias

- `src/ARCHITECTURE.md`
- `docs/AGENT_GOVERNANCE.md`
- `docs/NEW_AGENT_READINESS_CHECKLIST.md`
- `docs/SMOKE_TESTS.md`
- `src/agents/registry.js`
- `src/agents/shared/AGENT_STANDARD.md`
- `src/agents/qa-log-analyst/README.md`
- `src/agents/qa-log-analyst/profile.js`
