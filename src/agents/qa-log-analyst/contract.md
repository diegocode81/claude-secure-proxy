# QA Log Analyst Contract

## Endpoints actuales

### `POST /analyze-error`

Request actual:

```json
{
  "text": "string requerido",
  "context": "string opcional",
  "technology": "string opcional"
}
```

Response actual cuando se envía a Claude:

```json
{
  "mode": "error-analysis",
  "status": "ALLOWED | SANITIZED",
  "risk": "LOW | MEDIUM",
  "findings": [],
  "sentToClaude": true,
  "context": "string",
  "technology": "string",
  "claudeResponse": "string"
}
```

### `POST /analyze-error-context`

Request actual:

```json
{
  "errorText": "string requerido",
  "context": "string opcional",
  "technology": "string opcional",
  "workspaceContext": [
    {
      "filePath": "string",
      "language": "string",
      "reason": "string",
      "snippet": "string"
    }
  ]
}
```

Response actual cuando se envía a Claude:

```json
{
  "mode": "error-context-analysis",
  "status": "ALLOWED | SANITIZED",
  "risk": "LOW | MEDIUM",
  "findings": [],
  "sentToClaude": true,
  "context": "string",
  "technology": "string",
  "filesReceived": 0,
  "claudeResponse": "string"
}
```

## Estados compartidos

- `BLOCKED`: contenido sensible crítico detectado; no se envía a Claude.
- `SANITIZED`: contenido redactado antes de enviar a Claude.
- `ALLOWED`: contenido permitido sin redacción.
- `BUDGET_EXCEEDED`: presupuesto mensual agotado; no se envía a Claude.

## Compatibilidad

Este contrato documenta el comportamiento actual. No cambiar los nombres de campos ni las rutas sin versionar nuevos endpoints.

## Contrato futuro del runtime genérico

`POST /agents/qa-log-analyst/run` espera una entrada normalizada:

```json
{
  "input": {
    "errorText": "string opcional, alternativo con logText",
    "logText": "string opcional, alternativo con errorText",
    "technology": "string opcional",
    "context": "string opcional",
    "workspaceContext": []
  }
}
```

Reglas preparadas:

- `input` debe ser un objeto.
- Al menos uno de `errorText` o `logText` debe venir con contenido.
- `technology`, `context` y `workspaceContext` son opcionales.
- La ausencia de campos opcionales no genera warnings.
- Los campos no declarados se bloquean como `AGENT_INPUT_INVALID`.

Estado actual: el runtime genérico valida esta estructura, pero no ejecuta Claude porque `execution.enabled` está en `false`.
