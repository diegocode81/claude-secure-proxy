# Agent Builder AI Suggestions

## Propósito

Sugerencia IA ayuda a completar la definición inicial de un agente QA desde `/agent-builder`.

La sugerencia propone contenido gobernado para que el usuario lo revise antes de crear el agente.

## Qué hace

El botón Sugerencia IA envía al backend el nombre, ID técnico, descripción y rol opcional del agente.

El backend pide al LLM configurado una propuesta estructurada en JSON.

Si la respuesta cumple el contrato esperado, la UI llena los campos del formulario.

## Datos enviados al LLM

- Nombre del agente.
- ID del agente.
- Descripción.
- Rol opcional si el usuario lo escribió.
- Restricciones de gobernanza de la plataforma.

## Datos que no debe enviar

- API keys.
- Tokens.
- Passwords.
- Credenciales.
- Secretos.
- Datos sensibles.
- Archivos del repositorio.

## Campos que llena

- Rol QA.
- Casos de uso.
- Capacidades.
- Contrato de entrada.
- Contrato de salida.
- Skill.
- Prompt oficial.
- Contract.
- Gobernanza.
- Readiness checklist.

## Validaciones aplicadas

El backend valida input antes de llamar al LLM.

La salida del LLM debe ser JSON estricto.

La salida debe incluir `summary`, `data`, `risks`, `recommendations` y `openQuestions`.

La salida no puede proponer `execution.enabled = true`.

La salida no puede proponer `runtime-enabled`.

La salida no puede incluir secretos, API keys ni contenido sensible.

## Qué no hace

Sugerencia IA no crea archivos.

Sugerencia IA no crea carpetas.

Sugerencia IA no registra agentes.

Sugerencia IA no activa runtime.

Sugerencia IA no modifica QA Log Analyst.

## Consumo y presupuesto

Sugerencia IA llama al LLM solo desde backend.

Toda llamada exitosa registra usage.

El consumo se refleja en `/usage` y dashboard.

Si el LLM no devuelve tokens reales, se usa estimación por tamaño de texto.

Si presupuesto bloquea, no se llama LLM.

La sugerencia no crea agentes ni activa runtime.

## Errores posibles

- Input inválido.
- Presupuesto bloqueado.
- LLM no configurado.
- Respuesta del LLM no parseable como JSON.
- Respuesta del LLM fuera de contrato.
- Respuesta con contenido prohibido.

## Revisión humana

El usuario debe revisar y ajustar la sugerencia antes de crear el agente.

La creación final sigue pasando por validaciones de contrato, gobernanza y ejecución deshabilitada.
