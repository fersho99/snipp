# SNIPP: plantillas de frontend

> **Fuente de verdad: SRS v1.2 (18/11/2026).** El plan y la matriz de trazabilidad están en [`../PLAN-ACTUALIZACION-SRS.md`](../PLAN-ACTUALIZACION-SRS.md). Las secciones de lotes de abajo describen cómo se construyeron; donde contradigan al SRS, gana el SRS.

## Para empezar (todo junto)

```bash
cd frontend/mobile && npm install
cd ../web && npm install
npm run app        # exporta la app a web/public/app
npm run dev        # app en http://localhost:3000/app, panel en http://localhost:3000/entrar
```

Cuentas de prueba:

| Correo | Contraseña | Dónde | Caso |
| --- | --- | --- | --- |
| `andrea.valenzuela@gmail.com` | `compas2025` | App | Cliente con citas, pedidos y puntos |
| `cliente.nuevo@gmail.com` | `compas2025` | App | Cliente sin historial |
| `admin@snipp.mx` | `snipp2026` | Panel | Administrador |
| `martin.salazar@loscompas.mx` | `snipp2026` | Panel | Jefe de Barbería Los Compas (al corriente) |
| `jefe.vencido@elfaro.mx` | `snipp2026` | Panel | Jefe con la suscripción vencida |
| `jefe.suspendido@unascoral.mx` | `snipp2026` | Panel | Jefe de un negocio suspendido |
| `luis.ortega@gmail.com`, `oscar.felix@gmail.com` | `snipp2026` | Panel | Empleados |
| `sofia.ramos@gmail.com` | `snipp2026` | Panel | Empleada sin negocio |

La app solo acepta clientes y el panel solo Jefes, Empleados y Administrador. "Reiniciar datos de demo" vuelve a los datos de ejemplo. Las pruebas están en "Pruebas", más abajo.

- `mobile/`: app de clientes, Expo SDK 58 + React Native + Expo Router, en TypeScript estricto (migrado de JavaScript el 17/11/2026 sin cambiar pantallas, textos ni reglas).
- `web/`: panel para Jefe, Empleado y Administrador: Next.js 16 (App Router) + TypeScript estricto + Tailwind CSS 4. Lotes W1 a W9 hechos; migrado de Vite + JavaScript el 17/11/2026 sin cambiar pantallas, textos ni reglas.

## Correr la app móvil

```bash
cd frontend/mobile
npm install
npx expo start          # Android: tecla "a", o escanea el QR con Expo Go
npx expo start --web    # vista previa en el navegador, en una columna de 390 px
npm run typecheck       # TypeScript estricto, sin generar archivos
```

En `/` hay un índice de desarrollo con cada pantalla y cada estado (`?estado=...`). Solo existe en desarrollo; la APK abre directo en "Entrar".

Cuentas de cliente (contraseña `compas2025`):
- `andrea.valenzuela@gmail.com` (Andrea Valenzuela): con citas, pedidos y puntos
- `cliente.nuevo@gmail.com` (Daniel Ochoa): sin historial

Sin sesión, cualquier pantalla manda a Entrar; con sesión, Entrar y Registro mandan a Inicio. El registro crea una cuenta de verdad en la base simulada (un correo repetido muestra "correo ya registrado"), y "Cerrar sesión" la cierra. La sesión dura 8 horas.

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

| Correo | Rol | Caso |
| --- | --- | --- |
| `admin@snipp.mx` | Administrador (Daniela Ibarra) | Planes, negocios, reseñas reportadas |
| `martin.salazar@loscompas.mx` | Jefe (Martín Salazar) | Barbería Los Compas al corriente, 2 sucursales |
| `jefe.vencido@elfaro.mx` | Jefe (Rogelio Tapia) | Barbería El Faro, suscripción vencida: pantalla de pago pendiente |
| `jefe.suspendido@unascoral.mx` | Jefe (Karen Lugo) | Uñas Coral, suspendido por el Administrador |
| `luis.ortega@gmail.com` | Empleado (Luis Ortega) | Sucursal Centro |
| `oscar.felix@gmail.com` | Empleado (Óscar Félix) | Sucursal Norte |
| `sofia.ramos@gmail.com` | Empleado sin negocio (Sofía Ramos) | Ya pidió unirse a Los Compas Centro |

