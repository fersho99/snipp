# SNIPP: plantillas de frontend

> **Fuente de verdad: SRS v1.1 (13/11/2026).** El plan está en [`../PLAN-ACTUALIZACION-SRS.md`](../PLAN-ACTUALIZACION-SRS.md). Las fases 1 (identidad SNIPP en escala de grises) y 2 (quitar extras y corregir reglas en M1–M5) ya están aplicadas; ver "Actualización al SRS v1.1" al final. Las secciones de lotes de abajo describen cómo se construyeron; donde contradigan al SRS, gana el SRS y la sección final.

- `mobile/`: app de clientes, Expo SDK 58 + React Native (JavaScript) + Expo Router.
- `web/`: panel para Jefe, Empleado y Administrador: Next.js 16 (App Router) + TypeScript estricto + Tailwind CSS 4. Lotes W1 a W9 hechos; migrado de Vite + JavaScript el 17/11/2026 sin cambiar pantallas, textos ni reglas.

## Correr la app móvil

```bash
cd frontend/mobile
npm install
npx expo start          # Android: tecla "a", o escanea el QR con Expo Go
npx expo start --web    # vista previa en el navegador, en una columna de 390 px
```

En `/` hay un índice de desarrollo con cada pantalla y cada estado (`?estado=...`). Solo existe en desarrollo; la APK abre directo en "Entrar".

Cuenta de demostración para el inicio de sesión: `andrea.valenzuela@gmail.com` / `compas2025`.
Cualquier otra combinación muestra el error de credenciales; registrarse con ese mismo correo muestra "correo ya registrado".

## Correr la plataforma web

```bash
cd frontend/web
npm install
npm run dev        # http://localhost:3000
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

En `/` hay un índice de desarrollo con cada pantalla y cada estado (`?estado=...`); en producción `/` abre "Entrar".

Cuentas de demostración (contraseña `snipp2026` para todas):
- Administrador: `admin@snipp.mx` (Daniela Ibarra)
- Jefe de Barbería Los Compas: `martin.salazar@loscompas.mx` (Martín Salazar)
- Empleado de Barbería Los Compas, sucursal Centro: `luis.ortega@gmail.com` (Luis Ortega)
- Empleado sin negocio: `sofia.ramos@gmail.com` (Sofía Ramos); ya pidió unirse a Los Compas Centro

En el índice de desarrollo, `/panel?como=jefe|empleado|sin-negocio|admin` abre el panel con esa cuenta sin escribir la contraseña (solo en `npm run dev`).

La estructura de carpetas de la web está en [`web/README.md`](web/README.md).

## Estructura

```
mobile/src/
  app/          pantallas (una ruta por archivo)
  components/   Txt, Button, TextField, Screen/BackButton, States (OfflineState, ErrorNote, Skeleton, PhotoPlaceholder)
  theme/        tokens.js (paleta, espacios, tipografía), format.js (dinero MXN, horas, fechas)
  data/demo.js  datos de ejemplo compartidos por todos los lotes
  hooks/        useConnectivity (sin modo sin conexión: pantalla de reintento)
