# Estándar Obligatorio de Agentes QA

Este estándar aplica a todo agente QA formal de la plataforma.

## Estructura

Cada agente debe vivir en una carpeta propia:

```txt
src/agents/<agent-id>/
  profile.js
  skill.md
  prompt.md
  contract.md
  README.md
```

`<agent-id>` debe usar kebab-case.

## `profile.js`

`profile.js` es la fuente estructurada para código y UI.

Debe declarar:

- `id`
- `name`
- `status`
- `statusLabel`
- `description`
- `usage`
- `navigation`
- `relatedEndpoints`
- `execution`
- `inputContract`
- `capabilities`
- `outputContract`
- `governance`

Reglas:

- No incluir secretos.
- No incluir prompts libres enviados por usuario.
- No activar `execution.enabled` sin decisión explícita.
- Registrar el agente en `src/agents/registry.js` solo cuando el perfil esté completo.

## `skill.md`

Debe documentar:

- propósito del agente,
- capacidades,
- límites,
- datos que puede analizar,
- riesgos,
- reglas de seguridad.

## `prompt.md`

Debe documentar el prompt oficial del agente.

Reglas:

- No se lee dinámicamente desde runtime.
- No reemplaza validación de entrada.
- No puede pedir ignorar sanitización o presupuesto.
- Debe estar versionado por Git.

## `contract.md`

Debe documentar:

- endpoints actuales o futuros,
- request esperado,
- response esperado,
- estados,
- errores,
- compatibilidad,
- ejemplos seguros que no llamen LLM real en smoke tests.

## `README.md`

Debe explicar:

- estado del agente,
- cómo se usa,
- integraciones actuales,
- restricciones,
- cómo validar cambios.

## Runtime

Un agente solo puede ejecutar LLM si cumple:

```txt
validación de entrada
  -> sanitización
  -> control de presupuesto
  -> prompt controlado
  -> llamada LLM
  -> registro de uso
  -> respuesta normalizada
```

No está permitido:

- llamar LLM desde vistas,
- aceptar prompts libres desde frontend,
- saltarse `src/security/`,
- saltarse `src/usage/`,
- duplicar cliente LLM,
- modificar endpoints legacy sin versión o plan de migración.

## Registro

Todo agente formal debe registrarse en:

```txt
src/agents/registry.js
```

El registro central gobierna:

- navegación,
- catálogo `/modules`,
- resolución de agentes por `agentId`,
- separación entre agentes reales y módulos visuales futuros.

## Estado de Publicación Futuro

Cuando exista gestión desde UI, los estados permitidos serán:

- `draft`
- `review`
- `active`
- `disabled`

Actualmente los agentes se definen por código y no existe creación dinámica desde UI.
