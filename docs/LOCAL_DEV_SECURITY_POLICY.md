# Local Dev Security Policy

QA IA Platform en esta fase es una plataforma **local/dev-only**.

No debe exponerse publicamente en internet ni en redes compartidas sin controles adicionales. La ausencia de login, roles y autorizacion es una decision consciente del MVP local, no una autorizacion para despliegue productivo.

## Alcance Local

Los endpoints administrativos son aceptables solo en un entorno local, controlado por el desarrollador u operador tecnico:

- Settings Dashboard.
- Settings LLM.
- Settings Proxy.
- Agent Builder.
- Activacion, desactivacion y eliminacion de agentes.
- Generacion de extension VS Code.
- Configuracion de extension VS Code.
- Refresh state de plataforma.
- Proxy y endpoints legacy locales.

## Restricciones

- No exponer la plataforma publicamente sin autenticacion.
- No compartir el puerto local con usuarios no confiables.
- No imprimir API keys completas.
- No devolver API keys completas al frontend.
- No guardar secretos en logs.
- No subir `data/`, `.env` ni logs al repositorio.
- No ejecutar archivos cargados por agentes.
- No renderizar HTML de usuarios como HTML confiable.

## Secretos

Los secretos reales deben vivir solo en archivos locales ignorados, como `.env` o `data/platform-settings.json`, hasta que exista un secret manager.

Estos archivos no deben entrar al repositorio:

- `.env`
- `data/`
- `*.log`

La UI y endpoints deben mostrar solo previews seguros, por ejemplo primeros 4 y ultimos 4 caracteres.

## Configuracion LLM

La pantalla `/settings` permite configurar proveedor y modelo LLM de la plataforma. El modelo se guarda como configuracion operativa y el runtime lo usa para llamadas al proveedor configurado cuando el cliente existe.

La API key nunca debe devolverse completa desde `/settings/config` ni precargarse en el formulario. El campo de API key se usa solo para reemplazarla: si el operador lo deja vacio al guardar, la plataforma conserva la key existente o la fuente de entorno configurada.

## Antes de Produccion

Antes de cualquier despliegue productivo se requiere:

- Autenticacion.
- Autorizacion por roles.
- Auditoria de cambios administrativos.
- Rate limiting.
- Proteccion CSRF si aplica.
- Secret manager.
- Hardening de uploads.
- Revision de logs.
- Controles de operador.
- TLS y CORS estricto.

## Reinicio

No existe endpoint de restart ni boton de reinicio en la plataforma. Si se requiere aplicar cambios estructurales, el servidor debe reiniciarse manualmente desde terminal.
