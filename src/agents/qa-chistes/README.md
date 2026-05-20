# qa chistes

## Propósito

analizar el chiste contando y generar el informe

## Casos de uso

- Validar que un chiste cumple con estructura narrativa básica (setup, punchline, coherencia)
- Analizar comprensibilidad del contenido humorístico para audiencias objetivo
- Identificar riesgos de ambigüedad, ofensividad o falta de contexto cultural
- Generar informe QA estructurado sobre calidad funcional del chiste
- Detectar dependencias de contexto no explícitas que afecten comprensión

## Estado

draft

## Ruta visual

`/qa-chistes`

## Endpoint runtime

`/agents/qa-chistes/run`

## Ejecución

La ejecución real está deshabilitada:

```js
execution: {
  enabled: false,
  mode: 'runtime-disabled'
}
```

## Archivos del agente

- profile.js
- skill.md
- prompt.md
- contract.md
- README.md
- readiness-checklist.md

## Validaciones pendientes

- Sanitización.
- Control de presupuesto.
- Smoke tests.
- Revisión humana.
- Plan de rollback.
