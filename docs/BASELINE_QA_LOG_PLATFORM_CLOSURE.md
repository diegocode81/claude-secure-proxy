Baseline QA Log Platform Closure
Propósito

Este documento registra el cierre formal de la etapa base de la plataforma QA antes de crear nuevos agentes.

La intención es dejar una línea base clara, auditable y gobernada para evitar crecimiento desordenado.

Este cierre no activa nuevos agentes y no cambia la funcionalidad productiva existente.

Alcance del cierre

Este cierre cubre:

Organización modular inicial de la plataforma.
Definición de QA Log Analyst como agente base.
Documentación de gobernanza de agentes.
Documentación de plantilla oficial para agentes.
Documentación de readiness antes de nuevos agentes.
Validación de checks automáticos.
Confirmación de que no se crean nuevos agentes en esta etapa.
Documentos cerrados

Los siguientes documentos forman parte del cierre base:

docs/AGENT_GOVERNANCE.md
docs/AGENT_TEMPLATE.md
docs/PLATFORM_READINESS_BEFORE_NEW_AGENTS.md
src/ARCHITECTURE.md
Documento de smoke tests

El documento docs/SMOKE_TESTS.md forma parte de la documentación operativa de validación.

Si todavía requiere ajustes futuros, esos ajustes deben tratarse como una tarea separada y controlada.

Estado de QA Log Analyst

QA Log Analyst queda definido como el agente base actual de la plataforma.

Estado esperado:

Existe src/agents/qa-log-analyst/.
QA Log Analyst está registrado en src/agents/registry.js.
QA Log Analyst conserva ejecución real deshabilitada desde el runtime común.
QA Log Analyst mantiene execution.enabled = false.
QA Log Analyst mantiene mode = legacy.
El endpoint /agents/qa-log-analyst/run no llama LLM.
El endpoint /agents/qa-log-analyst/run responde sentToClaude: false.
Los endpoints legacy siguen siendo la vía funcional actual:
/analyze-error
/analyze-error-context
Estado de gobernanza

La plataforma queda con las siguientes reglas base:

Todo agente nuevo debe definirse por código.
Todo agente nuevo debe tener profile.js.
Todo agente nuevo debe tener skill.md.
Todo agente nuevo debe tener prompt.md.
Todo agente nuevo debe tener contract.md.
Todo agente nuevo debe tener README.md.
Todo agente nuevo debe tener readiness-checklist.md.
Todo agente nuevo debe registrarse en src/agents/registry.js.
Todo agente nuevo debe iniciar con execution.enabled = false.
No se permite activar un agente en el mismo cambio donde se crea.
No se permite llamar LLM sin sanitización.
No se permite llamar LLM sin control de presupuesto.
No se permite crear agentes desde UI en el estado actual de la plataforma.
Estado de arquitectura

La plataforma queda orientada a una arquitectura modular con estas áreas:

src/agents/
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

Cada área debe mantener responsabilidad clara.

No se deben crear archivos sueltos nuevos en src/ si pertenecen a un módulo existente.

Estado de validaciones automáticas

Última validación reportada:

npm run check: aprobado.
npm test: aprobado.
Tests aprobados: 8/8.
No se modificaron archivos durante la validación.
No se crearon archivos durante la validación.
No se crearon carpetas durante la validación.
No se crearon agentes nuevos.
No se activó runtime.
No se instalaron dependencias.
Estado de smoke tests HTTP

Los smoke tests HTTP no se ejecutaron en la última validación porque el servidor no estaba levantado en localhost:3000.

Resultado reportado:

Servidor localhost:3000 disponible: no.
Código de verificación: 000.
Smoke tests HTTP ejecutados: no.

Esto no invalida el cierre documental, pero queda como pendiente operativo antes de crear nuevos agentes.

Antes de crear un nuevo agente, deben ejecutarse nuevamente con el servidor levantado:

GET /health
GET /dashboard
GET /modules
GET /usage
POST /sanitize
POST /agents/qa-log-analyst/run
Estado Git observado

Durante la validación se observó que el repositorio no estaba en una línea base limpia.

Salida resumida reportada:

Archivos modificados:
package.json
src/claude.js
src/dashboard.js
src/env.js
src/sanitizer.js
src/server.js
src/usage.js
Archivos o carpetas untracked:
AGENTS.md
data/
docs/
src/ARCHITECTURE.md
src/agents/
src/config/
src/dashboard/
src/llm/
src/routes/
src/security/
src/usage/
src/views/
test/

Esta situación debe entenderse como parte de la reorganización actual de la plataforma.

Antes de crear un nuevo agente, se recomienda crear una línea base controlada mediante commit o revisión explícita del estado Git.

Decisión de cierre

La etapa base queda cerrada documentalmente bajo estas condiciones:

QA Log Analyst queda como agente base.
No se crean nuevos agentes todavía.
La plataforma tiene gobernanza documentada.
La plataforma tiene plantilla oficial de agentes.
La plataforma tiene checklist de readiness antes de nuevos agentes.
Las validaciones automáticas pasan.
Los smoke tests HTTP quedan pendientes hasta levantar servidor.
El estado Git debe ser revisado antes de avanzar a un nuevo agente.
Bloqueo antes de nuevos agentes

No se debe crear ningún agente nuevo hasta cumplir:

Servidor levantado.
Smoke tests HTTP ejecutados.
QA Log Analyst validado por endpoint runtime.
/sanitize validado.
/usage validado.
/dashboard validado.
/modules validado.
Estado Git revisado.
Decisión explícita de avanzar.
Próximo paso permitido

El próximo paso permitido no es crear un agente nuevo.

El próximo paso permitido es ejecutar smoke tests HTTP con el servidor levantado y confirmar que la plataforma base responde correctamente.
