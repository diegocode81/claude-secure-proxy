# Shared Agent Runtime

## Propósito

Base técnica común para futuros agentes QA. Este runtime define el flujo estándar:

```txt
validar entrada
  -> construir prompt controlado
  -> sanitizar texto
  -> bloquear si hay contenido sensible crítico
  -> controlar presupuesto
  -> llamar LLM
  -> registrar uso
  -> normalizar respuesta
```

## Estado actual

Preparado, pero no conectado a endpoints existentes.

No se usa todavía en:

- `POST /analyze-error`
- `POST /analyze-error-context`
- Extensión VS Code

## Contrato mínimo de un agente runtime

```js
const agent = {
  id: 'agent-id',
  validateInput(input) {
    return input;
  },
  buildPrompt(input) {
    return {
      instruction: 'Prompt controlado',
      text: 'Contenido validado'
    };
  },
  normalizeResponse(claudeResult) {
    return {
      claudeResponse: claudeResult.text
    };
  }
};
```

## Reglas

- No leer `prompt.md` dinámicamente desde runtime.
- No aceptar prompts libres desde frontend.
- No duplicar sanitización ni presupuesto dentro de cada agente.
- Toda llamada a LLM debe pasar por `runAgent`.
- Los endpoints actuales no deben migrarse a este runtime sin una tarea explícita de compatibilidad.