```

La fecha de "hoy" para la demostración es el jueves 12 de noviembre de 2026 (`DEMO_TODAY`); el calendario de reserva termina el 12 de enero de 2027 (RN-02).

## Lote M1: cuenta (hecho)

| Pantalla | Ruta | Estados |
| --- | --- | --- |
| Inicio de sesión | `/entrar` | credenciales inválidas, entrando, sin conexión |
| Registro | `/registro` | correo ya registrado, errores por campo, creando, sin conexión |
| Recuperar contraseña | `/recuperar` | correo inválido, enviando, sin conexión |
| Revisa tu correo | `/recuperar-enviado` | reenvío con cuenta regresiva, reenviado |
| Editar perfil | `/perfil` | cargando (skeleton), error al guardar, guardado, sin conexión |

Composición:
- **Entrar**: la foto del interior ocupa ~42 % de la altura y manda; debajo, la marca chica, el título grande con lo que el usuario puede hacer y el formulario. Los bloques se separan solo con espacio (24/32 px); los campos se agrupan por el tono hundido, sin bordes.
- **Registro / Recuperar**: título que explica el beneficio o el resultado, una línea con el porqué del dato que pedimos, campos con su ayuda debajo y la acción principal fija abajo, sobre el teclado.
- **Revisa tu correo**: el correo exacto en negritas manda; la acción de volver es primaria y el reenvío queda en tono hundido con su cuenta regresiva.
- **Perfil**: avatar con iniciales (sin foto todavía) y la acción de foto al lado; abajo el nombre como título con datos reales (cliente desde, puntos en Los Compas); el correo se muestra como texto plano porque no se edita.

## Lote M2: búsqueda y perfil de sucursal (hecho)

| Pantalla | Ruta | Estados |
| --- | --- | --- |
| Inicio | `/inicio` | sin cita próxima, cargando, error, sin conexión |
| Resultados | `/resultados?q=fade` | filtro por servicio, sin resultados (`?q=keratina`), cargando, sin conexión |
| Perfil de sucursal | `/sucursal/los-compas-centro` | cargando, error, sin reseñas, sin conexión; `navaja-fina` sin fotos, sin perfiles de profesionales y sin reseñas |

Composición:
- **Inicio**: la próxima cita es una línea de texto con los datos reales, arriba del buscador; debajo, "Lo más buscado" como texto subrayado y los negocios cercanos como lista de portadas grandes. Cada negocio se separa del siguiente solo con 32 px de espacio; el estado de apertura va en verde salvia solo cuando está abierto.
- **Resultados**: el buscador conserva la búsqueda; los servicios son texto horizontal y el activo se marca con peso y una barra terracota de 3 px. El título cuenta los resultados ("2 lugares hacen fade cerca de ti") y cada fila muestra el precio del servicio filtrado.
- **Sucursal**: la galería a todo lo ancho manda; luego nombre, calificación, horario de hoy resaltado (la semana completa se abre en un bloque de tono hundido), servicios como lista tipográfica sin divisores, profesionales, reseñas y una barra fija con "Reservar".

Datos que se agregaron (no venían en el prompt maestro y se pueden cambiar en `src/data/catalog.js`): colonias de Los Compas Norte y Navaja Fina, teléfonos, distancias, calificaciones (Los Compas 4.7 de 212 reseñas, Norte 4.5 de 86, Estudio Marisol 4.8 de 143, Navaja Fina sin reseñas), horarios, qué servicios y qué profesionales hay en cada sucursal, y los textos de las reseñas.

Las fotos de los profesionales se muestran como bloques con el nombre del archivo esperado (`luis-ortega.jpg`, etc.) hasta que haya fotos reales.

## Lote M3: flujo de reserva (hecho)

| Pantalla | Ruta | Estados |
| --- | --- | --- |
| Reserva (servicio, profesional, fecha y hora, confirmación) | `/reservar?sucursal=los-compas-centro` | horarios cargando, el horario se ocupa al confirmar, sucursal sin profesionales (`navaja-fina`), sin conexión |
| Cita reservada | `/reserva-confirmada` | nota para la sucursal, abrir calendario |

Se puede entrar a cualquier paso con `&servicio=fade&profesional=luis&fecha=2025-11-20&hora=17:30` (ver el índice en `/`).

Composición:
- Sin stepper: arriba se arma la frase de la cita ("Fade con Luis Ortega, jueves 20 de noviembre a las 5:30 pm"); cada parte va subrayada en terracota y al tocarla regresa a ese paso.
- **Servicio**: lista tipográfica; el elegido se marca con peso y una barra terracota de 3 px.
- **Profesional**: "Cualquiera disponible" primero, en bloque hundido; luego retratos grandes 4:5. Si alguien no hace el servicio, una línea lo dice ("Ramón Cázares no hace fade en esta sucursal").
- **Fecha y hora**: el calendario termina el 13 de enero: no hay días después ni flecha a febrero, y una línea lo explica. Los días sin lugar o de vacaciones van tachados; los cerrados y pasados en tinta secundaria. Los horarios libres se agrupan en mañana, tarde y noche, con la explicación de qué se quitó (citas de Luis y su descanso de 2:00 a 3:00 pm).
- **Confirmación**: resumen en pares etiqueta/valor, bloque hundido con "Pagas en la sucursal" y el precio, y la política con la hora límite real ("hasta el jueves 20 de noviembre a las 3:30 pm") y el teléfono de la sucursal.
- **Horario ocupado**: aviso en ladrillo, los tres horarios libres más cercanos de ese día y "Elegir otro día".

Reglas de disponibilidad (demo de lo que devolverá la API) en `src/data/availability.js`: horario de la sucursal, descansos y vacaciones por profesional, citas existentes generadas de forma fija por día, mínimo una hora de anticipación para hoy y anticipación de 2 horas para cancelar. Qué servicios hace cada profesional está en `staffServices`.

"Agregar a mi calendario" abre Google Calendar con el evento ya lleno; si prefieren guardarlo directo en el calendario del teléfono, el cambio es usar `expo-calendar`.

## Lote M4: mis citas y cambios del negocio (hecho)

| Pantalla | Ruta | Estados |
| --- | --- | --- |
| Mis citas | `/citas` (`?vista=historial`) | sin citas próximas, cargando, sin conexión |
| Detalle de cita | `/cita/C-10482` | se puede cancelar, faltan menos de 2 horas (`?estado=menos-de-2h`), cancelada por el negocio (`C-10486`), atendida por calificar (`C-10431`), empleado no se presentó (`C-10370`), cargando, sin conexión |
| Cancelar | hoja inferior dentro del detalle | motivo opcional |
| Reagendar | `/reagendar?cita=C-10482` | bloqueado por anticipación, desde un cambio del negocio sin límite (`&desdeCambio=1`) |
| Aviso de cambio | `/cambio/C-10490` | aceptar, reagendar, cancelar, ya respondido, sin conexión |

Composición:
- **Mis citas**: el título es la próxima cita en una frase; si hay un cambio sin responder, una línea con marca ámbar lo avisa arriba. Pestañas de texto (Próximas / Historial) y filas con la fecha como tipografía grande a la izquierda. En el historial, "Calificar" y "Reportar un problema" solo aparecen cuando la regla lo permite.
- **Detalle**: estado en su color, servicio y profesional como título, fecha y hora, quién atiende, dónde (mapa y teléfono), bloque hundido con "Pagas en la sucursal" y las acciones permitidas al final.
- **Menos de 2 horas**: no hay botones de cancelar ni reagendar; en su lugar, la explicación con los minutos que faltan y "Llamar a Barbería Los Compas".
- **Aviso de cambio**: la frase completa del cambio como título, Antes (tachado) y Ahora, lo que no cambia y el mensaje de la barbería. Abajo: Aceptar, Reagendar y Cancelar, sin límite de anticipación.

Estados y reglas en `src/data/appointments.js`. Es un almacén en memoria para la demo: lo que canceles, aceptes o reagendes se ve en todas las pantallas hasta que recargues la página.

Datos agregados: citas C-10486, C-10490, C-10497, C-10431, C-10402, C-10388, C-10370 y C-10355 (el prompt solo daba C-10482), con sus motivos y mensajes.

Cambios en lotes anteriores:
- La app ya tiene barra inferior (Inicio, Mis citas, Cuenta) en Inicio y Mis citas; se quitó el avatar del inicio.
- La línea de próxima cita del inicio sale de las citas reales y abre el detalle.
- Nuevo botón `danger` (ladrillo) solo para confirmar una cancelación.
- El ámbar no se usa como color de texto: sobre el fondo papel no llega a AA. Los estados pendientes llevan una marca ámbar junto a texto en tinta.

Pendiente: "Calificar" y "Reportar un problema" abren `/calificar` y `/reportar`, que son del lote M6.

## Lote M5: tienda, carrito y pago (hecho)

| Pantalla | Ruta | Estados |
| --- | --- | --- |
| Tienda de la sucursal | `/tienda/los-compas-centro` | agotado sin botón, pocas piezas, cargando, sin conexión, tienda sin productos (`estudio-marisol`) |
| Modal de otra sucursal | `/tienda/navaja-fina?estado=otra-sucursal` | vaciar y agregar, cancelar |
| Detalle de producto | `/producto/pomada?sucursal=los-compas-centro` | agotado (`shampoo`), límite de piezas |
| Carrito y pago | `/carrito?demo=lleno` | pago rechazado, ventana de pago cerrada, carrito vacío (`?estado=vacio`), sin conexión |
| Pedido confirmado | `/pedido-confirmado` | folio P-2291, estado Pagado |

Composición:
- **Tienda**: dirección de recogida arriba, título con el conteo real, línea de puntos en Los Compas y cuadrícula de 2 columnas (foto, nombre, presentación, precio y "Agregar"). El agotado dice "Agotado" en ladrillo y no tiene botón. La barra terracota "Ver carrito, 2 piezas, $420" aparece abajo solo si el carrito es de esta sucursal.
- **Carrito**: título "2 piezas por $420", líneas con miniatura y contador de 48 dp (en 0 se quita), bloque hundido para canjear puntos (solo si son del mismo negocio: "Tienes 27 puntos en Los Compas: $27 de descuento"), subtotal, descuento, total y puntos que ganas. Fijo abajo: "Se recoge en Av. Obregón y Calle 5, no hay envío" y "Pagar $393 con tarjeta".
- **Pedido confirmado**: "Pagado con Visa terminada en 4242", folio como título, bloque hundido con dónde, horario de hoy y qué mostrar al recoger, y línea de tiempo tipográfica (Pagado, Listo para recoger, Entregado).

Pago: `src/services/payments.js` deja escrito el flujo real con `@stripe/stripe-react-native` (PaymentSheet) y por ahora simula el resultado. Para conectarlo falta: el backend que cree el PaymentIntent y confirme con el webhook, instalar el SDK y hacer un build de desarrollo (PaymentSheet no corre en Expo Go ni en web). El monto siempre lo calcula el servidor.

Datos agregados (en `src/data/shop.js`): existencias de Los Compas Norte (pomada 3, cera 5) y Navaja Fina (aceite 4, pomada 8); Estudio Marisol sin productos; descripciones y modo de uso; regla de puntos de ejemplo ($10 = 1 punto, 1 punto = $1, la del lote W8); pedidos anteriores P-2264 (entregado) y P-2250 (cancelado con reembolso), que usa el lote M6. Solo la pomada usa una foto real (`producto-frasco.jpg`); los otros productos muestran el bloque con el nombre de archivo esperado.

También: el perfil de sucursal ahora tiene la sección "Productos para recoger aquí" con acceso a la tienda.

## Lote M6: pedidos, reseñas, reportes, puntos y notificaciones (hecho)

La pestaña **Cuenta** (`/cuenta`) es ahora la entrada a todo esto, además de Editar perfil y Cerrar sesión.

| Pantalla | Ruta | RF | Estados (`?estado=`) |
| --- | --- | --- | --- |
| Cuenta | `/cuenta` | RF-M02, M11, M14 a M16 | `cargando`, `sin-conexion` |
| Mis pedidos | `/pedidos` | RF-M11 | `sin-pedidos`, `cargando`, `error`, `sin-conexion` |
| Detalle de pedido | `/pedido/P-2279` (listo), `P-2264` (entregado con puntos), `P-2250` (cancelado y reembolsado) | RF-M11, RN-06, RN-17 | `cargando`, `sin-conexion`, folio inexistente |
| Calificar | `/calificar?cita=C-10431` | RF-M12, RN-08 | `error-enviar`, `sin-conexion`; bloqueado si ya se calificó (C-10402) o no se atendió (C-10370) |
| Reportar | `/reportar` (elige la cita) o `/reportar?cita=C-10431` | RF-M13, RN-15 | `error-enviar`, `sin-conexion`; bloqueado si ya se reportó (C-10370) o no hay citas reportables |
| Mis reportes | `/reportes` | RF-M14 | `sin-reportes`, `cargando`, `sin-conexion` |
| Puntos | `/puntos` | RF-M15, RN-09 | `sin-puntos`, `cargando`, `sin-conexion` |
| Notificaciones | `/notificaciones` | RF-M16 | `permiso-desactivado`, `sin-notificaciones`, `cargando`, `sin-conexion` |

Qué hace cada una:
- **Pedidos:** estados pagado, listo para recoger, entregado y cancelado con reembolso por Stripe. Muestra fechas de cada paso, sucursal donde se recoge, lo pagado, los puntos usados y ganados, y la referencia de pago.
- **Calificar:** 1 a 5 estrellas y reseña. Al publicar, la reseña aparece primero en la página de la sucursal y el promedio se recalcula (Los Compas pasa de 212 a 213 reseñas).
- **Reportar:** cita relacionada, motivo (trato, puntualidad, higiene, calidad del servicio u otro) y descripción, con el texto C12: "Solo lo ven el Jefe de [negocio] y el Administrador de SNIPP. [Empleado] no verá tu reporte ni tus datos." Al enviarse queda en estado "Enviado".
- **Mis reportes:** cada reporte con su estado (enviado, en revisión, atendido).
- **Puntos:** saldo por negocio, regla del negocio, movimientos (citas atendidas, compras, canjes) y acceso a la tienda donde se canjean. El saldo sale de los movimientos y el pago en el carrito descuenta y suma puntos.
- **Notificaciones:** lista agrupada en Hoy, Ayer y Antes; cada una abre la cita o el pedido. Reservar, cancelar y reagendar en la demo agregan la notificación correspondiente. El push real con OneSignal está documentado en `src/services/notifications.js` (fase 5).

Datos agregados: cita C-10318 (atendida, calificada y con reporte atendido), descripción y motivo en los reportes, pedido P-2279 listo para recoger, canje de 73 puntos en P-2264 y movimientos de puntos que suman 27 en Barbería Los Compas (`src/data/shop.js`), notificaciones de ejemplo (`src/data/notifications.js`).

## Lote W1 (web): acceso y registro (hecho)

Pantalla dividida: foto real del negocio a la izquierda y formulario a la derecha; debajo de 768 px la foto se oculta. Misma identidad SNIPP en escala de grises que la app (tokens en `web/src/app/globals.css`), títulos en Montserrat y texto en Onest a 15 px.

| Pantalla | Ruta | RF | Estados (`?estado=`) |
| --- | --- | --- | --- |
| Entrar (los tres roles comparten pantalla) | `/entrar` | RF-W03, RF-W04 | `credenciales`, `cargando`, `sin-conexion`, `error-servidor` |
| Recuperar contraseña | `/recuperar` | RF-W03 | `enviado`, `cargando`, `sin-conexion`, `error-servidor` |
| Crear contraseña nueva (desde el enlace del correo) | `/restablecer?token=` | RF-W03, RNF-G03 | `enlace-vencido`, `listo`, `sin-conexion`, `error-servidor` |
| Registro de Jefe con negocio y plan | `/registro/negocio` | RF-W01, RF-W27, RN-13 | `correo-registrado`, `cargando-planes`, `sin-planes`, `sin-conexion`, `error-servidor`, `listo` |
| Registro de Empleado sin negocio | `/registro/empleado` | RF-W02 | `correo-registrado`, `sin-conexion`, `error-servidor`, `listo` |
| Después de entrar | `/panel` | RF-W03 | Provisional: muestra con qué cuenta y rol entraste y deja cerrar sesión. El lote W2 lo reemplaza por el panel. |

Detalles:
- **Registro de Jefe:** pide nombre, correo, teléfono, contraseña, nombre del negocio y plan, que son los datos de RF-W01. Los planes vienen de los que crea el Administrador (RF-W27); en `data/demo.js` hay tres de ejemplo: Mensual $499, Semestral $2,694 y Anual $4,990. Dice "Tu primer mes es gratis: el cobro empieza el sábado 12 de diciembre", calculado a un mes de hoy. Sin planes publicados no deja registrarse.
- **Registro de Empleado:** nombre, correo y contraseña. La cuenta queda sin negocio y explica cómo unirse a uno: por invitación del Jefe o mandando una solicitud (RF-W10, lote W5).
- **Recuperar:** responde igual exista o no el correo, para no revelar qué correos tienen cuenta. La página de contraseña nueva sirve también para los clientes de la app.
- Las llamadas a la API están simuladas en `web/src/services/auth.ts`.

### Lote W2 (web): estructura del panel

| Ruta | Qué es | Estados (`?estado=`) |
| --- | --- | --- |
| `/panel` | Abre la sección de inicio de cada rol: Jefe → Inicio, Empleado → Mis citas (o Mi perfil si no tiene negocio), Administrador → Negocios | `cargando`, `sin-conexion`, `error-servidor` |
| `/panel/:seccion` | Menú lateral con solo las secciones del rol (RF-W04, RN-10). Una sección de otro rol, aunque se escriba la dirección, muestra "No tienes acceso a esta sección" | – |
| Selector de sucursal | Solo el Jefe. Lo siguen Inicio, Agenda, Pedidos y Productos. Las sucursales desactivadas siguen en la lista con "(desactivada)" | `sin-sucursales` |
| Aviso de vencimiento | Solo el Jefe, desde 7 días antes de que termine la prueba gratuita o el periodo pagado (RF-W25) | `aviso-prueba`, `aviso-suscripcion` |
| `/pago-pendiente` | Al entrar con la suscripción vencida, el Jefe y cada Empleado ven que el negocio no se muestra en la app ni recibe reservas, que las citas ya agendadas se respetan y que al pagar vuelve solo (RF-W26, RN-13). Después pueden entrar al panel, donde queda un aviso fijo | `vencida` |

- Menú del Jefe: Inicio, Agenda, Pedidos · Sucursales y servicios, Empleados, Productos e inventario, Puntos de lealtad · Reportes, Reseñas · Suscripción.
- Menú del Empleado: Agenda, Pedidos, Mi historial de citas · Mi perfil. Sin negocio, solo Mi perfil. No ve Reportes (RN-10).
- Menú del Administrador: Negocios, Planes, Reseñas reportadas.
- Debajo de 1024 px el menú se abre como panel lateral con el botón "Menú" (tableta, RNF-W03).
- Cada sección todavía muestra en qué lote se construye (W3 a W9) y qué requerimientos cubre.
- Los datos del negocio, sucursales y suscripción están simulados en `web/src/services/panel.ts` y `web/src/data/demo.ts`; el menú por rol, en `web/src/data/nav.ts`.

### Lote W3 (web): inicio del Jefe

| Ruta | Qué es | Estados (`?estado=`) |
| --- | --- | --- |
| `/panel/inicio` | **Por revisar** (de todo el negocio): cada reporte nuevo de un cliente (RF-W14), las solicitudes de ingreso a una sucursal (RF-W10) y las de migración desde otro negocio, con el día en que caducan (RF-W12, RN-11). **Métricas de la sucursal** elegida en el selector, para un periodo: citas atendidas y no atendidas, ventas de la tienda, calificación promedio, productos más vendidos y una tabla por Empleado con sus citas y su calificación (RF-W22) | `sin-pendientes`, `sin-datos`, `cargando-metricas`, `error-metricas`, `sin-sucursales` |

- Periodos: últimos 7 días, este mes, el mes pasado o "Elegir fechas" (desde y hasta). Las fechas se validan: la de inicio no puede ser posterior a la final ni anterior al inicio de los registros, y no hay registros después de hoy.
- Los pedidos cancelados y reembolsados por Stripe no cuentan como venta (RN-06); el dato dice cuántos se dejaron fuera.
- No hay comparación con el mes anterior ni "pedidos listos sin entregar": el SRS no los pide.
- Por Empleado se muestran citas y calificación; las ventas van por sucursal porque el SRS no liga los pedidos a un Empleado (decisión D7 del plan, pendiente de confirmar).
- El número junto a "Reportes" en el menú es el aviso de reportes nuevos; se ve en todas las páginas del Jefe.
- Los registros de ejemplo se generan siempre iguales en `web/src/services/dashboard.ts`, así que cualquier periodo da sumas que cuadran entre las cifras y la tabla.

### Lote W4 (web): sucursales y servicios

| Ruta | Qué es | Estados (`?estado=`) |
| --- | --- | --- |
| `/panel/sucursales` | Lista de sucursales con portada, estado, dirección, teléfono, servicios activos y fotos. Abajo, la anticipación con la que los clientes pueden cancelar o reagendar en la app: 2 horas por defecto, para todo el negocio (RF-W08) | `sin-sucursales`, `error-guardar`, `sin-conexion-guardar` |
| `/panel/sucursales/nueva` | Registrar sucursal: nombre, dirección, teléfono, descripción, horario por día y fotos (RF-W05). Al guardar abre la pestaña de servicios con el aviso de que sin servicios activos no se puede reservar | `error-guardar` |
| `/panel/sucursales/:id` | Pestaña "Datos, horario y fotos": editar todo, agregar, cambiar o quitar fotos y elegir la portada (RF-W06). Abajo, desactivar con confirmación; desactivada, un aviso para reactivarla con sus datos intactos (RF-W09, RN-14). Una sucursal de otro negocio muestra "No encontramos esta sucursal" (RNF-W04) | `error-guardar` |
| `/panel/sucursales/:id?vista=servicios` | Servicios de la sucursal: agregar, editar (nombre, descripción, duración, precio) y activar o desactivar; uno inactivo no se ofrece en la app y las citas ya agendadas se respetan (RF-W07, RN-14) | `error-guardar` |

- Fotos: solo JPG o PNG de hasta 5 MB; cada archivo rechazado dice por qué (RNF-W05). La API las optimiza antes de mostrarlas en la app.
- Validaciones: nombre, dirección y teléfono de 10 dígitos; en el horario, la hora de cierre después de la de apertura y al menos un día abierto; en servicios, duración en minutos enteros y precio mayor que cero.
- El selector de sucursal del menú se actualiza al registrar, renombrar o desactivar una sucursal (la desactivada sale con "(desactivada)").
- No hay "vista previa de cómo se ve en la app": el SRS no la pide.
- Los datos viven en memoria en `web/src/services/branches.ts`; al recargar la página vuelven los de ejemplo.

### Lote W5 (web): Empleados

| Ruta | Quién | Qué es | Estados (`?estado=`) |
| --- | --- | --- | --- |
| `/panel/empleados` | Jefe | Invitar por correo a una sucursal; solicitudes de ingreso y de migración con "Aceptar" (pide el horario de trabajo) y "Rechazar"; "Por llegar" (migraciones aceptadas e invitaciones enviadas); Empleados por sucursal con especialidades, horario y migración pendiente (RF-W10) | `migracion-pendiente`, `error-guardar` |
| `/panel/empleados/:id` | Jefe | Perfil (lo edita el Empleado), horario de trabajo editable, historial de citas (RF-W17) y desvincular (RF-W13). Con migración pendiente: "¿Quién toma sus citas?" (RF-W12, RN-11) | `migracion-pendiente`, `error-guardar` |
| `/panel/perfil` | Empleado | Foto, nombre visible y especialidades (RF-W11). Con negocio: solicitar migración, solicitud enviada, caducada o aceptada (RF-W12). Sin negocio: aceptar una invitación o pedir unirse a una sucursal (RF-W10) | `migracion-enviada`, `migracion-caducada`, `migracion-aceptada`, `invitacion`, `error-guardar` |
| `/panel/historial` | Empleado | Su propio historial de citas, igual al que ve su Jefe (RF-W17) | – |

- **Reasignar citas** (migración y desvincular): para cada cita futura el sistema propone a otro Empleado de la sucursal que trabaje a esa hora y esté libre; el Jefe la confirma o la cambia. Si nadie está libre, en una migración la atiende el mismo Empleado y en un desvínculo se cancela con aviso al cliente. Reagendar a otro día se hace desde la Agenda (W6).
- La migración se completa cuando al Empleado no le quedan citas; el Jefe ve el aviso en Empleados. Las citas, reseñas e historial se quedan en el negocio (RN-12).
- Óscar Félix es el único Empleado de Los Compas Norte: al desvincularlo nadie está libre para sus citas (caso de RN-11).
- Itzel Duarte es recepcionista: no recibe citas, así que no tiene historial de citas.
- La solicitud de migración caduca a los 7 días sin respuesta; el Empleado puede volver a enviarla.
- "Rechazar" una solicitud no aparece en el SRS; ver la decisión D9 del plan.
- Los datos viven en memoria en `web/src/services/staff.ts` y `web/src/data/staff.ts`.

### Lote W6 (web): agenda y citas

| Ruta | Quién | Qué es | Estados (`?estado=`) |
| --- | --- | --- | --- |
| `/panel/agenda` | Jefe | Agenda de la sucursal del selector, por día (una columna por Empleado, con su horario, bloqueos y la hora actual) o por semana. Filtro por Empleado; con uno elegido, "Reasignarlas" y "Cancelarlas" para todas sus citas futuras (RF-W16) | `error-guardar` |
| `/panel/citas` | Empleado | Su agenda: "Mis citas" o "Toda la sucursal"; puede ver todas pero solo cambiar las suyas (RF-W18, RN-03) | `error-guardar` |

- **Cita** (al tocarla): cambiar estado (confirmada, atendida, no asistió, Empleado no se presentó, cancelada; las tres de en medio cuando ya llegó la hora), reagendar a una hora libre del mismo Empleado, pasarla a otro Empleado libre (solo Jefe) o cancelarla. Cada cambio avisa al cliente; si cambia la fecha, la hora o el Empleado, la cita queda "Esperando respuesta del cliente" hasta que la acepte, la reagende o la cancele desde la app (RN-04).
- **Bloquear horario** (RF-W15): unas horas o días completos, con motivo (descanso, vacaciones u otro). La app deja de ofrecer ese horario. Si ya hay citas ahí, avisa que no se cancelan solas.
- Las horas libres para reagendar respetan el horario del Empleado, sus bloqueos y sus otras citas (RN-01).
- Las acciones de la agenda suman al historial del Empleado (RF-W17) con quién las hizo.
- Las citas de ejemplo (del 9 al 21 de noviembre) se generan siempre iguales en `web/src/data/staff.ts`; la agenda y la reasignación de W5 usan las mismas.

### Lote W7 (web): reportes y reseñas (solo Jefe)

| Ruta | Qué es | Estados (`?estado=`) |
| --- | --- | --- |
| `/panel/reportes` | Bandeja de reportes de clientes sobre los Empleados: filtros Nuevos, En revisión y Atendidos, y por Empleado; con un Empleado elegido, su historial de reportes en este negocio (RF-W14, RN-16) | `sin-reportes` |
| `/panel/reportes/:id` | Texto del cliente, cita, sucursal; seguimiento con "Pasar a en revisión" y "Marcar como atendido" (el cliente ve el nuevo estado en "Mis reportes" de la app, RF-M14); notas internas que solo ve el Jefe | `error-guardar` |
| `/panel/resenas` | Calificación de cada sucursal y reseñas más recientes, con filtro por sucursal. "Reportar al Administrador" pide el motivo (y la explicación si es "Otro"); la reseña sigue visible hasta que el Administrador decida (RF-W23) | `sin-resenas`, `error-guardar` |

- El número junto a "Reportes" en el menú y la lista de Inicio cuentan los reportes nuevos; al pasarlos a revisión dejan de contar.
- El Empleado no tiene acceso a Reportes ni a Reseñas, ni escribiendo la dirección (RN-10, RN-15).
- En la ficha de cada Empleado aparece cuántos reportes tiene, con enlace a su historial.
- Los reportes R-102 (Luis, puntualidad) y R-088 (Ramón, higiene) son los mismos que ve la clienta Andrea en la app móvil.
- Los datos viven en memoria en `web/src/services/reports.ts`.

### Lote W8 (web): productos, inventario, pedidos y lealtad

| Ruta | Quién | Qué es | Estados (`?estado=`) |
| --- | --- | --- | --- |
| `/panel/productos` | Jefe | Productos de la sucursal del selector con precio y existencias (agotado o quedan pocas), "Ajustar existencias" con motivo y movimientos de inventario (RF-W19, RF-W20) | `sin-productos`, `error-guardar` |
| `/panel/productos/nuevo` y `/panel/productos/:id` | Jefe | Foto (JPG o PNG hasta 5 MB), nombre, presentación, precio, existencias iniciales, descripción y cómo se usa; al editar, los movimientos de ese producto | `error-guardar` |
| `/panel/pedidos` y `/panel/pedidos/:folio` | Jefe y Empleado | Por entregar, entregados, cancelados. Detalle con artículos, descuento con puntos, total pagado con Stripe y referencia. "Marcar listo para recoger", "Marcar entregado" y "Cancelar y reembolsar" con motivo (RF-W21, RN-06) | `sin-pedidos`, `error-guardar`, `error-stripe` |
| `/panel/puntos` | Jefe | Pesos por punto en citas atendidas y en compras, y cuánto vale un punto al canjear, con ejemplos que cambian al escribir (RF-W24, RN-09) | `error-guardar` |

- Las existencias bajan cuando se confirma el pago de un pedido (RN-07); por ejemplo, P-2281 (2 pomadas) aparece como −2 en los movimientos.
- Al cancelar un pedido pagado, Stripe devuelve el total y las piezas regresan a las existencias (no salieron de la sucursal). Si Stripe falla, el pedido sigue pagado.
- El Empleado ve y cambia los pedidos de su sucursal, pero no Productos ni Puntos (RN-10).
- Los productos, existencias y pedidos P-2279, P-2264 y P-2250 son los mismos de la app móvil; las reglas de puntos de ejemplo (1 punto por cada $10, 1 punto = $1) también.
- Los datos viven en memoria en `web/src/services/shop.ts`.

### Lote W9 (web): suscripción y Administrador

| Ruta | Quién | Qué es | Estados (`?estado=`) |
| --- | --- | --- | --- |
| `/panel/suscripcion` | Jefe | Plan y vencimiento (en prueba, pagada, por vencer o pago pendiente); elegir plan y pagar o renovar con Stripe, que extiende la fecha desde el vencimiento o desde hoy si ya venció; historial de pagos con referencia (RF-W25, RN-13, RN-17) | `aviso-prueba`, `aviso-suscripcion`, `vencida`, `error-pago`, `sin-planes` |
| `/panel/negocios` | Administrador | Cada negocio con su estado de pago, último pago y si se ve en la app; filtros por pago pendiente, por vencer, en prueba y suspendidos; suspender y activar con confirmación (RF-W27, RF-W28) | `error-guardar` |
| `/panel/planes` | Administrador | Crear y editar planes (nombre, precio, duración en meses, si se ofrece); un plan creado aparece al registrar un negocio y al pagar (RF-W27) | `sin-planes`, `error-guardar` |
| `/panel/resenas-reportadas` | Administrador | Reseñas que reportaron los Jefes, con el negocio, el motivo y la explicación; "Eliminar reseña" (sale de la app y de la calificación) o "Mantenerla"; el Jefe ve la decisión en Reseñas (RF-W28) | `error-guardar` |

- Al pagar una suscripción vencida, el aviso de pago pendiente desaparece y el negocio vuelve a la app (RN-13).
- El pago se simula: en producción ese paso abre el formulario de Stripe y SNIPP solo guarda la referencia (RN-17).
- Las fechas de otro año llevan el año ("viernes 3 de diciembre de 2027").
- Decisiones abiertas del plan: D10 ("Se ofrece" en planes y "Mantenerla" en reseñas) y D11 (qué ve el panel de un negocio suspendido).
- Los datos viven en memoria en `web/src/services/subscriptions.ts`.

## Fotos

Las fotos originales se optimizaron a 1400 px en `mobile/assets/photos/`. Ojo: `barberia-fachada.jpg` tiene el letrero con texto deformado ("Hugo prago… El echa derrilo"); si se usa como portada conviene recortarlo o reemplazarlo por una fachada real.

## Actualización al SRS v1.1 (fases 1 y 2 del plan)

Identidad:
- Nombre **SNIPP** en `app.json` (`slug: snipp`, `scheme: snipp`, paquete Android `mx.snipp.app`) y en todos los textos. Sin bloque iOS (fuera de alcance).
- Logo: ícono, ícono adaptable, monocromo, splash y favicon generados de `brand/snipp-logo.png`; componente `Logo` (isotipo + palabra) en Entrar e Inicio.
- Paleta en escala de grises (`theme/tokens.js`): fondo `#F5F5F5`, superficie `#FFFFFF`, hundido `#E8E8E8`, tinta `#141414`, tinta secundaria `#595959`. Las fotos de los negocios conservan su color (decisión D1).
- Estados sin color: `StatusLine` usa ícono + texto (palomita confirmada/atendida, reloj pendiente, X cancelada/no se presentó). Los avisos de error llevan ícono.
- Títulos en Montserrat (combina con el logo), texto en Onest.

