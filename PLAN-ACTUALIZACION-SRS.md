# Plan de actualización de SNIPP según el SRS v1.1

Documento base: *Especificación de Requerimientos del Software, Sistema digital multiplataforma para la gestión de servicios estéticos, versión 1.1 (13/11/2026)*.

Revisión del 14/11/2026: el SRS se volvió a entregar (`SRS_v1.1.pdf`) y se comparó página por página con la versión anterior (`SRS-final.pdf`). Solo cambia la tabla de firmas (5.4): ahora firman Julián Uriarte Cázares como responsable administrativo y Axel Ramírez Cárdenas como responsable desarrollador, en lugar de Fernando Flores Velázquez (administrativo) y Julián Uriarte Cázares (desarrollador). Ningún RF, RNF, RN, alcance ni criterio de aceptación cambió, así que este plan sigue igual.

Este plan explica cómo llevar las plantillas de frontend ya construidas, y las que faltan, a lo que dice el SRS: ni más ni menos. Cada cambio cita el requerimiento (RF, RNF o RN) que lo justifica. Si algo no aparece en el SRS, se quita o queda en la sección 9 para que el equipo decida.

---

## 1. Reglas del plan

1. **El SRS v1.1 manda.** El documento de prompts ("Prompts para generar las plantillas del frontend") queda por debajo: si algo de ese documento no está en el SRS, se quita; si lo contradice, gana el SRS.
2. **Nombre y marca:** la app se llama **SNIPP** y usa el logo entregado (`brand/snipp-logo.png`).
3. **Colores:** toda la interfaz va en **escala de grises**. Ningún estado se distingue solo por color.
4. **Fuera de alcance (SRS 1.2), no se diseña nada de esto:** recomendaciones con IA, facturación CFDI, versión iOS, publicación en Google Play o App Store, pago de citas en línea, envío a domicilio y cualquier pago que no sea con Stripe.
5. **Entrega móvil:** solo Android 10 o superior, como archivo APK (SRS 2.3, RNF-M04).
6. **Sin modo sin conexión** (SRS 2.3): se queda la pantalla de "No hay conexión" con "Reintentar".

---

## 2. Estado actual

| Parte | Estado |
| --- | --- |
| App móvil, lotes M1 a M5 (cuenta, búsqueda, reserva, mis citas, tienda y pago) | **Ajustados** (fases 1 y 2 aplicadas el 14/11/2026): SNIPP, escala de grises, Q1–Q13 quitados, C1–C11 corregidos. |
| App móvil, lote M6 (pedidos, reseñas, reportes, puntos, notificaciones) | **Hecho** como plantilla el 14/11/2026 (fase 3). Falta conectar la API y OneSignal (fase 5). |
| Plataforma web (Jefe, Empleado, Administrador) | Lotes W1 (acceso y registro), W2 (estructura del panel) y W3 (inicio del Jefe) **hechos** como plantilla el 14/11/2026 en `frontend/web`. W4 a W9 pendientes (sección 6). |
| API, base de datos, Stripe real, OneSignal, servidor | Fuera de este frontend; son dependencias (sección 7). |
| Repositorio GitHub (RNF-G08) | En github.com/fersho99/snipp, rama `main`. |

---

## 3. Identidad SNIPP en escala de grises

### 3.1 Nombre y logo

| Dónde | Cambio |
| --- | --- |
| `app.json` | `name: "SNIPP"`, `slug: "snipp"`, `scheme: "snipp"`; ícono, ícono adaptable de Android y pantalla de carga generados del isotipo (tijeras, peine y la "S"). Se quita el bloque `ios` (iOS está fuera de alcance). |
| Inicio de sesión y pantalla de inicio | El texto "turno" se cambia por el logo: isotipo más la palabra SNIPP. |
| Todos los textos con "Turno" (17 en la app) | "Turno" → "SNIPP". Ejemplos: "SNIPP necesita internet…", "…tiene cuenta en SNIPP", `merchantDisplayName: 'SNIPP'` en Stripe. |
| Web | Logo completo en la pantalla de acceso; isotipo y palabra SNIPP en la barra lateral; favicon con el isotipo. |

El logo trae la línea "BARBERÍA · ESTÉTICA · SALÓN" en mayúsculas con puntos medios. Va **solo dentro del logo** (pantalla de acceso). No se repite ese estilo en textos de la interfaz.

