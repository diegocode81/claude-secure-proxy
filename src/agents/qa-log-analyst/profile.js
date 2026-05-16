export const qaLogAnalystProfile = {
  id: 'qa-log-analyst',
  name: 'QA Log Analyst',
  status: 'active',
  statusLabel: 'Activo',
  description: 'Analiza errores, logs, stacktraces y contexto técnico usando Claude.',
  usage: 'Este módulo ya funciona desde la extensión de VS Code. La extensión toma la selección del editor, puede reunir snippets relevantes del workspace y envía el contexto al proxy local.',
  download: {
    label: 'Descargar extensión VS Code',
    path: '/downloads/claude-secure-vscode'
  },
  navigation: {
    label: 'QA Log Analyst',
    path: '/qa-log-analyst',
    order: 10
  },
  relatedEndpoints: [
    '/analyze-error',
    '/analyze-error-context'
  ],
  execution: {
    enabled: false,
    mode: 'legacy',
    runtimeEndpoint: '/agents/qa-log-analyst/run',
    legacyEndpoints: [
      '/analyze-error',
      '/analyze-error-context'
    ]
  },
  inputContract: {
    requiredAnyOf: ['errorText', 'logText'],
    optional: ['technology', 'context', 'workspaceContext'],
    disallowUnknownFields: true
  },
  capabilities: [
    'Identificar causa raíz probable',
    'Extraer evidencia desde logs y snippets',
    'Clasificar severidad',
    'Proponer validaciones QA',
    'Sugerir próximos pasos técnicos',
    'Evitar exponer secretos o datos sensibles'
  ],
  outputContract: [
    'Resumen',
    'Causa probable',
    'Evidencia',
    'Severidad',
    'Impacto',
    'Validaciones QA recomendadas',
    'Próxima acción recomendada',
    'Preguntas abiertas'
  ],
  governance: [
    'La página es informativa y no llama directamente a Claude',
    'Las llamadas reales pasan por sanitización',
    'Las llamadas reales pasan por control de presupuesto',
    'El dashboard sigue siendo el centro de control de tokens y costo',
    'El agente no debe inventar causas sin evidencia suficiente'
  ]
};

export const ERROR_ANALYSIS_INSTRUCTION = `Actúa como QA Architect senior especializado en análisis de errores, logs, debugging de frontend, backend, APIs, automatización y pipelines CI/CD. Analiza el siguiente error y responde en español con esta estructura:

1. Resumen del problema
2. Causa raíz probable
3. Evidencia encontrada en el log o código
4. Impacto QA
5. Pasos para reproducir
6. Validaciones recomendadas
7. Solución inmediata
8. Solución robusta
9. Qué revisar en frontend/backend/configuración/pipeline
10. Casos de prueba recomendados
11. Riesgos de regresión
12. Nivel de severidad: Bajo | Medio | Alto | Crítico
13. Próxima acción recomendada`;

export const ERROR_CONTEXT_ANALYSIS_INSTRUCTION = `Actúa como QA Architect senior y debugging assistant especializado en frontend, backend, APIs, automatización y pipelines. Analiza el error usando el contexto del workspace proporcionado. No inventes archivos ni código no incluido. Si falta contexto, dilo explícitamente. Responde en español con:

1. Resumen del error
2. Archivo/método/variable probablemente involucrado
3. Evidencia exacta encontrada en el error o snippets
4. Causa raíz probable
5. Hipótesis alternativas
6. Validaciones para confirmar
7. Solución inmediata
8. Solución robusta
9. Cambios sugeridos en código o pruebas
10. Casos de prueba QA recomendados
11. Riesgos de regresión
12. Archivos adicionales que convendría revisar
13. Severidad
14. Próxima acción recomendada`;
