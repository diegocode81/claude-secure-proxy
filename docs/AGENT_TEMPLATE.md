# Plantilla Oficial de Agente QA

Esta plantilla debe usarse antes de crear cualquier agente QA nuevo en la plataforma.

La creación de agentes desde UI está fuera del alcance actual. Todo agente debe definirse por código, revisarse técnicamente y registrarse explícitamente.

## Identidad del Agente

| Campo | Valor |
|---|---|
| `agentId` | `<agent-id-en-kebab-case>` |
| Nombre | `<Nombre del agente>` |
| Estado inicial | `draft` |
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
    order: 100
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
    'No debe llamar Claude sin sanitización',
    'No debe llamar Claude sin control de presupuesto',
    'No debe aceptar prompts libres desde frontend'
  ]
};
```

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
- ejemplos seguros que no llamen Claude real.

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

Antes de activar un agente:

- `execution.enabled` debe iniciar en `false`.
- Debe existir revisión humana.
- Debe existir contrato de entrada.
- Debe existir contrato de salida.
- Debe existir prompt oficial documentado.
- Debe existir skill documentado.
- Debe existir smoke test.
- Debe existir plan de rollback.
- Debe pasar por sanitización antes de Claude.
- Debe pasar por control de presupuesto antes de Claude.

## Checklist de Preparación

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
- No llamar Claude sin sanitización.
- No llamar Claude sin control de presupuesto.
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