### 3.2 Paleta en escala de grises

Contraste medido con la fórmula WCAG:

| Token | Valor | Uso | Contraste |
| --- | --- | --- | --- |
| `fondo` | `#F5F5F5` | Fondo de pantallas | – |
| `superficie` | `#FFFFFF` | Hojas inferiores, modales, barra de pestañas | – |
| `hundido` | `#E8E8E8` | Agrupar sin bordes, campos, botón secundario | – |
| `tinta` | `#141414` | Texto principal, botón primario, íconos | 16.9 sobre fondo |
| `tinta-secundaria` | `#595959` | Texto secundario (nunca más claro) | 6.4 sobre fondo, 5.7 sobre hundido |
| `gris-logo` | `#7A7A7A` | Solo decoración o texto de 24 px o más | 3.9 (no sirve para texto normal) |
| `gris-claro` | `#BDBDBD` | Solo decoración (divisores, pistas de interruptores) | 1.7 |
| Botón primario | fondo `#141414`, texto `#FFFFFF`; presionado `#333333` | Una acción principal por pantalla | 18.4 |
| Línea entre filas (tablas web) | `#DCDCDC`, 1 px | Solo tablas densas de la web | – |

Sale de la paleta actual: terracota, verde salvia, ámbar y ladrillo.

### 3.3 Estados sin color

Como ya no hay verde, ámbar ni rojo, cada estado se reconoce por **ícono + texto + peso**:

| Estado | Cómo se muestra |
| --- | --- |
| Confirmada, pagado, atendida, listo para recoger | Ícono `CheckCircle` relleno + texto en tinta seminegrita |
| Pendiente (cambio por responder, en revisión, por vencer) | Ícono `Clock` + texto en tinta |
| Cancelada, rechazado, error, agotado, bloqueo | Ícono `XCircle` o `WarningCircle` + texto explícito ("Agotado", "El pago no pasó") en tinta seminegrita |
| No asistió / pasado sin acción | Texto en tinta secundaria, sin ícono |
| Selección (pestañas, filtros, día elegido) | Barra de 3 px en tinta o fondo tinta con texto blanco |
| Avisos en línea (error, cambio, confirmación) | Barra vertical de 3 px en tinta + ícono del estado |
| Botón de confirmar algo destructivo ("Sí, cancelar cita") | Igual que el primario (tinta); se distingue por la etiqueta y por estar en la hoja de confirmación |

Archivos que hoy usan color y se deben cambiar: `theme/tokens.js` y los 21 archivos que usan `color.accent`, `color.sage`, `color.brick` o `color.amber`. Entre ellos: botón, campo de texto, calendario y horarios, filtros, `StatusLine`, barra de pestañas, barra del carrito, interruptor de puntos, avisos y línea de tiempo.

---

## 4. Cambios a lo ya construido en la app móvil (M1 a M5)

### 4.1 Quitar: no está en el SRS

| # | Pantalla | Qué se quita | Por qué |
| --- | --- | --- | --- |
| Q1 | Inicio | "Lo más buscado" (accesos a Fade, Uñas acrílicas…) | RF-M05 pide buscar por nombre, ubicación o servicio; no pide sugerencias. |
| Q2 | Inicio y resultados | Distancia en km, "4 negocios a menos de 4 km de ti" y orden por cercanía | El SRS no pide geolocalización. La búsqueda por ubicación se hace por colonia o dirección escrita (RF-M05). |
| Q3 | Sucursal y detalle de cita | Abrir Google Maps al tocar la dirección | El SRS solo pide mostrar la dirección (RF-M05, RF-W05). |
| Q4 | Reserva y reagendar | Opción "Cualquiera disponible" | RF-M06: el cliente elige un profesional identificado con su nombre y foto. Ver decisión D2. |
| Q5 | Confirmación de reserva | "Nota para la sucursal (opcional)" | No aparece en RF-M06. |
| Q6 | Cita reservada | Botón "Agregar a mi calendario" | No aparece en el SRS. |
| Q7 | Cancelar cita | Lista de motivos de cancelación | RF-M07 solo pide cancelar. |
| Q8 | Reagendar | Cambiar de profesional al reagendar | RF-M07: reagendar cambia la fecha y conserva el folio. El cambio de profesional solo lo hace el negocio (RF-M08, RF-W16). |
| Q9 | Detalle de cita con menos de 2 horas | Botón "Llamar a la sucursal" | RN-03 solo dice que no se puede cancelar ni reagendar. El teléfono sigue visible como dato de la sucursal. |
| Q10 | Perfil | "Cliente desde octubre de 2025" | RF-M04: nombre, teléfono y foto. |
| Q11 | Registro | Línea "Términos de uso y Aviso de privacidad" | No aparece en RF-M01. Ver decisión D4. |
| Q12 | Pedido confirmado y pago | "Pagado con Visa terminada en 4242" | RN-17: solo se guarda la referencia de la transacción. Se muestra "Pagado con tarjeta (Stripe)" y la referencia. Ver decisión D5. |
| Q13 | Índice de pantallas en `/` y vista web del móvil | Se quedan solo en desarrollo | No forman parte de la app. La APK abre directo en "Entrar". |

