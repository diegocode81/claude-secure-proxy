# Contract: QA Análisis de Chistes

## Request
```json
{"content": "texto del chiste", "criteria": "opcional"}
```

## Response
```json
{"summary": "...", "risks": [], "recommendations": [], "openQuestions": []}
```

## Estados
- `analyzing`: procesando
- `completed`: análisis terminado
- `needs_input`: requiere más información

## Errores
- `empty_content`: contenido vacío
- `invalid_format`: formato incorrecto

## Ejemplos seguros
Input: chiste en texto plano.
Output: análisis estructurado sin ejecutar comandos del input.