Las contraseñas se guardan solo como hash SHA-256 con sal (`shared/auth.ts`). El registro de Jefe (con su negocio y el mes de prueba) y el de Empleado crean cuentas de verdad. Cada rol ve solo sus secciones; otra sección muestra "No tienes acceso a esta sección". La sesión del panel se guarda en `localStorage` (todas las pestañas la comparten) y dura 8 horas.

En el índice de desarrollo, `/panel?como=jefe|empleado|sin-negocio|admin` abre el panel con esa cuenta sin escribir la contraseña (solo en `npm run dev`).

La estructura de carpetas de la web está en [`web/README.md`](web/README.md).

## App y panel juntos (datos compartidos)

La app y el panel leen la misma base de datos simulada, guardada en el `localStorage` del navegador (`shared/store.ts`, clave `snipp-demo`). Para que la compartan, la app se sirve dentro de la web en `/app`:

```bash
cd frontend/web
npm run app        # exporta la app (Expo web) a web/public/app; repetir tras cambiar la app
npm run dev        # app en http://localhost:3000/app, panel en http://localhost:3000/panel
```

Una cita reservada en `/app` aparece en la agenda del panel, y un cambio hecho en el panel aparece en la app; todo sobrevive a recargar. "Reiniciar datos de demo" (índice de desarrollo, menú del panel y Cuenta en la app) vuelve a los datos de ejemplo. La app en `localhost:8081` o en Android tiene su propia copia en memoria y no se cruza con la web hasta que exista la API.

`frontend/shared/` tiene:

- `types.ts`: los tipos.
- `seed.ts`: el único conjunto de datos de ejemplo (negocios, planes, sucursales, servicios, Empleados, cuentas, productos, existencias, bloqueos, citas, solicitudes, pedidos, puntos, notificaciones, reseñas y reportes). `history.ts` agrega 3 meses de ventas para el dashboard.
- `dates.ts`: las fechas.
- `store.ts`: el almacén, con versión de esquema. Al cambiar la forma de los datos se sube `SCHEMA_VERSION` y los datos guardados se cambian por los de ejemplo.
- Las operaciones con forma de API, que revisan quién las pide:
  - `catalog.ts`: sucursales, servicios, productos, existencias, Empleados, solicitudes e invitaciones.
  - `shop.ts`: carritos, pago, pedidos, reembolsos y lealtad.
  - `feedback.ts`: reportes y reseñas reportadas.
  - `billing.ts`: planes, pagos de suscripción y suspensión.
  - `notifications.ts`: avisos al cliente.
  - `effects.ts`: lo que cada cambio trae consigo (el aviso al cliente, los puntos, la reseña publicada).

Web y app lo importan como `@shared/...`.

### Historia completa en dos pestañas

Con `npm run dev`, abre la app en una pestaña (`/app`, Andrea) y el panel en otra (`/entrar`, Martín). Lo que se hace en un lado aparece en el otro, sin recargar a mano:

1. **Cita.** Andrea reserva en la app y la cita aparece en la agenda del Jefe y del Empleado. Si el panel la cancela, la cambia de hora o de Empleado, o la marca, Andrea la ve así en "Mis citas" y le llega el aviso. Una cita cambiada queda en "Cambio sin respuesta" hasta que Andrea acepta, reagenda o cancela.
2. **Altas.**
   - Lo que el Jefe registra aparece en la app: una sucursal, un servicio, un producto, o un Empleado que acepta (por solicitud o por invitación).
   - Lo que el Jefe desactiva desaparece de la app.
   - Si rechaza una solicitud de ingreso o de migración, el Empleado la ve como «Rechazada» y puede enviar otra a otro negocio.
3. **Venta.**
   - Andrea paga un carrito y el pedido aparece en "Pedidos" de la sucursal.
   - Al pagar bajan las existencias, el dashboard suma la venta y Andrea gana puntos en ese negocio.
   - Cuando el panel marca el pedido como listo, a Andrea le llega el aviso. Si lo cancela, se reembolsa: regresan las piezas y los puntos, y Andrea lo ve como "Cancelado · reembolsado".