### 4.2 Corregir: reglas o textos que el SRS no dice

| # | Dónde | Hoy | Debe quedar | Base |
| --- | --- | --- | --- | --- |
| C1 | Disponibilidad (`availability.js`) | Exige 1 hora mínima para reservar hoy | Solo horarios posteriores a la hora actual | RN-01, RF-M06 (no fijan otro mínimo) |
| C2 | Disponibilidad | No toma en cuenta las citas del propio cliente | Una cita reservada deja de mostrarse libre; una cancelada vuelve a estar libre | RF-M06, RF-M07 |
| C3 | Datos de ejemplo | "Hoy" es 13 de noviembre de **2025** | Fechas de 2026 (el SRS es del 13/11/2026; el proyecto corre del 02/11/2026 al 19/03/2027). El límite de reserva se recalcula a 2 meses desde el día de la reserva. | RN-02, SRS portada y 2.3 |
| C4 | Sucursal sin profesionales (Navaja Fina) | Deja reservar "con quien esté libre" | Sin Empleados vinculados no se puede reservar; se muestra el motivo en lugar de "Reservar" | RF-M06, RF-W10 |
| C5 | Catálogo de la app | Muestra todo | Ocultar sucursales desactivadas, servicios inactivos, negocios suspendidos o con suscripción vencida, y Empleados en "migración pendiente" | RF-W07, RF-W09, RF-W12, RF-W26, RF-W28, RN-13, RN-14 |
| C6 | Tienda | El pago no descuenta existencias | Al confirmarse el pago, el inventario baja en la cantidad comprada | RF-W20, RN-07 |
| C7 | Recuperar contraseña | "El enlace sirve durante 30 minutos" | Quitar el plazo; el SRS no lo define | RF-M03 |
| C8 | Registro | Exige nombre **y apellido** | Nombre obligatorio, sin exigir apellido | RF-M01 |
| C9 | Registro y perfil | "Solo lo ve la sucursal donde reservas", "La ve quien te atiende" | Quitar las afirmaciones de privacidad que el SRS no define | RF-M01, RF-M04 |
| C10 | Pedido confirmado | "Normalmente tarda menos de una hora" y "los puntos se suman cuando recojas el pedido" | Quitar el tiempo estimado; decir "Ganaste X puntos en [negocio]" sin inventar cuándo se suman | RF-M10, RF-M15 |
| C11 | Detalle de cita y confirmación | "En efectivo o con tarjeta" | "Pagas en la sucursal" sin nombrar formas de pago | RN-05 |
| C12 | Textos de reportes (para M6) | "Solo lo verá el dueño del negocio" | "Solo lo ven el Jefe de [negocio] y el Administrador de SNIPP. [Empleado] no verá tu reporte ni tus datos." | RN-15 |

### 4.3 Se queda como está (ya cumple)

