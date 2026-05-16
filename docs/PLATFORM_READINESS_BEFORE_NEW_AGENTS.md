# Platform Readiness Before New Agents

## Propósito

Este documento define las condiciones mínimas obligatorias que deben cumplirse antes de crear cualquier agente QA nuevo dentro de la plataforma.

La plataforma debe crecer de forma ordenada, segura, trazable y gobernada.

Si cualquiera de los puntos de este checklist falla, no se debe crear ningún agente nuevo.

## Regla principal

Antes de crear un nuevo agente QA, la plataforma debe demostrar que:

- La arquitectura base está documentada.
- La gobernanza de agentes está documentada.
- La plantilla oficial de agentes está documentada.
- QA Log Analyst sigue estable.
- El runtime común valida input correctamente.
- La sanitización funciona.
- El control de presupuesto existe.
- El dashboard sigue funcionando.
- Los smoke tests base pasan.
- Los tests automatizados pasan.
- No existe deuda estructural crítica pendiente.

## Documentos obligatorios

Antes de crear cualquier agente nuevo deben existir estos documentos:

```txt
docs/AGENT_GOVERNANCE.md
docs/AGENT_TEMPLATE.md
docs/PLATFORM_READINESS_BEFORE_NEW_AGENTS.md
docs/SMOKE_TESTS.md
src/ARCHITECTURE.md
```

## Estado requerido de gobernanza

Debe cumplirse:

- `docs/AGENT_GOVERNANCE.md` existe.
- `docs/AGENT_GOVERNANCE.md` define principios obligatorios.
- `docs/AGENT_GOVERNANCE.md` define estructura mínima por agente.
- `docs/AGENT_GOVERNANCE.md` exige registro en `src/agents/registry.js`.
- `docs/AGENT_GOVERNANCE.md` indica que todo agente nuevo inicia con `execution.enabled = false`.
- `docs/AGENT_GOVERNANCE.md` prohíbe llamar Claude sin sanitización.
- `docs/AGENT_GOVERNANCE.md` prohíbe llamar Claude sin control de presupuesto.
- `docs/AGENT_GOVERNANCE.md` indica que la creación desde UI no está habilitada actualmente.

## Estado requerido de plantilla de agentes

Debe cumplirse:

- `docs/AGENT_TEMPLATE.md` existe.
- `docs/AGENT_TEMPLATE.md` define la estructura mínima obligatoria.
- `docs/AGENT_TEMPLATE.md` incluye `profile.js`.
- `docs/AGENT_TEMPLATE.md` incluye `skill.md`.
- `docs/AGENT_TEMPLATE.md` incluye `prompt.md`.
- `docs/AGENT_TEMPLATE.md` incluye `contract.md`.
- `docs/AGENT_TEMPLATE.md` incluye `README.md`.
- `docs/AGENT_TEMPLATE.md` incluye `readiness-checklist.md`.
- `docs/AGENT_TEMPLATE.md` exige `outputSchema`.
- `docs/AGENT_TEMPLATE.md` exige `execution.enabled = false`.
- `docs/AGENT_TEMPLATE.md` exige `mode: 'runtime-disabled'`.
- `docs/AGENT_TEMPLATE.md` prohíbe activar un agente en el mismo cambio donde se crea.
- `docs/AGENT_TEMPLATE.md` define estados permitidos.
- `docs/AGENT_TEMPLATE.md` define modos de ejecución permitidos.

## Estado requerido de arquitectura

Debe cumplirse:

- `src/ARCHITECTURE.md` existe.
- `src/ARCHITECTURE.md` describe la plataforma modular.
- `src/ARCHITECTURE.md` diferencia módulos visuales, agentes y runtime.
- `src/ARCHITECTURE.md` indica que Claude es el motor LLM central.
- `src/ARCHITECTURE.md` indica que ninguna llamada a Claude debe saltarse sanitización.
- `src/ARCHITECTURE.md` indica que ninguna llamada a Claude debe saltarse control de presupuesto.
- `src/ARCHITECTURE.md` indica que el dashboard es el centro de control de tokens, costo y uso.
- `src/ARCHITECTURE.md` indica que la creación de agentes desde UI es visión futura y no funcionalidad actual.

## Estado requerido de estructura de carpetas

Antes de crear nuevos agentes deben existir estas rutas:

```txt
src/
src/agents/
src/agents/qa-log-analyst/
src/agents/shared/
src/agents/shared/runtime/
src/config/
src/dashboard/
src/llm/
src/routes/
src/security/
src/usage/
src/views/
docs/
```

Si alguna ruta falta, se debe revisar antes de crear nuevos agentes.

No se debe crear un nuevo agente para compensar una estructura base incompleta.

## Estado requerido de QA Log Analyst

QA Log Analyst es el agente base actual de la plataforma.

Antes de crear nuevos agentes debe cumplirse:

- Existe `src/agents/qa-log-analyst/`.
- Existe `src/agents/qa-log-analyst/profile.js`.
- Existe `src/agents/qa-log-analyst/skill.md`.
- Existe `src/agents/qa-log-analyst/prompt.md`.
- Existe `src/agents/qa-log-analyst/contract.md`.
- Existe `src/agents/qa-log-analyst/README.md`.
- QA Log Analyst está registrado en `src/agents/registry.js`.
- QA Log Analyst sigue en modo legacy.
- QA Log Analyst tiene `execution.enabled = false`.
- QA Log Analyst no llama Claude desde `/agents/qa-log-analyst/run`.
- `/agents/qa-log-analyst/run` responde `sentToClaude: false`.
- Los endpoints legacy siguen siendo la vía productiva:
  - `/analyze-error`
  - `/analyze-error-context`