4. **Reseñas y reportes.**
   - La reseña de Andrea aparece en la página de la sucursal y en "Reseñas" del Jefe.
   - Su reporte aparece en "Reportes", y el estado que pone el Jefe le llega a la app.
   - El Jefe reporta una reseña al Administrador. Si el Administrador la elimina, sale de la app y del promedio.
5. **Suscripción.** Un negocio vencido o suspendido no aparece en la app. Al pagar (Jefe) o al activarlo (Administrador), vuelve a aparecer.

Las fotos que se suben en el panel solo se ven en esa pestaña, porque son archivos del navegador y no caben en `localStorage`. Si el Jefe cambia un servicio o un producto que comparten varias sucursales (por ejemplo, el precio del Fade en Centro), esa sucursal recibe su propia copia y las demás quedan igual.

## Validaciones y seguridad

- **Validadores compartidos** (`shared/validators.ts`): correo, teléfono de 10 dígitos, nombre (letras, espacios, `.`, `'` y `-`), contraseña (8 a 64 caracteres, con letra y número), precio (mayor que 0), existencias (entero, 0 o más), horarios (inicio antes del fin), fecha de cita (hasta 2 meses, RN-02) e imagen (JPG o PNG hasta 5 MB). `LIMITS` da el largo máximo de cada campo: los formularios lo usan como `maxLength` y los validadores lo revisan. El error sale en rojo debajo del campo y lo escrito se conserva.
- **Reglas de negocio en el almacén** (`shared/rules.ts`, aplicadas en `shared/store.ts`), no solo en la pantalla:
  - Citas: sin encimarse con otra cita ni con un bloqueo (RN-01), hasta 2 meses (RN-02), cancelar o reagendar hasta 2 horas antes (RN-03), una reseña por cita atendida (RN-08), un reporte por cita atendida o con "Empleado no se presentó" (RN-15).
  - No se reserva en un negocio vencido o suspendido, y no aparece en la app (RN-13).
  - Un Empleado solo cambia sus propias citas y no las pasa a otro; el Jefe, las de su negocio (RF-W16 a RF-W18). El cliente solo cambia las suyas, y solo los datos permitidos.
  - Tienda (`shared/shop.ts`): 3 carritos (RN-06), cantidades enteras sin pasar de las existencias (RN-07, RN-18), puntos solo del mismo negocio y sin pasar del saldo ni del total (RN-09), y un mismo pago no crea dos pedidos (RN-20).
- **Prueba desde la consola** (solo con `npm run dev`): en la pestaña del panel, `snippApi` llama al almacén como la cuenta con sesión en la app o en el panel. Por ejemplo, con Andrea en `/app` y Óscar en el panel:

  ```js
  await snippApi.book({ branchId: 'los-compas-norte', employeeId: 'oscar', serviceId: 'fade', date: '2027-03-01', start: 600 })  // rechazada: más de 2 meses
  await snippApi.panelChange('C-10520', { employeeId: 'ramon' })                                                            // rechazada: no es su cita
  ```

