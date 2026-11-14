# SNIPP: plantillas de frontend

> **Fuente de verdad: SRS v1.1 (13/11/2026).** El plan está en [`../PLAN-ACTUALIZACION-SRS.md`](../PLAN-ACTUALIZACION-SRS.md). Las fases 1 (identidad SNIPP en escala de grises) y 2 (quitar extras y corregir reglas en M1–M5) ya están aplicadas; ver "Actualización al SRS v1.1" al final. Las secciones de lotes de abajo describen cómo se construyeron; donde contradigan al SRS, gana el SRS y la sección final.

- `mobile/`: app de clientes, Expo SDK 58 + React Native (JavaScript) + Expo Router.
- `web/`: panel para Jefe, Empleado y Administrador (React + Tailwind). Pendiente, empieza en el lote W1.

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
