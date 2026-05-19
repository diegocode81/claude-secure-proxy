# Plantilla Oficial de Agente QA

Esta plantilla debe usarse antes de crear cualquier agente QA nuevo en la plataforma.

La creación de agentes desde UI está fuera del alcance actual. Todo agente debe definirse por código, revisarse técnicamente y registrarse explícitamente.

## Identidad del Agente

| Campo | Valor |
|---|---|
| `agentId` | `<agent-id-en-kebab-case>` |
| Nombre | `<Nombre del agente>` |
| Estado inicial | `draft` generado automáticamente |
| Runtime inicial | `execution.enabled = false` |
| Tipo | `<agent | visual-placeholder>` |
| Responsable | `<persona/equipo>` |

## Propósito QA

Describir el propósito QA del agente:

```txt
<Qué problema QA resuelve este agente>
```

## Casos de Uso

- `<Caso de uso 1>`
- `<Caso de uso 2>`
- `<Caso de uso 3>`

## Estructura Obligatoria

Todo agente formal debe vivir en:

```txt
src/agents/<agent-id>/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
  readiness-checklist.md
```

## `profile.js`

Plantilla mínima:

```js
export const agentProfile = {
  id: '<agent-id>',
  name: '<Agent Name>',
  status: 'draft',
  statusLabel: 'Borrador',
  description: '<Descripción breve>',
  usage: '<Cómo se usará el agente>',
  navigation: {
    label: '<Agent Name>',
    path: '/<agent-id>',
    order: '<asignado automáticamente>'
  },
  io: {
    inputMode: 'text',
    outputMode: 'screen',
    responsePreset: 'qa_standard',
    outputFields: ['summary', 'data', 'risks', 'recommendations', 'openQuestions']
  },
  relatedEndpoints: [],
  execution: {
    enabled: false,
    mode: 'runtime-disabled',
    runtimeEndpoint: '/agents/<agent-id>/run',
    legacyEndpoints: []
  },
  inputContract: {
    required: [],
    requiredAnyOf: [],
    optional: [],
    disallowUnknownFields: true
  },
  outputSchema: {
    fields: []
  },
  capabilities: [],
  outputContract: [],
  governance: [
    'El agente inicia deshabilitado',
    'No debe llamar LLM sin sanitización',
    'No debe llamar LLM sin control de presupuesto',
    'No debe aceptar prompts libres desde frontend'
  ]
};
```

`inputContract` y `outputSchema` son contratos técnicos internos. La UI no debe mostrarlos como campos editables para usuarios QA funcionales. El backend los genera automáticamente desde `io`:

- `io.inputMode`: `text`, `file` o `text_and_file`.
- `io.outputMode`: `screen`, `download` o `screen_and_download`.
- `io.responsePreset`: `qa_standard`, `qa_acceptance_and_scenarios`, `executive_report`, `technical_analysis` o `custom`.
- `io.outputFields`: campos funcionales esperados en la respuesta. Si `responsePreset` no es `custom`, se resuelven automáticamente desde el preset.

`userInstructions` o `interaction.instructions` se genera automáticamente desde `io.inputMode`:

- `text`: “Ingresa la información que el agente debe analizar.”
- `file`: “Sube un archivo permitido para que el agente lo analice.”
- `text_and_file`: “Ingresa instrucciones y, si aplica, sube un archivo permitido para complementar el análisis.”

Los agentes deben definir campos esperados de salida mediante `io.outputFields` o `outputSchema.fields`. El runtime transforma esos campos en instrucciones documentales para el LLM.

La respuesta visible estándar debe ser `llmResponse` en Markdown limpio, lista para copiar y pegar. `claudeResponse` queda solo como fallback legacy. No se debe devolver JSON como salida principal para usuarios funcionales.

Todo agente nuevo debe iniciar con `execution.enabled = false`.

No se permite crear un agente nuevo con ejecución real habilitada.

No se permite activar `execution.enabled = true` en el mismo cambio donde se crea un agente.

## `skill.md`

Debe documentar:

- propósito funcional,
- capacidades,
- límites,
- datos permitidos,
- datos prohibidos,
- riesgos conocidos,
- reglas de seguridad.

