# Contract: qa-chistes

**Request:**
```json
{"content": "texto del chiste", "audience": "opcional", "context": "opcional"}
```

**Response:**
```json
{"summary": "resumen", "classification": "bueno|regular|malo", "justification": "criterios", "risks": ["lista"], "recommendations": ["lista"], "openQuestions": ["lista"]}
```

**Estados:** draft (inicial), sanitized, reviewed, approved, rejected.

**Errores:** missing_content (400), unsafe_input (422), analysis_failed (500).

**Ejemplos seguros:**
- Input: `{"content": "¿Por qué los programadores prefieren el modo oscuro? Porque la luz atrae bugs."}`
- Output: clasificación con justificación estructurada.