- Registro con nombre, correo, teléfono y contraseña; "correo ya registrado" (RF-M01).
- Entrar y salir, con error de credenciales (RF-M02). Recuperar por enlace al correo (RF-M03). Editar nombre, teléfono y foto (RF-M04).
- Búsqueda por nombre, colonia o servicio; perfil de sucursal con nombre, descripción, imágenes, servicios, precios, horario, profesionales y calificación (RF-M05).
- Calendario que termina a los 2 meses; solo horarios libres dentro del horario de la sucursal y fuera de bloqueos (RF-M06, RN-01, RN-02).
- Mis citas, cancelar y reagendar conservando el folio, con la anticipación que configura el negocio (RF-M07, RN-03).
- Aviso de cambio del negocio con Aceptar, Reagendar o Cancelar sin límite de anticipación (RF-M08, RN-04).
- Carrito de una sola sucursal con aviso para vaciarlo (RF-M09, RN-06); producto sin existencias que no se puede agregar (RN-07).
- Pago con Stripe; solo recoger en sucursal (RF-M10, RN-06). "Pagas en la sucursal" para citas (RN-05).
- Puntos que solo se canjean en el mismo negocio (RF-M15, RN-09).
- Pantalla sin conexión con reintento (SRS 2.3).

---

## 5. App móvil pendiente (lote M6)

| RF | Pantalla | Qué debe hacer | Criterio de aceptación del SRS |
| --- | --- | --- | --- |
| RF-M11 | Mis pedidos y detalle | Historial y estado: pagado, listo para recoger, entregado, cancelado (con reembolso por Stripe, RN-06) | El cambio de estado hecho en la web se ve en la app |
| RF-M12 | Calificar | 1 a 5 estrellas y reseña, solo para una cita atendida y una por cita (RN-08) | Solo se habilita en citas atendidas; el promedio del negocio se actualiza |
| RF-M13 | Reportar a un Empleado | Elegir la cita, el motivo (trato, puntualidad, higiene, calidad del servicio, otro) y la descripción. Solo citas atendidas o "Empleado no se presentó", uno por cita (RN-15). Lleva el texto de privacidad C12. | Aparece en el panel del Jefe y no lo ve el Empleado |
| RF-M14 | Mis reportes | Estados: enviado, en revisión, atendido | El cambio hecho por el Jefe se ve en la app |
| RF-M15 | Puntos | Saldo por negocio, ganados por citas atendidas y por compras, dónde se canjean | Se suman en el negocio correcto, se descuentan al canjear y no sirven en otro negocio |
| RF-M16 | Notificaciones push (OneSignal) | Confirmación al reservar; recordatorio 24 h y 1 h antes; cancelación o actualización de cita (incluido cambio de Empleado y cancelación por el negocio); pedido listo para recoger | El teléfono de prueba recibe cada notificación |
| SRS 4 | Pantalla de notificaciones | Lista de las notificaciones recibidas (la sección 4 incluye "notificaciones" en la interfaz de la app) | – |

Navegación: "Mis pedidos", "Mis reportes" y "Puntos" se abren desde la pestaña Cuenta. "Calificar" y "Reportar un problema" se abren desde el historial de citas, que ya tiene los botones listos.

---

## 6. Plataforma web (pendiente)

Stack: React con Tailwind (SRS 2.3), responsiva para escritorio y tableta (RNF-W03), con la misma identidad SNIPP en escala de grises. Cada rol ve solo sus opciones (RF-W04, RNF-W04).

