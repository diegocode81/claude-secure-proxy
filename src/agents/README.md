# QA Agent Module Standard

## Propósito

Esta carpeta contiene los módulos/agentes QA formales de la plataforma. Cada agente debe estar aislado por carpeta y registrado en `src/agents/registry.js`.

## Registro central

`registry.js` es el índice central de agentes disponibles y de navegación de módulos visuales. Por ahora el registro de agentes solo incluye:

- `qa-log-analyst`

No se deben agregar agentes futuros al registro hasta que exista su carpeta formal y su perfil mínimo.

Las páginas visuales que todavía no son agentes pueden registrarse en `platformModuleRegistry` con `type: 'visual-placeholder'`. Eso permite mantener navegación centralizada sin crear carpetas de agente antes de tiempo.

## Estructura obligatoria por agente

Cada módulo debe usar kebab-case para el nombre de carpeta:

```txt
src/agents/<agent-id>/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
```

El estándar completo vive en:

```txt
src/agents/shared/AGENT_STANDARD.md
```

Antes de crear un agente nuevo se debe completar:

```txt
docs/NEW_AGENT_READINESS_CHECKLIST.md
```

## Responsabilidad de cada archivo

| Archivo | Responsabilidad |
|---|---|
| `profile.js` | Fuente estructurada para UI, registro central y metadatos del agente. |
| `skill.md` | Documentación funcional del skill: propósito, capacidades y reglas. |
| `prompt.md` | Prompt oficial documentado. No implica uso runtime automático. |
| `contract.md` | Contrato actual/futuro de entrada, salida, estados y compatibilidad. |
| `README.md` | Guía corta del módulo para desarrolladores. |

## Campos mínimos de `profile.js`

```js
export const exampleProfile = {
  id: 'agent-id',
  name: 'Agent Name',
  status: 'active | planned | disabled',
  statusLabel: 'Activo | Preparado | Deshabilitado',
  description: 'Descripción corta del módulo.',
  usage: 'Cómo se usa o cómo se usará.',
  navigation: {
    label: 'Agent Name',
    path: '/agent-path',
    order: 10
  },
  relatedEndpoints: [],
  capabilities: [],
  outputContract: [],
  governance: []
};
```

## Reglas de arquitectura

- Ningún agente debe llamar a Claude sin pasar por sanitización.
- Ningún agente debe saltarse el control de presupuesto.
- No se deben leer dinámicamente archivos Markdown desde el servidor para ejecutar prompts.
- `prompt.md` documenta el prompt oficial, pero el runtime debe importar código explícito desde módulos JavaScript.
- No cambiar contratos existentes sin versionar endpoints nuevos.
- No duplicar lógica de sanitización, presupuesto o cliente Claude dentro de un agente.
- La vista visual de un agente debe usar `profile.js` como fuente estructurada.
- La navegación principal debe tomar módulos y agentes desde `src/agents/registry.js`; no hardcodear módulos dentro de las vistas.
- La creación de agentes desde UI está fuera del alcance actual.
- `/modules` es catálogo de gobierno, no consola de creación.

## Runtime compartido

El runtime común vive en:

```txt
src/agents/shared/runtime/
```

Responsabilidad:

```txt
validar entrada
  -> construir prompt controlado
  -> sanitizar
  -> controlar presupuesto
  -> llamar Claude
  -> registrar uso
  -> normalizar respuesta
```

Estado actual: preparado para futuros agentes, pero no conectado todavía a endpoints existentes.

No migrar `/analyze-error` ni `/analyze-error-context` a este runtime sin una tarea explícita de compatibilidad.

## Estado actual

| Agente | Estado | Runtime |
|---|---|---|
| `qa-log-analyst` | Activo | Usado por `/analyze-error`, `/analyze-error-context` y extensión VS Code. |
