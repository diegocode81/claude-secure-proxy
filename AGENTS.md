AGENTS.md
Propósito

Este archivo entrega contexto operativo a Codex y a cualquier desarrollador IA que trabaje en esta plataforma QA.

La plataforma debe crecer de forma ordenada, modular, segura y gobernada.

Codex debe leer este archivo antes de proponer o ejecutar cambios.

Estado actual de la plataforma

La plataforma actual se basa en el proyecto claude-secure-proxy y está evolucionando hacia una plataforma QA asistida por IA.

El cerebro de la plataforma es el LLM configurado.

La plataforma tiene actualmente un agente base:

QA Log Analyst

QA Log Analyst analiza errores, logs, stacktraces y contexto técnico.

QA Log Analyst está activado de forma controlada en el endpoint genérico de agentes y reutiliza la lógica legacy segura.

Estado validado

Estado validado de la plataforma base:

npm run check pasa.
npm test pasa.
npm test tiene 34 tests aprobados de 34.
Smoke tests HTTP pasan con servidor levantado.
/health responde correctamente.
/dashboard responde correctamente.
/modules responde correctamente.
/usage responde correctamente.
/sanitize bloquea contenido sensible.
/agents/qa-log-analyst/run está activado de forma controlada.
/agents/qa-log-analyst/run usa execution.enabled = true.
/agents/qa-log-analyst/run usa execution.mode = legacy-runtime-enabled.
/agents/qa-log-analyst/run conserva `sentToLLM` como campo principal y `sentToClaude` como compatibilidad legacy cuando aplica.
QA Log Analyst sigue protegido contra edición/eliminación desde UI.
El runtime de QA Log Analyst pasa por sanitización, presupuesto y registro de usage.

Nomenclatura LLM

Usar LLM para conceptos genéricos del cerebro de la plataforma.

Usar Claude o Anthropic solo cuando se hable del proveedor específico, variables reales como `ANTHROPIC_API_KEY` o compatibilidad legacy.

`callLlm` es la fachada genérica para nuevas llamadas al modelo.

`recordLlmUsage` es la función genérica para registrar consumo.

`sentToClaude` puede seguir existiendo temporalmente como campo técnico legacy; `sentToLLM` debe ser el campo semántico principal en respuestas nuevas o modificadas.

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
src/settings/
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

execution.enabled = true
execution.mode = legacy-runtime-enabled
runtimeEndpoint = /agents/qa-log-analyst/run
sentToLLM es el campo semántico principal
sentToClaude se conserva solo por compatibilidad legacy

El endpoint genérico usa la lógica legacy segura y mantiene:

/analyze-error
/analyze-error-context

QA Log Analyst sigue protegido contra edición y eliminación desde UI.

QA Log Analyst debe pasar por sanitización, control de presupuesto y registro de usage/tokens cuando llama al LLM.
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
Iniciar con `execution.enabled` en `false`.
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

Creación de agentes desde UI

/agent-builder crea agentes QA desde UI.

El formulario está simplificado para usuarios QA funcionales.

El usuario solo define campos funcionales como identidad, propósito, capacidades, entrada/salida esperada, respuesta LLM y comportamiento funcional.

Campos internos como `status`, `statusLabel`, `navigation.order`, `governance`, readiness checklist, `inputContract`, `outputSchema` y `userInstructions` son generados por backend.

Todo agente creado inicia deshabilitado.

No se permite estado active en creación.

QA Log Analyst no puede ser sobrescrito.

La creación final no llama LLM salvo que una tarea explícita agregue una función de sugerencia o asistencia separada y gobernada.

Los agentes creados deben revisarse antes de activar runtime real.

Administración de agentes

Los agentes creados desde UI pueden activarse, desactivarse o eliminarse desde su pantalla de detalle.

QA Log Analyst es protegido.

Activar cambia execution.enabled a true y mode runtime-enabled.

Desactivar cambia execution.enabled a false y mode runtime-disabled.

Eliminar requiere confirmación y no aplica a QA Log Analyst.

Las acciones administrativas no llaman LLM.

Agentes creados desde UI pueden editarse desde su pantalla.

QA Log Analyst no es editable.

La edición no activa runtime ni llama LLM.

execution se administra solo por activar/desactivar.

El Agent Builder puede usar Sugerencia IA para completar campos.

La Sugerencia IA debe priorizar calidad de agente especialista sobre brevedad. No debe generar skills, prompts o contratos genéricos ni excesivamente cortos.

La sugerencia no crea el agente.

La sugerencia no activa runtime.

La creación final sigue validada por contrato.

