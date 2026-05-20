# qa chistes Contract

## Entrada esperada

El usuario debe entregar información compatible con el modo de entrada `text`.

## Entrada mínima

La entrada debe contener información suficiente para que el agente pueda analizar el objetivo QA. Si falta contexto crítico, el agente debe solicitar aclaraciones antes de generar una respuesta completa.

## Request

```json
{
  "input": {
  "required": [
    "text"
  ],
  "requiredAnyOf": [],
  "optional": [
    "context"
  ],
  "disallowUnknownFields": true,
  "fields": {
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 60000
    },
    "context": {
      "type": "string",
      "required": false,
      "maxLength": 20000
    }
  }
}
}
```

## Salida esperada

```json
{
  "fields": [
    "summary",
    "data",
    "risks",
    "recommendations",
    "openQuestions"
  ]
}
```

## Estados

- AGENT_EXECUTION_DISABLED
- AGENT_INPUT_INVALID
- AGENT_RUN_BLOCKED
- AGENT_RUN_BUDGET_BLOCKED
- AGENT_RUN_COMPLETED
- LLM_AUTHENTICATION_ERROR

## Errores

- Input inválido.
- Campos desconocidos.
- Ejecución deshabilitada.
- Bloqueo por sanitización o secreto.
- Bloqueo por presupuesto.
- Error controlado del proveedor LLM.

## Validaciones

- No aceptar campos desconocidos cuando el contrato lo indique.
- No llamar LLM si falla validación, sanitización o presupuesto.
- Registrar usage/tokens si se realiza llamada LLM.

## Ejemplos seguros

- Entrada segura 1: texto funcional con contexto, objetivo y restricciones.
- Entrada segura 2: evidencia técnica sin secretos y con descripción del problema.
- Entrada insuficiente: solicitud ambigua sin audiencia, objetivo, evidencia ni salida esperada; el agente debe preguntar primero.
