# Cambios pendientes que necesitan servidor (Supabase)

Lista de mejoras que no se pueden aplicar en la versión actual (los datos viven solo en cada móvil).
Se activarán cuando Domingo decida montar el servidor. Cada entrada indica de dónde viene.

| # | Cambio | Qué falta sin servidor | Anotado |
|---|--------|------------------------|---------|
| 1 | **Sincronizar datos entre móviles en tiempo real** (clientes, planes, seguimientos, chat) | Cada móvil guarda sus propios datos; solo se actualizan pestañas del mismo navegador | 19/10/2026 |
| 2 | **Notificaciones entre móviles y con la app cerrada** (push) | Los avisos solo saltan con lo que pasa en el mismo móvil; en iPhone requiere app instalada e iOS 16.4+ | 19/10/2026 |
| 3 | **Cuentas y contraseñas reales** | Contraseñas como huella en el código público; quitar accesos directos de prueba; «Cambiar contraseña» | 19/10/2026 |
| 4 | **Correos reales** (verificación en dos pasos, recordatorios, boletín) | La app no puede enviar correos | 19/10/2026 |
| 5 | **Copias de seguridad en la nube** | Solo descarga manual de un archivo | 19/10/2026 |
| 6 | **Fotos y notas de voz sin límite de memoria** | Se guardan en el móvil (límite de unos 5 MB en total) | 19/10/2026 |
| 7 | **Alta automática al pagar en Stripe** | El alta del cliente es manual | 19/10/2026 |
| 8 | **Tienda de productos propios y merchandising** | Pedidos y envíos necesitan servidor y Stripe | 19/10/2026 |
| 9 | **Conexión con Garmin** | Garmin solo comparte datos con un servidor aprobado | 19/10/2026 |
| 11 | **Pagos y acceso entre móviles**: que el bloqueo, los recordatorios de pago y la baja lleguen al móvil del cliente, y que los pagos con Stripe se registren solos | Ahora el profesional registra los pagos a mano y el bloqueo solo actúa en el móvil donde están los datos | 20/10/2026 |
| 12 | **Asistente con Claude directo dentro de la app** (sin copiar y pegar) | Llamar a Claude necesita una clave privada guardada en un servidor; ahora se copia la petición y se pega la respuesta | 20/10/2026 |
| 13 | **Logros y rachas del cliente visibles para Fátima y Domingo** (y que no se pierdan al cambiar de móvil) | Los logros se calculan y guardan en el móvil del cliente; los profesionales no los ven | 20/10/2026 |
| 10 | **Pasos medios semanales automáticos** en el seguimiento (Salud, Health Connect, Samsung Health, Garmin) | Ahora el cliente los indica con un deslizador; leerlos solos necesita app nativa (o servidor para Garmin) | 20/10/2026 |

**Aparte (no es Supabase, necesita app nativa):** Apple Salud, Samsung Health y Health Connect solo se pueden leer desde una app instalada desde App Store o Google Play.