Las sugerencias IA del Agent Builder deben registrar usage/tokens.

Si curl local falla en Codex con Operation not permitted, repetir con permisos escalados.

Seguridad

Ningún flujo debe llamar LLM sin pasar por sanitización.

Ningún flujo debe llamar LLM sin pasar por control de presupuesto o usage.

No se deben aceptar prompts libres desde frontend para saltarse contratos.

No se deben guardar secretos en archivos del repositorio.

No se deben incluir tokens, API keys, passwords, credenciales ni datos sensibles en ejemplos.

La plataforma es local/dev-only en esta fase.

No hay login ni roles por decisión de MVP local.

No debe exponerse públicamente sin autenticación, autorización, auditoría, rate limiting, protección CSRF si aplica y secret manager.

No existe endpoint funcional de reinicio de plataforma.

No implementar reinicio desde UI/API. Si un cambio requiere reinicio, el usuario lo hace manualmente desde terminal.

`src/security/prompt-injection-policy.js` y `src/security/file-upload-policy.js` son políticas existentes y deben conservarse.

`.env`, `data/` y `*.log` deben permanecer fuera del repositorio.

Uso y presupuesto

El dashboard es el centro de control de tokens, costo y uso.

Rutas relevantes:

/dashboard
/usage

El control de presupuesto y consumo debe mantenerse antes de activar agentes nuevos.

Configuración de plataforma

/settings administra configuración base de plataforma.

/settings incluye Dashboard, LLM y Proxy.

No es agente.

No se registra en registry.

API keys no deben exponerse completas.

Settings LLM permite configurar proveedor y modelo LLM. `/settings/config` debe devolver `provider`, `displayName`, `model`, estado de API key, preview enmascarado y fuente, pero nunca la API key completa.

El input de API key en UI no debe precargarse con el secreto real. Si el operador guarda LLM con API key vacía, se conserva la key existente; solo se reemplaza cuando ingresa una nueva.

data/platform-settings.json es runtime local y no debe entrar al commit.

Proxy no permite desactivar sanitización ni bloqueo de secretos.

Proxy no llama LLM desde configuración.

Política de refresh de plataforma

Toda acción estructural o de configuración debe usar el servicio genérico de refresh en src/platform/platform-refresh.service.js.

No duplicar lógica de mensajes de refresh en cada endpoint.

Crear o eliminar agentes recomienda refrescar navegador y reiniciar servidor manualmente si navegación o runtime no se actualizan.

Proxy settings puede requerir reinicio o redeploy manual.

Settings Dashboard y LLM normalmente requieren refrescar pantalla.

No implementar auto-restart.

El refresh no debe mostrar botón de reinicio.

Solo debe usarse para entorno local/desarrollo.

No implementar reinicio desde UI/API. Si un cambio requiere reinicio, el usuario lo hace manualmente desde terminal.

No crear endpoints de restart ni llamadas frontend para reiniciar el servidor.

Contrato de interacción de agentes

Todo agente usa configuración funcional de interacción mediante `io`, `inputMode`, `outputMode` y `responsePreset`.

Esta configuración se administra desde edición y backend. La pantalla de detalle/uso del agente debe mostrar solo lo necesario para ejecutar el agente: instrucciones funcionales, campos de entrada, acción de ejecución, loader y resultado.

`inputContract` y `outputSchema` son contratos técnicos internos generados automáticamente desde `io`.

No deben mostrarse ni editarse en pantallas de agentes para usuarios QA funcionales.

`outputMode = screen` debe mostrar un documento Markdown listo para copiar y pegar.

El JSON técnico debe quedar solo en una sección de diagnóstico o respuesta técnica colapsada.

La estructura legacy `interaction` puede existir por compatibilidad, pero la configuración funcional nueva debe resolverse desde `io`.

No todos los agentes usan archivos. Los agentes de archivo deben declarar `inputMode` y `acceptedInputTypes` con formatos permitidos como `json`, `csv`, `html`, `markdown`, `pdf` o `text`.

Los reportes descargables se generan en el frontend en esta fase. No se deben guardar reportes ni archivos subidos permanentemente en el servidor sin una decisión explícita de almacenamiento.

La ejecución sigue controlada por `execution.enabled`, runtime, sanitización y presupuesto. El contrato de interacción no activa agentes ni permite saltarse controles.

Configuración LLM por agente

Todo agente debe tener `llmSettings` o usar defaults seguros del runtime.

La plataforma prioriza calidad por defecto: nuevos agentes usan `responseDetailLevel = extensive`, `maxOutputTokens = 5000` y precisión `temperature = 0.1`.