| Lote | Pantallas | Requerimientos | Del documento de prompts se quita |
| --- | --- | --- | --- |
| W1 Acceso | Entrar (los tres roles), recuperar contraseña, registro de Jefe con negocio y plan (mes de prueba gratis), registro de Empleado sin negocio | RF-W01, RF-W02, RF-W03, RF-W27 (planes que se pueden elegir) | – |
| W2 Estructura | Barra lateral según el rol, selector de sucursal del Jefe, aviso 7 días antes de que venza la prueba o la suscripción, pantalla de suscripción vencida para Jefe y Empleados | RF-W04, RF-W25, RF-W26, RN-13 | – |
| W3 Dashboard del Jefe | Métricas por sucursal y por empleado: citas, ventas, productos más vendidos y calificación promedio, con periodo. Aviso por cada reporte nuevo (RF-W14) y solicitudes de ingreso o migración por aceptar (RF-W10, RF-W12) | RF-W22, RF-W14, RF-W10, RF-W12 | La comparación con el mes anterior ("18% más que octubre") y "pedidos listos sin entregar" |
| W4 Negocio y sucursales | Alta de sucursales; edición (nombre, descripción, dirección, teléfono, horario, imágenes: agregar, cambiar, eliminar, portada); desactivar y reactivar; servicios (nombre, descripción, duración, precio, activo); anticipación mínima (2 horas por defecto); rechazo de imágenes que no sean JPG/PNG o pesen más de 5 MB | RF-W05, RF-W06, RF-W07, RF-W08, RF-W09, RNF-W05 | "Vista previa de cómo se ve en la app" |
| W5 Empleados | Invitar por correo o aceptar solicitud; horario de trabajo; perfil del Empleado (foto, nombre visible, especialidades); historial de citas por Empleado (confirmadas, canceladas y reagendadas, con fecha y quién lo hizo). Migración: el Jefe de destino acepta; el Empleado queda en "migración pendiente"; el Jefe de origen confirma o cambia la propuesta de reasignación de cada cita (si nadie está libre, lo atiende el mismo Empleado); caduca a los 7 días; aviso al Jefe anterior. Desvincular con las mismas reglas. Vista del Empleado: su perfil y "Solicitar migración" | RF-W10, RF-W11, RF-W12, RF-W13, RF-W17, RN-11, RN-12 | – |
| W6 Agenda y citas | Agenda de la sucursal por día y semana; cambiar estado (confirmada, atendida, no asistió, Empleado no se presentó, cancelada); reagendar; reasignar una por una y en bloque, o cancelar en bloque, con aviso a cada cliente; bloquear descansos y vacaciones (Jefe y Empleado). El Empleado solo gestiona sus citas. | RF-W15, RF-W16, RF-W18, RN-03 | Bloquear horarios arrastrando en la agenda (se hace con formulario) |
| W7 Reportes y reseñas | Bandeja de reportes (solo Jefe): estados en revisión y atendido, notas internas, historial por Empleado. Reseñas del negocio con "Reportar al Administrador" y motivo. El Empleado no tiene acceso. | RF-W14, RF-W23, RN-10, RN-15, RN-16 | – |
| W8 Productos, inventario, pedidos y lealtad | Catálogo por sucursal (alta, edición, imagen, precio, existencias); inventario; pedidos (Jefe y Empleado) con estados pagado, listo para recoger, entregado y cancelado, más reembolso por Stripe; reglas de puntos editables | RF-W19, RF-W20, RF-W21, RF-W24, RN-06, RN-07, RN-09 | – |
| W9 Suscripción y Administrador | Suscripción del Jefe: pagar y renovar con Stripe, ver vencimiento. Administrador: planes (nombre, precio, duración), estado de pago de cada negocio, activar o suspender negocios, eliminar reseñas reportadas | RF-W25, RF-W27, RF-W28 | – |

---

## 7. Requerimientos no funcionales

### 7.1 Los que toca el frontend

| RNF | Qué se hace en el frontend |
| --- | --- |
| RNF-M01 | Flujo de reserva en 2 minutos o menos y compra en 3 minutos o menos: se mide con 5 usuarios. Quitar Q4, Q5 y Q7 reduce pasos. |
| RNF-M02 | Cuestionario de satisfacción (meta 4 de 5) después de las pruebas. |
| RNF-M03 | Búsqueda, agenda y catálogo en 3 s o menos con 4G: carga con esqueletos e imágenes optimizadas. |
| RNF-M04 | Probar en al menos 2 teléfonos Android 10 o superior y en pantallas de 360 px o más. Generar el APK con EAS (`buildType: apk`). |
| RNF-W01 | Gestionar una cita, actualizar inventario o editar una sucursal en 3 minutos o menos. |
| RNF-W02 | Citas, pedidos, inventario y dashboard en 3 s o menos. |
| RNF-W03 | Últimas 2 versiones de Chrome, Edge y Firefox; vista de escritorio y tableta. |
| RNF-W04 | Menú y rutas según rol y negocio. La validación real va en la API. |
| RNF-W05 | Validar JPG/PNG de 5 MB o menos antes de subir y mostrar el motivo del rechazo. La optimización la hace el servidor. |

### 7.2 Dependencias fuera del frontend

Necesarias para la aceptación, pero no forman parte de las plantillas:

