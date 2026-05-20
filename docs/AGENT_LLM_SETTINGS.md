# Agent LLM Settings

## Propósito

`llmSettings` define límites de respuesta y consumo por agente. Esta configuración permite ajustar detalle, tokens máximos, temperatura y política de presupuesto sin cambiar la lógica global del runtime.

## Campos

| Campo | Uso |
| --- | --- |
| `responseDetailLevel` | Nivel de detalle: `brief`, `standard`, `detailed`, `extensive`. |
| `maxOutputTokens` | Máximo de tokens de salida permitidos para la respuesta del LLM. |
| `temperature` | Variación de la respuesta. Para QA se recomienda entre `0.1` y `0.3`. |
| `budgetPolicy.enforceMonthlyBudget` | Mantiene el control de presupuesto mensual activo. |
| `budgetPolicy.rejectIfEstimatedCostExceedsRemainingBudget` | Bloquea ejecuciones si el presupuesto no permite el consumo estimado. |

## Defaults

```js
llmSettings: {
  responseDetailLevel: 'extensive',
  maxOutputTokens: 5000,
  temperature: 0.1,
  budgetPolicy: {
    enforceMonthlyBudget: true,
    rejectIfEstimatedCostExceedsRemainingBudget: true
  }
}
```

## Límites

`maxOutputTokens` debe estar entre 300 y 8000.

`temperature` debe estar entre 0 y 1.

## Recomendaciones por agente

| Tipo de agente | Nivel | Tokens sugeridos | Temperatura |
| --- | --- | --- | --- |
| Validación rápida | `brief` | 800 | 0.1 |
| Análisis QA normal | `standard` | 1500 | 0.2 |
| Requerimientos o casos de prueba | `detailed` | 2500-3000 | 0.2 |
| Reportes gerenciales o performance/k6 | `detailed` | 3000 | 0.2 |
| Análisis documental extenso | `extensive` | 5000 | 0.1-0.2 |

Los agentes nuevos creados desde UI usan por defecto `extensive`, `5000` tokens y temperatura `0.1` para priorizar calidad. El usuario puede bajar estos valores si necesita reducir consumo.

## Ejemplo QA Log

QA Log Analyst usa `standard`, `1500` tokens y temperatura `0.2` para mantener respuestas útiles y controladas.

## Ejemplo QA k6

Un agente QA k6 puede usar `detailed`, `3000` tokens y temperatura `0.2` porque genera reportes gerenciales con métricas, riesgos y recomendaciones.

## Uso en runtime

El runtime normaliza `profile.llmSettings` antes de llamar al LLM. Si un agente no tiene configuración, se usan los defaults seguros.

`maxOutputTokens` se mapea al límite de salida del proveedor LLM. `temperature` se envía al cliente cuando el proveedor lo soporta.

## Presupuesto

`budgetPolicy` no reemplaza el dashboard de presupuesto. El runtime sigue usando el control mensual global y registra tokens/uso en el dashboard.
