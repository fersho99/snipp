import { StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { space } from '../theme/tokens';

// Development index: every screen and every state, for review against the
// SRS. Not part of the shipped app: production builds (the APK) open "Entrar".
const SCREENS = [
  {
    group: 'Cuenta',
    items: [
      { title: 'Inicio de sesión', path: '/entrar', states: [['Credenciales inválidas', 'credenciales'], ['Entrando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Registro', path: '/registro', states: [['Correo ya registrado', 'correo-registrado'], ['Creando cuenta', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Recuperar contraseña', path: '/recuperar', states: [['Enviando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Revisa tu correo', path: '/recuperar-enviado', states: [] },
      { title: 'Editar perfil', path: '/perfil', states: [['Cargando', 'cargando'], ['Error al guardar', 'error-guardar'], ['Sin conexión', 'sin-conexion']] },
    ],
  },
  {
    group: 'Búsqueda y sucursal',
    items: [
      { title: 'Inicio', path: '/inicio', states: [['Sin cita próxima', 'sin-cita'], ['Cargando', 'cargando'], ['Error', 'error'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Resultados de “fade”', path: '/resultados?q=fade', states: [['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Sin resultados (“keratina”)', path: '/resultados?q=keratina', states: [] },
      { title: 'Sucursal: Barbería Los Compas', path: '/sucursal/los-compas-centro', states: [['Cargando', 'cargando'], ['Error', 'error'], ['Sin reseñas', 'sin-resenas'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Sucursal sin reseñas ni fotos: Navaja Fina', path: '/sucursal/navaja-fina', states: [] },
      { title: 'Sucursal: Estudio Marisol', path: '/sucursal/estudio-marisol', states: [] },
    ],
  },
  {
    group: 'Reserva',
    items: [
      { title: 'Elegir servicio', path: '/reservar?sucursal=los-compas-centro', states: [['Sin conexión', 'sin-conexion']] },
      { title: 'Elegir profesional (fade)', path: '/reservar?sucursal=los-compas-centro&servicio=fade', states: [] },
      { title: 'Fecha y hora con Luis', path: '/reservar?sucursal=los-compas-centro&servicio=fade&profesional=luis&fecha=2026-11-19', states: [['Cargando horarios', 'cargando']] },
      { title: 'Confirmación', path: '/reservar?sucursal=los-compas-centro&servicio=fade&profesional=luis&fecha=2026-11-19&hora=16:00', states: [['El horario se ocupa al confirmar', 'horario-ocupado']] },
      { title: 'Sucursal sin profesionales: no se puede reservar (Navaja Fina)', path: '/reservar?sucursal=navaja-fina', states: [] },
      { title: 'Cita reservada C-10482', path: '/reserva-confirmada', states: [] },
    ],
  },
  {
    group: 'Mis citas',
    items: [
      { title: 'Mis citas (próximas)', path: '/citas', states: [['Sin citas próximas', 'sin-citas'], ['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Historial', path: '/citas?vista=historial', states: [] },
      { title: 'Detalle C-10482 (se puede cancelar)', path: '/cita/C-10482', states: [['Faltan menos de 2 horas', 'menos-de-2h'], ['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Detalle cancelada por el negocio C-10486', path: '/cita/C-10486', states: [] },
      { title: 'Detalle atendida, por calificar C-10431', path: '/cita/C-10431', states: [] },
      { title: 'Detalle empleado no se presentó C-10370', path: '/cita/C-10370', states: [] },
      { title: 'Reagendar C-10482', path: '/reagendar?cita=C-10482', states: [['Faltan menos de 2 horas', 'menos-de-2h']] },
      { title: 'Aviso de cambio del negocio C-10490', path: '/cambio/C-10490', states: [['Sin conexión', 'sin-conexion']] },
    ],
  },
  {
    group: 'Tienda y pago',
    items: [
      { title: 'Tienda de Barbería Los Compas', path: '/tienda/los-compas-centro', states: [['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Agregar de otra sucursal (Navaja Fina)', path: '/tienda/navaja-fina?estado=otra-sucursal', states: [] },
      { title: 'Tienda sin productos (Estudio Marisol)', path: '/tienda/estudio-marisol', states: [] },
      { title: 'Producto: Pomada mate', path: '/producto/pomada?sucursal=los-compas-centro', states: [] },
      { title: 'Producto agotado: Shampoo matizador', path: '/producto/shampoo?sucursal=los-compas-centro', states: [] },
      { title: 'Carrito con Pomada y Aceite ($420)', path: '/carrito?demo=lleno', states: [['Pago rechazado', 'pago-rechazado'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Carrito vacío', path: '/carrito?estado=vacio', states: [] },
      { title: 'Pedido confirmado P-2291', path: '/pedido-confirmado', states: [] },
    ],
  },
  {
    group: 'Cuenta, pedidos, reseñas, reportes, puntos y notificaciones',
    items: [
      { title: 'Cuenta (pestaña)', path: '/cuenta', states: [['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Mis pedidos', path: '/pedidos', states: [['Sin pedidos', 'sin-pedidos'], ['Cargando', 'cargando'], ['Error', 'error'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Pedido listo para recoger P-2279', path: '/pedido/P-2279', states: [['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Pedido entregado P-2264 (con puntos)', path: '/pedido/P-2264', states: [] },
      { title: 'Pedido cancelado y reembolsado P-2250', path: '/pedido/P-2250', states: [] },
      { title: 'Calificar C-10431', path: '/calificar?cita=C-10431', states: [['Error al publicar', 'error-enviar'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Calificar una cita ya calificada (C-10402)', path: '/calificar?cita=C-10402', states: [] },
      { title: 'Calificar una cita no atendida (C-10370)', path: '/calificar?cita=C-10370', states: [] },
      { title: 'Reportar: elegir la cita', path: '/reportar', states: [['Sin conexión', 'sin-conexion']] },
      { title: 'Reportar a Luis por C-10431', path: '/reportar?cita=C-10431', states: [['Error al enviar', 'error-enviar']] },
      { title: 'Reportar una cita ya reportada (C-10370)', path: '/reportar?cita=C-10370', states: [] },
      { title: 'Mis reportes', path: '/reportes', states: [['Sin reportes', 'sin-reportes'], ['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Puntos', path: '/puntos', states: [['Sin puntos', 'sin-puntos'], ['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
      { title: 'Notificaciones', path: '/notificaciones', states: [['Permiso desactivado', 'permiso-desactivado'], ['Sin notificaciones', 'sin-notificaciones'], ['Cargando', 'cargando'], ['Sin conexión', 'sin-conexion']] },
    ],
  },
];

export default function ScreenIndex() {
  if (!__DEV__) return <Redirect href="/entrar" />;
  return (
    <Screen>
      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.l }}>Pantallas de SNIPP</Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        Lotes M1 a M6 de la app (RF-M01 a RF-M16), con sus estados. Toca una para abrirla.
      </Txt>
      {SCREENS.map((g) => (
        <View key={g.group} style={{ marginTop: space.xxl }}>
          <Txt variant="heading">{g.group}</Txt>
          {g.items.map((s) => (
            <View key={s.path} style={styles.item}>
              <Button variant="link" label={s.title} onPress={() => router.push(s.path)} />
              <View style={styles.states}>
                {s.states.map(([label, estado]) => (
                  <Button key={estado} variant="link" label={label} onPress={() => router.push(`${s.path}${s.path.includes('?') ? '&' : '?'}estado=${estado}`)} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { marginTop: space.m },
  states: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.l, paddingLeft: space.l },
});