| Qué | Requerimientos |
| --- | --- |
| API REST, base de datos Supabase/MySQL multi-negocio | SRS 1.2 y 4 |
| Stripe: PaymentIntent, webhook, reembolsos, suscripciones | RF-M10, RF-W21, RF-W25, RNF-G04, RN-17 |
| OneSignal | RF-M16 |
| Correo de recuperación | RF-M03, RF-W03 |
| Contraseñas con hash, HTTPS, rechazo de tokens vencidos | RNF-G01, RNF-G02, RNF-G03 |
| Resistencia a inyección SQL y XSS (OWASP ZAP) | RNF-G05 |
| Respaldos diarios, disponibilidad del 95 %, VPS Hostinger | RNF-G06, RNF-G07, SRS 2.3 |
| Repositorio en GitHub y manual técnico de despliegue | RNF-G08 |

---

## 8. Orden de trabajo

| Fase | Trabajo | Resultado |
| --- | --- | --- |
| 0 | Crear el repositorio git y subirlo a GitHub (RNF-G08); guardar el logo en `brand/` (ya está) y generar ícono, ícono adaptable y pantalla de carga | Repo con historial; recursos de marca |
| 1 | Identidad SNIPP en la app: tokens en grises, estados con ícono y texto (3.3), cambio de nombre, logo en Entrar e Inicio, quitar bloque iOS | App M1–M5 con la nueva identidad |
| 2 | Alinear M1–M5 con el SRS: quitar Q1–Q13 y corregir C1–C11 | App M1–M5 sin extras ni reglas inventadas |
| 3 | Lote M6 (sección 5), con el texto C12 | App móvil completa (RF-M01 a RF-M16) |
| 4 | Plataforma web, lotes W1 a W9 (sección 6) | Web completa (RF-W01 a RF-W28) |
| 5 | Conectar la API, Stripe (pago, reembolso, suscripción) y OneSignal cuando existan | Flujos reales en lugar de simulados |
| 6 | Verificar: matriz de trazabilidad (sección 10), 2 teléfonos Android, 3 navegadores, APK de entrega | Evidencias para las pruebas del 08/03/2027 |

Cada fase se revisa contra este plan antes de pasar a la siguiente.

---

## 9. Decisiones (aprobadas con las recomendaciones el 14/11/2026)

| # | Pregunta | Decisión |
| --- | --- | --- |
| D1 | ¿Las **fotos** (locales, trabajos, productos) también van en grises, o solo la interfaz? | Interfaz en grises y fotos a color: la indicación es sobre la gama de colores de la app, y las fotos son contenido de cada negocio. |
| D2 | ¿Se quita "Cualquiera disponible" al reservar? | Sí. RF-M06 pide elegir un profesional identificado con nombre y foto. |
| D3 | ¿Se crea una pantalla para que el Administrador vea los reportes? RN-15 dice que el Administrador **puede** verlos, pero ningún RF pide esa pantalla. | No crear pantalla; solo dejar el permiso en la API. |
| D4 | ¿Se quita la línea de Términos y Aviso de privacidad del registro? | Quitarla para apegarse al SRS. Si la asesora la pide, se registra como cambio en el control de cambios. |
| D5 | ¿Se deja de mostrar la marca y los últimos 4 dígitos de la tarjeta? | Sí: mostrar "Pagado con tarjeta (Stripe)" y la referencia de la transacción (RN-17, RNF-G04). |
| D6 | ¿Se cambia la tipografía para que combine con el logo? El logo usa una sans geométrica tipo Montserrat; hoy la app usa Bricolage Grotesque y Onest. | Usar Montserrat en títulos para que combinen con el logo y dejar Onest en el texto. |
| D7 | RF-W22 pide "ventas" por empleado, pero en el SRS las citas se pagan en la sucursal (RN-05) y los pedidos de la tienda no quedan ligados a un Empleado. | **Pendiente de confirmar.** Por ahora el dashboard muestra ventas por sucursal y, por Empleado, sus citas y su calificación. Si el cliente quiere ventas por Empleado, hay que definir cómo se asigna cada pedido y registrarlo en el control de cambios. |
| D8 | En los datos de ejemplo de la app móvil, Ramón Cázares aparece en las dos sucursales de Los Compas, pero un Empleado está vinculado a una sola sucursal (glosario, RF-W10). | **Pendiente de corregir en la móvil.** En la web, Ramón queda en Centro y Los Compas Norte tiene a Óscar Félix. Falta pasar a Óscar la cita C-10486, las reseñas de Norte y la lista de profesionales de Norte en `mobile/src/data`. |