Quitado por no estar en el SRS (Q1–Q13): "Lo más buscado", distancias y orden por cercanía, enlace a Google Maps, "Cualquiera disponible", nota para la sucursal, "Agregar a mi calendario", motivos de cancelación, cambio de profesional al reagendar, botones de "Llamar", "Cliente desde", línea de Términos y Aviso de privacidad, marca y últimos dígitos de la tarjeta (ahora "Pagado con tarjeta por Stripe" y la referencia de pago).

Corregido (C1–C11):
- Disponibilidad: sin hora mínima inventada; las citas reservadas ocupan su horario y las canceladas lo liberan; al reagendar, la propia cita no se bloquea a sí misma.
- Una reserva nueva se guarda con folio nuevo (C-10501, C-10502…).
- Sucursal sin profesionales: no se puede reservar y se explica por qué.
- La app oculta sucursales desactivadas, servicios inactivos, negocios suspendidos o con suscripción vencida y Empleados en "migración pendiente" (`businessStatus`, `employeeStatus` en `data/catalog.js`).
- El inventario baja al confirmarse el pago.
- Textos: sin plazo de 30 minutos en el enlace de recuperación, sin exigir apellido, sin afirmaciones de privacidad no definidas, sin tiempo estimado del pedido, sin formas de pago en citas, y reportes "los ven el Jefe y el Administrador".
- Fechas de ejemplo en 2026.

Ver la decisión de cada punto en la sección 9 del plan.
