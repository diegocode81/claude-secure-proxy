# Agent Creation From UI

## Propósito

La pantalla `/agent-builder` permite crear la estructura base de agentes QA desde el frontend de forma gobernada.

La creación no llama LLM y no activa runtime real.

## Campos del formulario

- Nombre del agente.
- ID del agente en kebab-case.
- Descripción.
- Rol QA.
- Skill.
- Prompt oficial.
- Modo de entrada.
- Tipo de salida.
- Tipo de respuesta esperada.
- Capacidades.

No se muestran campos de gobernanza interna en creación.

No se muestran contratos técnicos JSON en creación, edición ni detalle. El usuario QA funcional define entrada y salida con campos simples, y la plataforma genera internamente `inputContract` y `outputSchema`.

La plataforma genera automáticamente:

- Reglas `governance` estándar impuestas por la plataforma.
- `readiness-checklist.md` con checklist estándar.
- `status: draft`.
- `statusLabel: Borrador`.
- `navigation.order` al final de la lista de agentes.
- instrucciones de uso desde `io.inputMode`.
- `outputFields` desde `io.responsePreset`.
- `inputContract` desde `io.inputMode`.
- `outputSchema` desde los `outputFields` resueltos.

## Entrada y salida del agente

El formulario muestra una sección funcional:

- Modo de entrada: texto, archivo o texto + archivo.
- Tipo de salida: mostrar en pantalla, descargar archivo o ambas.
- Tipo de respuesta esperada: análisis estándar QA, criterios y escenarios QA, informe gerencial, análisis técnico o personalizado.

Solo la opción Personalizado muestra opciones avanzadas de salida. El backend guarda una estructura `io` en `profile.js`, genera instrucciones de uso y genera los contratos técnicos internos a partir de ella. El frontend no debe enviar contratos JSON editables ni instrucciones internas editables.

La pantalla de detalle/uso del agente no muestra esta metadata de configuración. Solo debe presentar la instrucción funcional, los campos necesarios para enviar entrada, el botón de ejecución, loader y resultado.

## Validaciones

- El ID debe ser kebab-case.
- No se permite path traversal.
- No se permite sobrescribir agentes existentes.
- No se permite sobrescribir `qa-log-analyst`.
- No se permite crear agentes con estado `active`.
- No se permite enviar campos desconocidos.
- El usuario no configura estado, etiqueta, orden ni checklist.
- El usuario no configura `inputContract` ni `outputSchema` directamente.
- `execution.enabled` siempre se fuerza a `false`.
- `execution.mode` siempre se fuerza a `runtime-disabled`.

## Estructura generada

Cada agente se crea en:

```txt
src/agents/<agent-id>/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
  readiness-checklist.md
```

## Seguridad

El frontend no envía rutas ni nombres de archivos.

El backend escribe únicamente dentro de `src/agents/<agent-id>/`.

La creación no acepta configuración de ejecución real y no llama proveedores LLM.

## Por qué `execution.enabled` siempre es `false`

Todo agente nuevo debe pasar por checklist, pruebas, sanitización, control de presupuesto, revisión humana y plan de rollback antes de activar ejecución real.

## Por qué no se llama LLM al crear

Crear un agente es una operación de estructura, documentación y registro. La ejecución LLM pertenece al runtime común y requiere gobernanza adicional.

## Visibilidad en la plataforma

Después de crearse, el agente:

- Se registra en `src/agents/registry.js`.
- Aparece en navegación.
- Aparece en `/modules`.
- Tiene una ruta visual propia.
- Responde en el runtime genérico con ejecución deshabilitada.

## Revisión antes de activar

Antes de activar un agente se debe revisar:

- Contrato de entrada.
- Contrato de salida.
- Configuración funcional `io`.
- Prompt.
- Skill.
- Sanitización.
- Control de presupuesto.
- Smoke tests.
- Plan de rollback.

## Salida documental en pantalla

El usuario define qué espera recibir mediante el tipo de respuesta esperada.

La plataforma convierte esos campos en secciones documentales para el runtime. Por ejemplo:

- `acceptanceCriteria` se muestra como “Criterios de aceptación”.
- `testScenarios` se muestra como “Escenarios de prueba”.
- `risks` se muestra como “Riesgos identificados”.
- `recommendations` se muestra como “Recomendaciones”.
- `executiveReport` se muestra como “Informe gerencial”.

Cuando el modo de salida es pantalla, el agente debe responder en Markdown limpio, listo para copiar y pegar en un documento QA.

Si la solicitud no trae contexto suficiente para entregar una respuesta confiable, el agente debe preguntar primero. En ese caso debe mostrar una sección “Necesito más información” o “Preguntas abiertas” con máximo 5 preguntas concretas y accionables, y puede agregar un “Análisis preliminar” breve.

La respuesta completa se genera cuando el usuario entrega el contexto faltante. La sección “Preguntas abiertas” no debe contener textos genéricos de información insuficiente; debe contener preguntas reales o no mostrarse.

Cuando el agente está preguntando primero, la salida visible no debe mostrar secciones vacías ni placeholders de informe, criterios, escenarios, riesgos o recomendaciones.

El JSON técnico queda solo para diagnóstico en la respuesta técnica colapsada. No debe ser la salida principal para usuarios funcionales.

## Estados de procesamiento

Sugerencia IA, creación y ejecución de agentes muestran estado de procesamiento para evitar doble envío y mejorar experiencia.

Los botones quedan deshabilitados mientras la plataforma espera respuesta del backend o del LLM. Al terminar, se restaura el texto original y se muestra resultado o error funcional.

## Sugerencia IA de alta calidad

Sugerencia IA genera una definición inicial robusta para agentes QA especialistas.

Debe priorizar precisión, trazabilidad, seguridad, manejo de incertidumbre, contratos claros y utilidad real sobre brevedad.

La sugerencia puede producir `skill`, `prompt` y `contract` más extensos cuando eso mejore la calidad del agente. Aun así, la sugerencia no crea archivos, no activa runtime y debe ser revisada por el usuario antes de crear el agente.

## Defaults de calidad

La plataforma prioriza calidad de respuesta por defecto en agentes nuevos.

Nuevos agentes usan `Extenso`, `5000` tokens máximos y precisión `Precisa` para mejorar completitud, trazabilidad y consistencia. El usuario puede bajar estos valores si necesita reducir consumo.

El campo de capacidades inicia con una lista robusta orientada a agentes QA especialistas. Si Sugerencia IA entrega capacidades válidas, se respetan; si faltan o son demasiado débiles, la plataforma completa con defaults QA.

## Artefactos internos generados

El usuario no necesita editar `skillMarkdown`, `promptMarkdown`, `contractMarkdown` ni `readinessChecklistMarkdown`.

La plataforma genera automáticamente esos artefactos con plantillas seguras y gobernadas. Si Sugerencia IA no devuelve contenido válido para esos campos, se usan defaults internos.

La creación desde UI no debe fallar por artefactos internos vacíos o demasiado cortos. Solo se bloquea contenido peligroso, secretos o instrucciones explícitas para saltar gobierno, activar runtime o modificar la plataforma.
