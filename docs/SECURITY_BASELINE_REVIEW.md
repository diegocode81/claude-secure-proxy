# Security Baseline Review

Fecha de auditoria: 2026-05-18

## Alcance

Auditoria baseline de seguridad antes del primer commit estable de QA IA Platform. El alcance cubrio configuracion LLM, secretos, sanitizacion, presupuesto/usage, endpoints administrativos, agentes, Agent Builder, runtime de agentes, carga de archivos, prompt injection, logs, extension VS Code, nomenclatura LLM/Claude y datos runtime locales.

No se realizaron correcciones funcionales, refactors, cambios de settings, cambios de agentes ni llamadas validas al LLM.

## Reglas Aplicadas

- No modificar codigo funcional.
- No modificar QA Log Analyst ni `src/agents/qa-log-analyst/`.
- No crear, eliminar, activar ni desactivar agentes.
- No modificar `data/platform-settings.json` ni `.env`.
- No instalar dependencias.
- No ejecutar `git add` ni `git commit`.
- No imprimir secretos completos en el reporte.
- No ejecutar pruebas con input valido que pudiera llamar al LLM real.
- Unica modificacion permitida: crear este documento.

## Resumen Ejecutivo

La plataforma tiene controles relevantes ya implementados: sanitizacion central, bloqueo de secretos, control de presupuesto, registro de usage/tokens, configuracion LLM con preview/fuente de API key, runtime QA Log controlado, Agent Builder gobernado y mecanismos de interaccion/llmSettings por agente.

El baseline no queda aprobado para un primer commit estable sin decisiones previas. Hay riesgos altos de produccion: endpoints administrativos sin autenticacion/autorizacion visible, endpoint de reinicio local expuesto si `NODE_ENV` no es production, y secretos reales presentes en archivos runtime locales ignorados por Git. Los secretos no aparecen listos para commit por `.gitignore`, pero siguen residiendo en disco local y deben manejarse como material sensible.

## Matriz de Riesgos