- **Inyección:** todo lo que se escribe se guarda y se muestra como texto. No hay `dangerouslySetInnerHTML`, `eval`, `new Function` ni `innerHTML`. La web manda cabeceras de seguridad (`web/next.config.ts`): `Content-Security-Policy` (solo recursos del mismo sitio, sin `object`, sin marcos), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`. `script-src` lleva `'unsafe-inline'` porque Next y la app exportada usan scripts en línea; quitarlo requiere un nonce por página desde el servidor.

### Lo que el backend debe repetir

El frontend solo ayuda a capturar bien: cualquiera puede saltarse la pantalla o editar el `localStorage`. La API debe:

1. **Validar** cada campo con las mismas reglas y largos de `shared/validators.ts`, con listas permitidas, y rechazar lo demás con un código y un mensaje.
2. **Guardar contraseñas con un hash lento** (bcrypt o Argon2 con sal por cuenta). El SHA-256 de la demo es solo para no guardar texto plano.
3. **Usar consultas parametrizadas** (o el ORM) en todo acceso a la base de datos; nunca armar SQL con texto del usuario (RNF-G05).
4. **Autorizar por rol y por negocio** con la cuenta del token, nunca con lo que mande la pantalla: el cliente solo sus citas y pedidos, el Empleado solo sus citas, el Jefe solo su negocio, el Administrador solo planes, negocios y reseñas reportadas.
5. **Revisar las reglas de negocio** de `shared/rules.ts` dentro de una transacción (por ejemplo, RN-01 con un bloqueo o una restricción única para que dos reservas al mismo tiempo no pasen), e idempotencia en pagos y reembolsos (RN-20).
6. **Escapar al mostrar** en correos y notificaciones, y mandar la CSP con nonce para quitar `'unsafe-inline'`.

## Pruebas

```bash
cd frontend/web
npm test           # pruebas unitarias (Vitest), menos de 1 segundo
npm run test:e2e   # de punta a punta (Playwright): exporta la app, compila la web y la prueba en el puerto 3100
npx playwright show-report   # el reporte de la última corrida, con capturas de lo que falló
```

- **Unitarias** (`web/tests/unit`):
  - `validators.test.ts`: cada validador de `shared/validators.ts` con valores buenos, malos y en el límite.
  - `rules.test.ts`: las reglas de `shared/rules.ts` con los datos de ejemplo. Cubre:
    - reservas (RN-01, RN-02, RN-13, RN-14);
    - cambios del cliente (RN-03, RF-W08) y del panel (RF-W16 a RF-W18);
    - reseñas y reportes (RN-08, RN-15);
    - tienda (RN-06, RN-07, RN-09, RN-20).
- **De punta a punta** (`web/tests/e2e`), con la app y el panel en dos pestañas del mismo navegador:
  - `rutas.spec.ts`: rutas protegidas sin sesión, cuentas de la plataforma equivocada, secciones de otro rol (RF-W04) y sesión vencida a las 8 horas (RNF-G03).
  - `flujos.spec.ts`: estas historias:
    - una cita reservada en la app que el panel cancela;
    - una venta (existencias, puntos, pedido listo y aviso);
    - un reembolso;
    - una reseña y un reporte que el Jefe atiende;
    - una reseña que el Jefe reporta y el Administrador elimina, y que sale de la app;
    - una solicitud aceptada;
    - un negocio suspendido y reactivado.
  - `pantallas.spec.ts`: cada pantalla de la app y del panel abre sin la pantalla de error ni errores en la consola. En la tableta y el teléfono mide cada elemento visible, porque la app se desplaza dentro de sus propios contenedores y el ancho de la página no crece aunque algo se salga.
- **Navegadores** (RNF-W03, RNF-M04):
  - Todas las pruebas corren en Chrome.
  - Las rutas y las pantallas también corren en Edge.
  - Las pantallas del panel también corren en una tableta de 820 px, y las de la app en un teléfono de 360 px. En los dos, nada debe salirse de lado.
  - Usan el Chrome y el Edge instalados en la computadora (`channel`). Firefox se revisa a mano. Para agregarlo: `npx playwright install firefox` y un proyecto `firefox` en `playwright.config.ts`.

## Estructura

```
mobile/src/
  app/          pantallas (una ruta por archivo, .tsx)
  components/   Txt, Button, TextField, Screen/BackButton, States (OfflineState, ErrorNote, Skeleton, PhotoPlaceholder)
  theme/        tokens.ts (paleta, espacios, tipografía), format.ts (dinero MXN, horas, fechas)
  data/         lo que la app agrega a los datos de frontend/shared (fotos, reseñas) y almacenes
  types/        domain.ts: tipos del dominio (sucursal, cita, pedido, ...), los mismos que usará la API
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

Datos que se agregaron (no venían en el prompt maestro y se pueden cambiar en `src/data/catalog.ts`): colonias de Los Compas Norte y Navaja Fina, teléfonos, distancias, calificaciones (Los Compas 4.7 de 212 reseñas, Norte 4.5 de 86, Estudio Marisol 4.8 de 143, Navaja Fina sin reseñas), horarios, qué servicios y qué profesionales hay en cada sucursal, y los textos de las reseñas.

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