El usuario puede bajar estos valores si necesita reducir consumo.

No usar valores sin validar. `maxOutputTokens` controla costo y tamaño de respuesta, y debe estar entre 300 y 8000.

`temperature` debe mantenerse baja para QA; se recomienda `0.1` a `0.3`.

`budgetPolicy` debe estar activo por defecto y no debe desactivarse desde UI sin una decisión explícita de gobernanza.

Las capacidades default deben ser robustas y orientadas a agentes QA especialistas.

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

Formulario de creación de agentes

El formulario de creación debe mostrar solo campos funcionales del agente.

Campos de gobernanza interna como `status`, `statusLabel`, `navigationOrder` y readiness checklist se generan automáticamente desde backend y no deben exponerse al usuario en creación.

La gobernanza de agentes es interna y generada por la plataforma. No debe mostrarse como campo editable en creación ni edición.

La administración de estado se controla con botones de activar/desactivar, no con campos manuales en formularios.

Los contratos técnicos de entrada y salida son internos. No deben mostrarse como tarjetas ni campos editables para usuarios QA funcionales. La UI debe usar campos funcionales de entrada/salida y el backend debe generar `inputContract` y `outputSchema` automáticamente desde `io`.

La UI de creación de agentes debe ser funcional y no técnica. `userInstructions`, `inputContract`, `outputSchema`, `governance`, checklist, `status`, `statusLabel` y `navigation.order` son responsabilidad interna de la plataforma y no deben mostrarse como campos editables al usuario QA funcional.

Los campos internos del agente como skill, prompt oficial, contrato y checklist son responsabilidad de la plataforma. La UI puede recibir intención funcional del usuario, pero el backend debe generar o normalizar estos artefactos para mantener gobierno y seguridad.

La sección de entrada/salida debe pedir solo modo de entrada, modo de salida y tipo de respuesta esperada. Los campos detallados de salida solo pueden aparecer cuando el usuario elige `Personalizado`.

Todo agente con `outputMode` de pantalla debe devolver una salida documental legible, lista para copiar y pegar, incluyendo todas las secciones esperadas configuradas. El JSON técnico nunca debe ser la salida principal.

Si falta información crítica para cumplir una solicitud de forma confiable, el runtime debe preguntar primero. La respuesta debe incluir máximo 5 preguntas concretas y accionables, puede agregar un análisis preliminar breve, y no debe generar un informe completo hasta recibir el contexto faltante.

La sección `Preguntas abiertas` debe contener preguntas reales. No usar placeholders genéricos de información insuficiente dentro de esa sección; si no hay preguntas reales, omitirla.

El runtime visible debe filtrar secciones vacías o placeholders. En modo `Necesito más información`, no se deben renderizar secciones documentales incompletas como informe, criterios, escenarios, riesgos o recomendaciones.

Toda acción async visible para el usuario debe mostrar un indicador de carga reutilizable y deshabilitar el botón mientras espera respuesta. Usar el helper compartido de loader en vistas nuevas o modificadas.

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

Nota operativa para validaciones HTTP en Codex

Cuando una tarea requiera validar endpoints locales contra http://localhost:3000 desde Codex, no se debe asumir que el servidor está caído si curl devuelve Operation not permitted.

Primero se debe confirmar si el servidor está levantado y, si aplica, repetir la prueba HTTP con permisos escalados dentro del sandbox de Codex.

Criterio obligatorio:

Si curl falla con Operation not permitted, repetir el mismo curl con permisos escalados.
Solo concluir que el servidor no está disponible si la prueba falla también con permisos escalados o si no existe proceso escuchando en el puerto esperado.
Para validar disponibilidad base, usar primero GET /health.
No modificar archivos para resolver un falso negativo de sandbox.

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

Postura de seguridad local/dev-only

La plataforma en esta fase es local/dev-only. No debe desplegarse publicamente ni exponerse en redes compartidas sin autenticacion, autorizacion, auditoria, rate limiting, proteccion CSRF si aplica y secret manager.

No implementar login, auth o roles salvo tarea explicita. La ausencia de auth se acepta solo para MVP local/controlado.

Los endpoints mutadores de settings, agent-builder, administracion de agentes, extension, proxy y refresh son aceptables solo en entorno local. Antes de produccion deben quedar protegidos por controles de operador.

No imprimir API keys completas. No exponer secretos completos en UI, respuestas HTTP o logs. `.env`, `data/` y `*.log` deben permanecer fuera del repositorio.

No implementar reinicio desde UI/API. Si un cambio requiere reinicio, el usuario lo hace manualmente desde terminal.
