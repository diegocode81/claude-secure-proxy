# Platform Settings

## Propósito

El módulo Configuración administra parámetros base de la plataforma.

Este módulo no es un agente, no se registra en `src/agents/registry.js` y no crea agentes nuevos.

## Dashboard

La pestaña Dashboard permite configurar:

- Presupuesto mensual.
- Valor mensual de alerta en USD.

Estos valores preparan el gobierno de consumo, tokens y costos de la plataforma.

## LLM

La pestaña LLM permite registrar:

- Proveedor LLM.
- Nombre visible del LLM.
- API key.

La API key se guarda localmente en `data/platform-settings.json` en esta fase.

La API key nunca se devuelve completa al frontend. Las respuestas solo muestran si está configurada y una vista enmascarada.

## Soporte multi-LLM

Esta configuración prepara soporte futuro multi-LLM para proveedores como Claude, Gemini, DeepSeek, OpenAI u otros.

La lógica actual de llamadas a Claude no se cambia en esta tarea.

## Seguridad

`data/` no debe entrar al commit.

Antes de usar esta configuración en ambientes reales se debe definir almacenamiento seguro de secretos.

El módulo de configuración no debe llamar LLM directamente y no debe exponer secretos completos.