Reglas de disponibilidad (demo de lo que devolverá la API) en `src/data/availability.ts`: horario de la sucursal, descansos y vacaciones por profesional, citas existentes generadas de forma fija por día, mínimo una hora de anticipación para hoy y anticipación de 2 horas para cancelar. Qué servicios hace cada profesional está en `staffServices`.

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

Estados y reglas en `src/data/appointments.ts`. Es un almacén en memoria para la demo: lo que canceles, aceptes o reagendes se ve en todas las pantallas hasta que recargues la página.

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

Pago: `src/services/payments.ts` deja escrito el flujo real con `@stripe/stripe-react-native` (PaymentSheet) y por ahora simula el resultado. Para conectarlo falta: el backend que cree el PaymentIntent y confirme con el webhook, instalar el SDK y hacer un build de desarrollo (PaymentSheet no corre en Expo Go ni en web). El monto siempre lo calcula el servidor.

Datos agregados (en `src/data/shop.ts`): existencias de Los Compas Norte (pomada 3, cera 5) y Navaja Fina (aceite 4, pomada 8); Estudio Marisol sin productos; descripciones y modo de uso; regla de puntos de ejemplo ($10 = 1 punto, 1 punto = $1, la del lote W8); pedidos anteriores P-2264 (entregado) y P-2250 (cancelado con reembolso), que usa el lote M6. Solo la pomada usa una foto real (`producto-frasco.jpg`); los otros productos muestran el bloque con el nombre de archivo esperado.

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
- **Notificaciones:** lista agrupada en Hoy, Ayer y Antes; cada una abre la cita o el pedido. Reservar, cancelar y reagendar en la demo agregan la notificación correspondiente. El push real con OneSignal está documentado en `src/services/notifications.ts` (fase 5).

Datos agregados: cita C-10318 (atendida, calificada y con reporte atendido), descripción y motivo en los reportes, pedido P-2279 listo para recoger, canje de 73 puntos en P-2264 y movimientos de puntos que suman 27 en Barbería Los Compas (`src/data/shop.ts`), notificaciones de ejemplo (`src/data/notifications.ts`).

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

## Cambios tras la aprobación (17/11/2026)

- **Semáforo en la Agenda web** (`/panel/agenda?como=jefe`, vista Día y Semana): verde confirmada, naranja esperando respuesta, rojo cancelada, gris terminada, con leyenda.
- **Confirmación en verde:** los avisos de acción hecha son verdes en la web y en la app; las acciones sin aviso en la página muestran un aviso breve verde abajo.
- **Carrito siempre visible en la app:** pestaña "Carrito" con contador, ícono con contador en la sucursal, la tienda y el producto, y aviso "Agregaste… al carrito" con "Ver carrito".
- **Carga:** los botones se bloquean y muestran spinner con su texto mientras guardan.

El detalle y los colores están en la sección 12 de [`../PLAN-ACTUALIZACION-SRS.md`](../PLAN-ACTUALIZACION-SRS.md).

## Fotos

Las fotos originales se optimizaron a 1400 px en `mobile/assets/photos/`. Ojo: `barberia-fachada.jpg` tiene el letrero con texto deformado ("Hugo prago… El echa derrilo"); si se usa como portada conviene recortarlo o reemplazarlo por una fachada real.

## Actualización al SRS v1.1 (fases 1 y 2 del plan)

Identidad:
- Nombre **SNIPP** en `app.json` (`slug: snipp`, `scheme: snipp`, paquete Android `mx.snipp.app`) y en todos los textos. Sin bloque iOS (fuera de alcance).
- Logo: ícono, ícono adaptable, monocromo, splash y favicon generados de `brand/snipp-logo.png`; componente `Logo` (isotipo + palabra) en Entrar e Inicio.
- Paleta en escala de grises (`theme/tokens.ts`): fondo `#F5F5F5`, superficie `#FFFFFF`, hundido `#E8E8E8`, tinta `#141414`, tinta secundaria `#595959`. Las fotos de los negocios conservan su color (decisión D1).
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