## Estado requerido del registry

Debe cumplirse:

- Existe `src/agents/registry.js`.
- QA Log Analyst está registrado.
- No existen agentes incompletos registrados.
- No existen agentes sin carpeta.
- No existen carpetas de agentes sin decisión clara.
- No se registran agentes en estado activo sin checklist.
- No se registran agentes con `execution.enabled = true` al momento de crearlos.

## Estado requerido del runtime común

Debe cumplirse:

- Existe `src/agents/shared/runtime/`.
- El runtime valida que el body tenga forma `{ "input": {} }`.
- El runtime rechaza input inválido.
- El runtime valida contrato de entrada por agente.
- El runtime bloquea campos no declarados cuando el contrato lo exige.
- El runtime responde con contrato estándar.
- El runtime no llama Claude si `execution.enabled = false`.
- El runtime informa `sentToClaude: false` cuando la ejecución está deshabilitada.
- El runtime no debe ser duplicado por agente.

## Estado requerido de seguridad

Debe cumplirse:

- Existe capa de sanitización en `src/security/`.
- Existe endpoint `/sanitize`.
- `/sanitize` bloquea contenido crítico.
- `/sanitize` detecta passwords, secrets o credenciales explícitas.
- El contenido bloqueado no debe enviarse a Claude.
- Ningún agente futuro puede saltarse sanitización.

## Estado requerido de presupuesto y uso

Debe cumplirse:

- Existe capa de usage en `src/usage/`.
- Existe endpoint `/usage`.
- El dashboard muestra consumo.
- El dashboard es el centro de control de tokens y costo.
- Ningún agente futuro puede llamar Claude sin control de presupuesto.
- No se permiten rutas alternativas para saltarse usage/budget.

## Estado requerido de dashboard

Debe cumplirse:

- Existe `/dashboard`.
- `/dashboard` responde correctamente.
- `/dashboard` muestra información de uso o consumo.
- `/dashboard` se mantiene como centro de control.
- Ningún agente debe reemplazar el rol del dashboard para control de tokens y costo.

## Estado requerido de módulos

Debe cumplirse:

- Existe `/modules`.
- `/modules` responde correctamente.
- `/modules` funciona como catálogo visual.
- `/modules` puede mostrar agentes activos o planificados.
- `/modules` no permite crear agentes.
- `/modules` no permite editar agentes.
- `/modules` no permite activar agentes.
- `/modules` no permite eliminar agentes.
- La creación desde UI queda como visión futura.

## Estado requerido de smoke tests

Debe existir documentación de smoke tests en:

```txt
docs/SMOKE_TESTS.md
```

Antes de crear un nuevo agente deben ejecutarse como mínimo:

```bash
npm run check
```

```bash
npm test
```

```bash
curl http://localhost:3000/health
```

```bash
curl http://localhost:3000/dashboard
```

```bash
curl http://localhost:3000/modules
```

```bash
curl http://localhost:3000/usage
```

```bash
curl -X POST http://localhost:3000/sanitize \
  -H "Content-Type: application/json" \
  -d '{"text":"mi password=123456 y email test@test.com"}'
```

```bash
curl -X POST http://localhost:3000/agents/qa-log-analyst/run \
  -H "Content-Type: application/json" \
  -d '{"input":{"errorText":"NullPointerException"}}'
```

## Resultado esperado de `/sanitize`

La respuesta debe indicar bloqueo de contenido crítico.

Debe contener al menos:

```txt
status = BLOCKED
risk = HIGH
```

## Resultado esperado de `/agents/qa-log-analyst/run`

La respuesta debe contener:

```txt
status = AGENT_EXECUTION_DISABLED
sentToClaude = false
data.execution.enabled = false
data.execution.mode = legacy
```

## Condiciones que bloquean la creación de nuevos agentes

No se debe crear un nuevo agente si ocurre cualquiera de estas condiciones:

- `npm run check` falla.
- `npm test` falla.
- `/health` no responde.
- `/dashboard` no responde.
- `/modules` no responde.
- `/usage` no responde.
- `/sanitize` no bloquea contenido crítico.
- `/agents/qa-log-analyst/run` llama Claude.
- `/agents/qa-log-analyst/run` no responde `sentToClaude: false`.
- QA Log Analyst está roto.
- `src/agents/registry.js` tiene agentes incompletos.
- Falta documentación de gobernanza.
- Falta plantilla oficial.
- Falta contrato de entrada para el nuevo agente.
- Falta contrato de salida para el nuevo agente.
- No existe plan de rollback.
- No existe revisión humana.
- Se intenta activar `execution.enabled = true` durante la creación del agente.

## Decisión final

Solo se puede avanzar a crear un nuevo agente cuando todos los puntos anteriores estén cumplidos.

La plataforma debe priorizar:

1. Seguridad.
2. Gobernanza.
3. Trazabilidad.
4. Contratos claros.
5. Estabilidad de QA Log Analyst.
6. Control de presupuesto.
7. Escalabilidad modular.

Si existe duda, no se crea el agente.
