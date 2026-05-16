AGENTS.md
Propósito

Este archivo entrega contexto operativo a Codex y a cualquier desarrollador IA que trabaje en esta plataforma QA.

La plataforma debe crecer de forma ordenada, modular, segura y gobernada.

Codex debe leer este archivo antes de proponer o ejecutar cambios.

Estado actual de la plataforma

La plataforma actual se basa en el proyecto claude-secure-proxy y está evolucionando hacia una plataforma QA asistida por IA.

El motor LLM central es Claude.

La plataforma tiene actualmente un agente base:

QA Log Analyst

QA Log Analyst analiza errores, logs, stacktraces y contexto técnico.

QA Log Analyst ya está funcional por endpoints legacy y protegido por runtime deshabilitado en el endpoint genérico de agentes.

Estado validado

Estado validado de la plataforma base:

npm run check pasa.
npm test pasa.
npm test tiene 8 tests aprobados de 8.
Smoke tests HTTP pasan con servidor levantado.
/health responde correctamente.
/dashboard responde correctamente.
/modules responde correctamente.
/usage responde correctamente.
/sanitize bloquea contenido sensible.
/agents/qa-log-analyst/run responde de forma segura con execution.enabled = false.
/agents/qa-log-analyst/run responde sentToClaude = false.
No se han creado agentes nuevos después de QA Log Analyst.
No se ha activado runtime real para agentes genéricos.
Arquitectura actual

La arquitectura actual es modular.

Las áreas principales son:

src/agents/
src/agents/qa-log-analyst/
src/agents/shared/runtime/
src/config/
src/dashboard/
src/llm/
src/routes/
src/security/
src/usage/
src/views/
docs/
test/

Cada área debe mantener responsabilidad clara.

No se deben crear archivos sueltos nuevos en src/ si pertenecen a un módulo existente.

Wrappers de compatibilidad

Algunos archivos raíz dentro de src/ se mantienen como wrappers de compatibilidad hacia la nueva estructura modular.

Estos archivos no deben tratarse como la fuente principal de lógica si ya delegan a módulos internos:

src/claude.js
src/dashboard.js
src/env.js
src/sanitizer.js
src/usage.js

Antes de modificar cualquiera de estos archivos, revisar primero el módulo real correspondiente:

src/llm/
src/dashboard/
src/config/
src/security/
src/usage/
QA Log Analyst

QA Log Analyst es el agente base actual de la plataforma.

Debe mantenerse estable.

No modificar QA Log Analyst sin una tarea explícita.

Rutas y archivos relevantes:

src/agents/qa-log-analyst/
src/agents/qa-log-analyst/profile.js
src/agents/qa-log-analyst/skill.md
src/agents/qa-log-analyst/prompt.md
src/agents/qa-log-analyst/contract.md
src/agents/qa-log-analyst/README.md
src/agents/registry.js
src/agents/shared/runtime/

Estado esperado:

execution.enabled = false
mode = legacy
sentToClaude = false desde /agents/qa-log-analyst/run

Los endpoints legacy actuales siguen siendo la vía funcional:

/analyze-error
/analyze-error-context
Gobernanza de agentes

No crear nuevos agentes sin cumplir la gobernanza.

Todo agente nuevo debe:

Vivir en src/agents/<agent-id>/
Tener profile.js.
Tener skill.md.
Tener prompt.md.
Tener contract.md.
Tener README.md.
Tener readiness-checklist.md.
Registrarse explícitamente en src/agents/registry.js.
Iniciar con execution.enabled = false.
No activar runtime real en el mismo cambio donde se crea.
Tener contrato de entrada.
Tener contrato de salida.
Tener outputSchema.
Tener pruebas o smoke tests definidos.
Tener revisión humana.

Documentos obligatorios antes de crear agentes nuevos:

docs/AGENT_GOVERNANCE.md
docs/AGENT_TEMPLATE.md
docs/PLATFORM_READINESS_BEFORE_NEW_AGENTS.md
docs/BASELINE_QA_LOG_PLATFORM_CLOSURE.md
Seguridad

Ningún flujo debe llamar Claude sin pasar por sanitización.

Ningún flujo debe llamar Claude sin pasar por control de presupuesto o usage.

No se deben aceptar prompts libres desde frontend para saltarse contratos.

No se deben guardar secretos en archivos del repositorio.

No se deben incluir tokens, API keys, passwords, credenciales ni datos sensibles en ejemplos.

Uso y presupuesto

El dashboard es el centro de control de tokens, costo y uso.

Rutas relevantes:

/dashboard
/usage

El control de presupuesto y consumo debe mantenerse antes de activar agentes nuevos.

data/

La carpeta data/ contiene estado runtime local.

No debe entrar al commit de baseline.

Puede contener archivos como:

data/usage.json
data/proxy.pid
data/proxy.log

Estos archivos representan métricas locales, procesos locales o logs locales.

Deben tratarse como archivos generados en runtime.

Reglas para Codex

Codex debe trabajar por tareas pequeñas y controladas.

Codex no debe asumir instrucciones externas.

Codex no debe modificar archivos fuera del alcance explícito del prompt.

Codex no debe crear agentes nuevos si la tarea no lo pide explícitamente.

Codex no debe activar execution.enabled = true salvo instrucción explícita y aprobada.

Codex no debe hacer git add ni git commit salvo instrucción explícita.

Codex no debe instalar dependencias salvo instrucción explícita.

Codex no debe refactorizar código fuera del alcance de la tarea.

Codex debe reportar exactamente qué archivos modificó.

Codex debe ejecutar validaciones cuando el prompt lo pida.

Validaciones recomendadas

Para cambios de documentación:

npm run check
npm test

Para cambios de runtime o rutas:

npm run check
npm test
GET /health
GET /dashboard
GET /modules
GET /usage
POST /sanitize
POST /agents/qa-log-analyst/run
Estado antes de nuevos agentes

Antes de crear cualquier nuevo agente, debe cumplirse:

Baseline Git revisado.
data/ excluido del commit.
AGENTS.md actualizado.
npm run check aprobado.
npm test aprobado.
Smoke tests HTTP aprobados.
QA Log Analyst estable.
Gobernanza documentada.
Plantilla oficial documentada.
Readiness documentado.
Cierre de baseline documentado.

Si existe duda, no crear el agente.
