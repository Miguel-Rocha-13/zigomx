# Backend de estadísticas ziGO (Google Apps Script)

Esta carpeta empieza con guion bajo para que GitHub Pages **no la publique** en zigomx.com.
`Code.gs` no lleva contraseñas: la seguridad depende del token que llega al buzón de cada persona autorizada.

## Instalar o actualizar (una sola vez, unos 5 minutos)

1. Abre la hoja de cálculo de Google donde hoy se guardan las estadísticas y entra a **Extensiones → Apps Script**.
2. Borra todo el contenido de `Código.gs` y pega el de `Code.gs` de esta carpeta. Guarda.
3. En la barra superior elige la función **`configurar`** y presiona **Ejecutar**.
   Google pedirá permisos para la hoja de cálculo y para **enviar correo** (así salen los tokens y los avisos del buzón). Acéptalos.
4. **Implementar → Gestionar implementaciones → lápiz (Editar) → Versión: "Nueva versión" → Implementar.**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   Editar la implementación existente conserva la misma URL, así que no hay que tocar `js/script.js`.
   Si prefieres crear una implementación nueva, copia su URL en `CONFIG_ZIGO.servicioUrl` (inicio de `js/script.js`).

## Comprobar que funciona

- Abre la URL `/exec` en el navegador: debe responder `{"ok":true,"servicio":"ziGO","version":3}` y nada más.
- Visita el sitio: en la hoja `Eventos_Trafico` aparece una fila `sesion_nueva` y otra `page_view`.
- Entra a `https://zigomx.com/pages/admin.html`, escribe tu correo y usa el token que llega a tu buzón de Zoho.
  Si no llega en un minuto, revisa spam: el remitente es la cuenta de Google dueña de la hoja.

## Quién puede entrar

Se define en `CONFIG.USUARIOS`, al inicio de `Code.gs`:

| Correo | Rol | Ver | Descargar | Borrar |
|---|---|---|---|---|
| miguel.rochab@zigomx.com | admin | sí | sí (token) | sí (token) |
| angel.rochab@zigomx.com | consulta | sí | sí (token) | no |
| skar@zigomx.com | consulta | sí | sí (token) | no |

Para agregar o quitar personas edita esa lista y publica una versión nueva (paso 4).

## Hojas que usa

- `Eventos_Trafico`: una fila por evento (visita, página vista, prueba de armazón, contacto…).
- `Buzon_Comentarios`: encuesta de caritas y buzón de quejas y sugerencias.
- `Bitacora_Admin`: quién entró, descargó o borró, y cuándo.
- `Respaldo_<fecha>_…`: copias ocultas que se crean al borrar. Elimínalas a mano si quieres un borrado definitivo.

## Límites

- Cuentas de Gmail gratuitas envían hasta 100 correos al día (tokens + avisos del buzón).
- Los tokens vencen en 10 minutos, sirven una vez y admiten 5 intentos; la sesión del panel dura 60 minutos sin actividad.
- Si llegan más de 400 eventos por minuto, el excedente se descarta para proteger la hoja.
