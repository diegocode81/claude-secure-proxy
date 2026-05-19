# QA pruebas

## Propósito

Analizar los chistes que se escriben

## Casos de uso

- Validar estructura y coherencia de chistes escritos
- Analizar calidad de contenido humorístico según criterios definidos
- Generar criterios de aceptación para contenido cómico
- Identificar riesgos de calidad en chistes (ofensivos, incoherentes, incompletos)

## Estado

draft

## Ruta visual

`/qa-pruebas`

## Endpoint runtime

`/agents/qa-pruebas/run`

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