## `prompt.md`

Debe documentar el prompt oficial.

Reglas:

- No debe incluir secretos.
- No debe permitir prompts libres desde frontend.
- No debe pedir saltarse sanitización.
- No debe pedir saltarse presupuesto.
- No se debe leer dinámicamente desde runtime.

## `contract.md`

Debe documentar:

- request esperado,
- response esperado,
- estados posibles,
- errores posibles,
- campos requeridos,
- campos opcionales,
- política de campos desconocidos,
- ejemplos seguros que no llamen LLM real.

## `README.md`

Debe incluir:

- estado del agente,
- objetivo,
- cómo se usa,
- rutas visuales,
- endpoints relacionados,
- restricciones,
- cómo validar cambios.

## Contrato de Entrada

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `<campo>` | `<tipo>` | `<sí/no>` | `<descripción>` |

Reglas:

- Definir campos requeridos.
- Definir campos opcionales.
- Definir si existen campos alternativos.
- Definir si se bloquean campos desconocidos.

## Contrato de Salida

| Campo | Tipo | Descripción |
|---|---|---|
| `summary` | `string` | Resumen del resultado. |
| `data` | `object` | Datos normalizados del agente. |
| `risks` | `array` | Riesgos detectados. |
| `recommendations` | `array` | Recomendaciones accionables. |
| `rawModelText` | `string` | Texto crudo del modelo si aplica. |

## Gobernanza

`governance` se genera automáticamente desde la plataforma usando reglas internas estándar. No es editable desde la UI de creación ni edición de agentes.

Antes de activar un agente:

- `execution.enabled` debe iniciar en `false`.
- Debe existir revisión humana.
- Debe existir contrato de entrada.
- Debe existir contrato de salida.
- Debe existir prompt oficial documentado.
- Debe existir skill documentado.
- Debe existir smoke test.
- Debe existir plan de rollback.
- Debe pasar por sanitización antes de LLM.
- Debe pasar por control de presupuesto antes de LLM.

## Configuración de respuesta LLM

Todo agente debe definir `llmSettings` o usar los defaults seguros del runtime:

```js
llmSettings: {
  responseDetailLevel: 'standard',
  maxOutputTokens: 1500,
  temperature: 0.2,
  budgetPolicy: {
    enforceMonthlyBudget: true,
    rejectIfEstimatedCostExceedsRemainingBudget: true
  }
}
```

Reglas:

- `responseDetailLevel`: `brief`, `standard`, `detailed` o `extensive`.
- `maxOutputTokens`: mínimo 300, máximo 8000.
- `temperature`: mínimo 0, máximo 1. Para QA se recomienda baja.
- `budgetPolicy` debe permanecer activo por defecto.

## Checklist de Preparación

`readiness-checklist.md` se genera automáticamente desde backend con un checklist estándar. No se solicita al usuario durante la creación.

- [ ] Propósito QA definido.
- [ ] Casos de uso definidos.
- [ ] Riesgos identificados.
- [ ] Estructura obligatoria creada.
- [ ] `profile.js` completo.
- [ ] `skill.md` completo.
- [ ] `prompt.md` completo.
- [ ] `contract.md` completo.
- [ ] `README.md` completo.
- [ ] `readiness-checklist.md` creado.
- [ ] Registro en `src/agents/registry.js` revisado.
- [ ] `outputSchema` definido.
- [ ] `execution.enabled = false` confirmado.
- [ ] Validación de input definida.
- [ ] Smoke tests definidos.
- [ ] Tests automáticos definidos.
- [ ] Plan de rollback definido.
- [ ] Revisión humana completada.

## Restricciones

- No crear agentes dinámicos desde UI.
- No crear endpoints de agente sin contrato.
- No activar runtime sin aprobación.
- No llamar LLM sin sanitización.
- No llamar LLM sin control de presupuesto.
- No modificar endpoints legacy sin plan de migración.

## Estados permitidos

Los estados permitidos para un agente son:

- `planned`
- `draft`
- `review`
- `active`
- `disabled`
- `deprecated`

## Modos de ejecución permitidos

Los modos de ejecución permitidos son:

- `legacy`
- `runtime-disabled`
- `runtime-enabled`