---

## 10. Matriz de trazabilidad inicial (para el tester, SRS 5.3)

Estado: **Hecho** = la plantilla de frontend ya cumple (falta conectarla a la API en la fase 5 para la prueba de aceptación) · **Ajustar** = existe y cambia · **Pendiente** = falta construir.

| ID | Pantalla o ruta | Estado |
| --- | --- | --- |
| RF-M01 | `/registro` | Hecho |
| RF-M02 | `/entrar`, cerrar sesión en `/cuenta` | Hecho |
| RF-M03 | `/recuperar`, `/recuperar-enviado` | Hecho |
| RF-M04 | `/perfil` | Hecho |
| RF-M05 | `/inicio`, `/resultados`, `/sucursal/[id]` | Hecho |
| RF-M06 | `/reservar`, `/reserva-confirmada` | Hecho |
| RF-M07 | `/citas`, `/cita/[folio]`, `/reagendar` | Hecho |
| RF-M08 | `/cambio/[folio]` | Hecho |
| RF-M09 | `/tienda/[sucursal]`, `/producto/[id]`, `/carrito` | Hecho |
| RF-M10 | `/carrito`, `/pedido-confirmado` | Hecho (pago real en fase 5) |
| RF-M11 | `/pedidos`, `/pedido/[folio]` | Hecho |
| RF-M12 | `/calificar` | Hecho |
| RF-M13 | `/reportar` | Hecho |
| RF-M14 | `/reportes` | Hecho |
| RF-M15 | `/puntos`, canje en `/carrito` | Hecho |
| RF-M16 | `/notificaciones`; push con OneSignal documentado en `services/notifications.js` | Hecho (push real en fase 5) |
| RF-W01, RF-W02, RF-W03 | `/registro/negocio`, `/registro/empleado`, `/entrar`, `/recuperar`, `/restablecer` | Hecho |
| RF-W27 | Planes que se eligen al registrarse (W1); gestión del Administrador en W9 | Parcial |
| RF-W04 | Menú del panel según el rol y bloqueo de secciones ajenas (`/panel/:seccion`) | Hecho (la API debe aplicar la misma regla, RNF-W04) |
| RF-W25 | Aviso al Jefe 7 días antes de que venza la prueba o la suscripción (W2); pagar y renovar con Stripe en W9 | Parcial |
| RF-W26, RN-13 | `/pago-pendiente` al entrar (Jefe y Empleados) y aviso fijo en el panel mientras siga vencida; ocultar el negocio en la app ya está en la móvil (C5) | Hecho |
| RF-W22 | `/panel/inicio`: citas, ventas, productos más vendidos y calificación promedio por sucursal, y citas y calificación por Empleado, con periodo (últimos 7 días, este mes, mes pasado o fechas elegidas) | Hecho (ver D7) |
| RF-W14 | Aviso por cada reporte nuevo: número junto a "Reportes" en el menú y lista en Inicio (W3); bandeja, estados y notas en W7 | Parcial |
| RF-W10, RF-W12 | Solicitudes de ingreso y de migración por revisar en Inicio, con fecha de caducidad de la migración (W3); aceptar, horario y reasignación en W5 | Parcial |
| RF-W05 a RF-W09, RF-W11, RF-W13, RF-W15 a RF-W21, RF-W23, RF-W24, RF-W28 | Plataforma web, lotes W4 a W9 | Pendiente |
| RNF-M01 a RNF-M04, RNF-W01 a RNF-W05 | Sección 7.1 | Pendiente de medir |
| RNF-G01 a RNF-G08 | Sección 7.2 | Dependencia de back-end e infraestructura |

---

## 11. Documento de prompts

Si el equipo sigue usando el documento de prompts con otras herramientas, hay que actualizar su prompt maestro con este plan:

- nombre SNIPP y su logo;
- paleta de la sección 3.2 y estados de la sección 3.3;
- quitar de los lotes lo marcado en las secciones 4.1 y 6;
- poner fechas de 2026;
- cambiar la lista de rechazo: en lugar de "terracota en todo", rechazar cualquier color fuera de la escala de grises y cualquier estado que dependa solo del color.