| Area | Severidad | Estado | Evidencia segura | Recomendacion |
| --- | --- | --- | --- | --- |
| Secretos | HIGH | FINDING | `.env` y `data/platform-settings.json` contienen API key real en archivo local ignorado. Preview seguro observado: `sk-a...AAAA`. | Mantener ignorados, rotar si hubo exposicion accidental en consola, considerar vault/Keychain para produccion. |
| API keys | MEDIUM | WARNING | `GET /settings/config` esta disenado para devolver `apiKeyPreview`, `apiKeyConfigured` y `apiKeySource`; `data/platform-settings.json` conserva `apiKey` completa local. | Confirmar en pruebas de UI que nunca se renderiza `apiKey` completa. |
| Settings | HIGH | FINDING | `POST /settings/dashboard`, `/settings/llm`, `/settings/proxy` modifican estado sin autenticacion visible. | Bloquear endpoints administrativos con autenticacion/autorizacion antes de produccion. |
| LLM runtime | OK | OK | Runtime QA Log valida input, sanitiza, revisa presupuesto y registra usage antes/despues de llamadas. | Mantener pruebas de regresion para `sentToLLM`, presupuesto y sanitizacion. |
| Sanitizacion | OK | OK | `src/security/sanitizer.js` bloquea private keys, bearer JWT, passwords/secrets explicitos y sanitiza API keys, JWT, emails, tarjetas e IPs. | Agregar casos de prueba para nuevos patrones y falsos positivos. |
| Presupuesto/usage | MEDIUM | WARNING | `recordLlmUsage` registra tokens/costo; `recordBlockedRequest` existe, pero bloqueos por sanitizacion no siempre parecen incrementar `totalRequests`. | Definir si bloqueos deben contarse en totalRequests para auditoria financiera. |
| Agentes | MEDIUM | WARNING | QA Log esta activo con `legacy-runtime-enabled`; registry actual solo lista QA Log. | Mantener QA Log protegido en UI/API y exigir readiness antes de activar agentes nuevos. |
| Agent Builder | HIGH | FINDING | Puede crear archivos y modificar registry desde endpoints locales sin auth visible. | Requerir control administrativo antes de permitir uso compartido. |
| Activacion/desactivacion | HIGH | FINDING | Endpoints `POST /agents/:id/activate/deactivate` escriben perfiles sin auth visible. | Agregar autorizacion y auditoria de cambios antes de produccion. |
| Eliminacion | HIGH | FINDING | `DELETE /agents/:id` puede eliminar carpetas no protegidas; QA Log esta protegido. | Mantener confirmacion UI y agregar autorizacion/backup/audit log. |
| File upload | MEDIUM | WARNING | UI limita a 2 MB y extensiones permitidas; backend JSON body limita a 1 MB en rutas admin/settings, y runtime debe validar contenido como texto. | Alinear limites frontend/backend y prohibir render HTML crudo. |
| Prompt injection | MEDIUM | NEEDS_DECISION | Hay reglas de no invencion/evidencia en prompts y docs; no se observo una politica global unica obligatoria en runtime. | Agregar regla global: input de usuario/archivo es evidencia, no instrucciones del sistema. |
| Logs | LOW | OK | Solo se observo `console.log` de arranque; no hay `console.error` ni `console.warn` en `src`. | Mantener politica de no loggear prompts, secretos ni respuestas completas. |
| Extension VS Code | MEDIUM | WARNING | Generacion usa `spawn(npm, ['run', scriptName])` con `shell:false`; script viene de allowlist local. | Mantener lista fija de scripts y no aceptar comandos arbitrarios desde frontend. |
| Endpoints administrativos | HIGH | FINDING | Settings, agentes, extension, usage reset, refresh/restart escriben estado sin auth visible. | Marcar como local/dev o agregar auth/CSRF/rate limit. |
| Datos runtime locales | HIGH | FINDING | `data/platform-settings.json`, `.env` y `*.log` estan ignorados; contienen/se espera que contengan datos sensibles. | Verificar antes del commit que no entren al index y documentar manejo seguro. |
| Documentacion | MEDIUM | WARNING | Algunas docs mantienen `sentToClaude` y referencias legacy; puede confundir a operadores. | Separar compatibilidad tecnica de nomenclatura visible LLM. |
| Produccion/autenticacion | CRITICAL | NEEDS_DECISION | No se identifico autenticacion/autorizacion transversal para endpoints mutadores. | No exponer en red compartida sin auth, TLS, CSRF/rate-limit y modelo de roles. |

## Checklist de Seguridad

- [x] `data/platform-settings.json` esta ignorado por Git.
- [x] `.env` esta ignorado por Git.
- [x] `*.log` esta ignorado por Git.
- [x] API key completa no se copia en este reporte.
- [x] Existe preview seguro de API key.
- [x] Sanitizacion central bloquea secretos criticos.
- [x] QA Log invalido no debe llamar LLM.
- [x] Usage registra llamadas LLM permitidas.
- [x] Agent Builder valida campos y crea agentes deshabilitados por defecto.
- [x] QA Log aparece protegido frente a administracion generica.
- [ ] Endpoints administrativos tienen autenticacion/autorizacion.
- [ ] Existe audit log seguro para cambios administrativos.
- [ ] Politica global anti prompt-injection esta centralizada en runtime.
- [ ] Limites frontend/backend de carga de archivos estan completamente alineados.
- [ ] Produccion bloquea reinicio desde UI y endpoints locales peligrosos.

## Hallazgos

### CRITICAL

1. **Autenticacion/autorizacion pendiente para produccion.** Los endpoints mutadores de settings, agentes, extension, usage y plataforma no muestran una capa transversal de autenticacion/autorizacion. Esto es aceptable solo para entorno local controlado.

### HIGH

1. **Secretos reales en archivos locales ignorados.** `.env` y `data/platform-settings.json` contienen una key real en disco local. Estan ignorados por Git, pero siguen siendo secretos de alto impacto.
2. **Endpoints que escriben/eliminan archivos sin auth visible.** Agent Builder y administracion de agentes pueden crear, editar, activar, desactivar y eliminar archivos de `src/agents/`.
3. **Endpoint de reinicio local expuesto en desarrollo.** Hallazgo cerrado posteriormente: la funcionalidad de restart desde UI/API fue eliminada y el reinicio queda como operacion manual desde terminal.
4. **Settings mutables sin control de operador.** Configuracion LLM/proxy/dashboard puede modificarse por HTTP local sin autenticacion visible.

