# qa.chistes

## Propósito

Abnaliza si un chiste es bueno malo o regular y dame un informe

## Casos de uso

- Evaluar calidad de chistes para contenido corporativo o campañas de marketing
- Analizar riesgos de comunicación (ofensivo, inapropiado, ambiguo) en contenido humorístico
- Validar alineación de humor con audiencia objetivo y contexto organizacional
- Generar reportes de calidad con recomendaciones de mejora para contenido humorístico

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
