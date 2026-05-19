# Agent Interaction Contract

## Propósito

El contrato de interacción define cómo cada agente recibe información y cómo entrega resultados. Es independiente del contrato de ejecución del runtime: aunque una pantalla acepte texto o archivos, la ejecución sigue gobernada por `execution.enabled`, sanitización y presupuesto.

La interacción define entrada/salida. `llmSettings` define tamaño y comportamiento de respuesta del LLM, incluyendo nivel de detalle, máximo de tokens, temperatura y política de presupuesto.

## Campos

| Campo | Uso |
| --- | --- |
| `inputMode` | Define el canal de entrada: `text`, `file`, `text-and-file`, `json` o `multiple-files`. |
| `acceptedInputTypes` | Lista los formatos admitidos: `text`, `json`, `csv`, `html`, `markdown` o `pdf`. |
| `outputMode` | Define la salida: `screen`, `downloadable-report`, `screen-and-download` o `json`. |
| `downloadableOutput` | Habilita descarga local del resultado desde el navegador. |
| `outputFileNamePattern` | Patrón del archivo descargable. Puede usar `<agent-id>` y `<timestamp>`. |
| `interactionInstructions` | Instrucciones visibles para el usuario en la pantalla del agente. |

## Ejemplo de agente de texto

```js
interaction: {
  inputMode: 'text',
  acceptedInputTypes: ['text'],
  outputMode: 'screen',
  downloadableOutput: false,
  outputFileNamePattern: '',
  instructions: 'Pega el requerimiento de negocio. El agente devolverá criterios de aceptación, escenarios y preguntas abiertas.'
}
```

## Ejemplo de agente con archivo

```js
interaction: {
  inputMode: 'file',
  acceptedInputTypes: ['json', 'csv', 'html'],
  outputMode: 'downloadable-report',
  downloadableOutput: true,
  outputFileNamePattern: '<agent-id>-report-<timestamp>.md',
  instructions: 'Sube un reporte en formato JSON, CSV o HTML. El agente generará un informe descargable.'
}
```

## Ejemplo QA k6

El agente QA k6 usa `inputMode: 'file'`, acepta `json`, `csv` y `html`, y genera un reporte Markdown descargable desde el navegador.

## Reglas de seguridad

Los archivos se leen en el frontend y se envían como texto al endpoint runtime del agente. En esta fase no se guardan reportes ni archivos subidos en el servidor.

El límite inicial es 2 MB por archivo. La UI debe rechazar archivos mayores antes de enviar la solicitud.

La descarga del reporte se genera localmente en el navegador con `Blob`; no crea archivos en el backend.

La ejecución sigue gobernada por `execution.enabled`. Si el agente está deshabilitado, la pantalla debe bloquear la ejecución y el runtime debe responder de forma controlada.