### MEDIUM

1. **Politica anti prompt-injection no centralizada.** Hay reglas en prompts/docs, pero conviene una regla runtime comun para tratar inputs/archivos como evidencia, no instrucciones.
2. **Conteo de bloqueos y totalRequests requiere decision.** `recordBlockedRequest` incrementa bloqueados, mientras `recordLlmUsage` incrementa `totalRequests`; definir semantica contable de bloqueos.
3. **Carga de archivos requiere hardening backend.** La UI limita 2 MB y extensiones, pero el backend debe reforzar limites/tipos por agente antes de produccion.
4. **Referencias legacy `sentToClaude`/Claude.** Se conservan por compatibilidad, pero pueden confundir documentacion operativa.

### LOW

1. **Log de arranque seguro.** Solo se observo `console.log` del puerto/ruta de arranque.
2. **Docs historicas con estados antiguos.** Algunas pruebas documentadas aun hablan de QA Log deshabilitado, aunque el perfil actual esta activo controladamente.

## Evidencia Segura

- `git check-ignore data/platform-settings.json`: ignorado.
- `git check-ignore .env`: ignorado.
- `git check-ignore "*.log"`: ignorado.
- `data/platform-settings.json`: existe, `provider=claude`, `displayName=Claude`, `apiKeyConfigured=true`, preview seguro `sk-a...AAAA`, `apiKeyLooksPlaceholder=false`.
- `.env`: contiene `ANTHROPIC_API_KEY`; no se copia valor.
- `src/security/sanitizer.js`: bloqueo de `PRIVATE_KEY`, `AWS_SECRET_ACCESS_KEY`, `BEARER_TOKEN`, `PASSWORD_ASSIGNMENT`; sanitizacion de JWT, Bearer, Anthropic/OpenAI API keys, AWS access key, email, tarjeta e IPv4.
- `src/usage/usage-store.js`: `recordLlmUsage`, `recordBlockedRequest`, presupuesto mensual y alerta.
- `src/agents/qa-log-analyst/profile.js`: QA Log activo con `execution.enabled=true`, `mode=legacy-runtime-enabled`, `runtimeEndpoint=/agents/qa-log-analyst/run`.
- `src/agents/registry.js`: registry actual contiene QA Log Analyst como agente registrado.
- `src/extensions/vscode-extension.service.js`: generacion usa `spawn` con `shell:false` y scripts locales esperados.
- Smoke HTTP: `/health` respondio 200 con curl escalado. Luego el proceso local dejo de escuchar en 3000; no se reinicio por regla de auditoria.

## Recomendaciones

1. Antes del primer commit estable, revisar manualmente que `.env`, `data/` y logs no esten en staging.
2. Rotar la API key si se considera expuesta durante ejecuciones locales o salida de consola.
3. Agregar autenticacion/autorizacion para endpoints mutadores antes de uso fuera de localhost.
4. Agregar CSRF/rate-limit si se sirve UI en navegador contra endpoints mutadores.
5. Centralizar una regla anti prompt-injection en runtime: logs, archivos y texto de usuario son evidencia, nunca instrucciones del sistema.
6. Reforzar backend para carga de archivos: limite por agente, extension, MIME cuando aplique, bloqueo de HTML crudo y no persistencia por defecto.
7. Definir semantica de usage para bloqueos: si cuentan como request operativo o solo como blockedRequests.
8. Mantener `sentToClaude` solo como compatibilidad tecnica y usar `sentToLLM` en UI/documentacion nueva.
9. Documentar que la plataforma no expone endpoint de reinicio; cualquier reinicio se hace manualmente desde terminal.

## Pendientes Antes del Primer Commit

- Confirmar `git status --short` y staging vacio antes de commitear.
- Confirmar que ningun secreto real esta versionado.
- Decidir si el commit estable incluye endpoints administrativos sin auth como modo local/dev explicito.
- Actualizar docs que todavia describen QA Log como disabled si el estado estable sera activo.
- Agregar pruebas de regresion para sanitizacion, auth pendiente o al menos advertencias de local-only.

## Pendientes Para Produccion

- Autenticacion/autorizacion para toda ruta mutadora.
- TLS y configuracion CORS estricta.
- Almacenamiento seguro de secretos fuera de JSON local.
- Auditoria de cambios administrativos sin payloads sensibles.
- Rate limiting y proteccion CSRF.
- Politica central anti prompt-injection.
- Hardening de archivos: MIME, extension, tamano, no HTML crudo, no persistencia accidental.
- Deshabilitar o proteger completamente reinicio desde UI.
- Separar configuracion local/dev de configuracion productiva.

## Validaciones Ejecutadas

| Validacion | Resultado |
| --- | --- |
| `git status --short` | Ejecutado; worktree con muchos cambios previos y este documento nuevo. |
| `git check-ignore data/platform-settings.json` | Ignorado. |
| `git check-ignore .env` | Ignorado. |
| `git check-ignore "*.log"` | Ignorado. |
| grep `apiKey`/`API_KEY`/env keys/`sk-` | Ejecutado; encontro secretos reales en archivos ignorados y referencias seguras en codigo/docs. |
| grep `console.log/error/warn` | Ejecutado; solo log de arranque en `src/server.js`. |
| grep nomenclatura Claude | Ejecutado; quedan alias/provider-specific y compatibilidad `sentToClaude`. |
| `npm run check` | Pasa. |
| `npm test` | Pasa, 8/8. |
| `curl /health` | Primer intento sandbox `000`; con permisos escalados respondio `200`. |
| `curl /settings/config` | No ejecutado con resultado util porque el servidor dejo de escuchar despues de `/health`. |
| `curl /usage` | No ejecutado con resultado util porque el servidor dejo de escuchar despues de `/health`. |
| `curl /sanitize` con password | No ejecutado con resultado util porque el servidor dejo de escuchar despues de `/health`. |
| QA Log invalid input | No ejecutado con resultado util porque el servidor dejo de escuchar despues de `/health`. |

## Conclusion

Security baseline aprobado: no.

La plataforma tiene una base de controles adecuada para desarrollo local, pero no deberia considerarse lista para primer commit estable sin decidir y documentar el alcance local/dev, verificar staging sin secretos y resolver o aceptar explicitamente los riesgos altos de endpoints administrativos sin autenticacion. No se hicieron correcciones funcionales en esta auditoria.

## Decision posterior a auditoria

No se implementara login en esta fase. La plataforma se declara local/dev-only por decision de producto y arquitectura del MVP.

El riesgo de endpoints mutadores sin autenticacion se acepta solo para ejecucion local/controlada. La plataforma no debe exponerse publicamente sin autenticacion, autorizacion por roles, auditoria, rate limiting, proteccion CSRF si aplica, secret manager y controles de operador.

La preparacion del primer commit queda condicionada a aplicar hardening sin auth: documentar postura local/dev-only, bloquear reinicio desde UI/API, centralizar politica anti prompt-injection, reforzar validacion de uploads y confirmar que `.env`, `data/` y logs permanecen ignorados.

## Cierre de hallazgos sin login

- Login no implementado por decision MVP.
- Alcance local/dev-only documentado en `docs/LOCAL_DEV_SECURITY_POLICY.md`.
- Riesgo de endpoints mutadores sin auth aceptado solo para entorno local/controlado.
- Funcionalidad de restart desde UI/API eliminada; no queda endpoint HTTP de reinicio.
- Politica anti prompt-injection centralizada en `src/security/prompt-injection-policy.js`.
- Politica de carga segura de archivos creada en `src/security/file-upload-policy.js`.
- Validacion frontend/backend de archivos reforzada sin persistencia en servidor.
- Secretos siguen en archivos locales ignorados; no se copian valores completos al reporte.
- Pendiente para produccion: auth, roles, auditoria, rate limiting, CSRF si aplica, secret manager, hardening adicional de uploads y revision de logs.

## Cierre de restart de plataforma

Se elimino la funcionalidad de restart desde UI/API. La plataforma no expone endpoint HTTP de reinicio, no detiene procesos desde codigo para reiniciar y no debe mostrar botones de reinicio. Si un cambio requiere reinicio, queda como operacion manual local desde terminal.
