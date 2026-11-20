import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowsClockwiseIcon, BellIcon, CalendarCheckIcon, ShoppingBagIcon, XCircleIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { OfflineState, Skeleton } from '../components/States';
import { StatusNotice } from '../components/Appointment';
import useConnectivity from '../hooks/useConnectivity';
import { notificationStore, useNotifications } from '../data/notifications';
import { color, font, space } from '../theme/tokens';
import type { AppNotification } from '../types/domain';

const ICON = {
  confirmacion: CalendarCheckIcon,
  'recordatorio-24h': BellIcon,
  'recordatorio-1h': BellIcon,
  cambio: ArrowsClockwiseIcon,
  reagendada: ArrowsClockwiseIcon,
  cancelacion: XCircleIcon,
  'pedido-listo': ShoppingBagIcon,
};
const GROUPS = [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['antes', 'Antes']];

// Notifications received (RF-M16, SRS section 4): confirmation, reminders 24 h
// and 1 h before, changes and cancellations of appointments, order ready.
// Each one opens the appointment or order it talks about.
// States: ?estado=permiso-desactivado | sin-notificaciones | cargando | sin-conexion
export default function Notifications() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const all = useNotifications();

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  const list = estado === 'sin-notificaciones' ? [] : all;
  const unread = list.filter((n) => !n.read).length;

  const open = (n: AppNotification) => {
    notificationStore.markRead(n.id);
    router.push(n.route);
  };

  return (
    <Screen>
      <BackButton />
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>Notificaciones</Txt>
      {estado !== 'cargando' && list.length ? (
        <Txt variant="small" style={{ marginTop: space.xs }}>{unread ? `${unread} sin leer` : 'Ya las leíste todas'}</Txt>
      ) : null}

      {estado === 'permiso-desactivado' ? (
        // SRS v1.2, 4.1: needs the client's attention, so it is an amber notice.
        <StatusNotice tone="ambar" icon="atencion" style={styles.permission}>
          <Txt variant="label" style={{ fontFamily: font.bodySemi }}>Las notificaciones de SNIPP están desactivadas</Txt>
          <Txt variant="small" style={{ color: color.ink }}>
            Así no te llegan los recordatorios de tus citas, los cambios que haga el negocio ni el aviso de que tu pedido está listo. Aquí abajo sigues viendo todo.
          </Txt>
          <Button variant="link" label="Activarlas en Ajustes" onPress={() => Linking.openSettings().catch(() => {})} style={{ alignSelf: 'flex-start' }} />
        </StatusNotice>
      ) : null}

      {estado === 'cargando' ? (
        <View style={{ marginTop: space.xl, gap: space.xl }} accessible accessibilityLabel="Cargando tus notificaciones">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.row}>
              <Skeleton width={24} height={24} radius={12} />
              <View style={{ flex: 1, gap: space.s }}>
                <Skeleton width="80%" height={16} />
                <Skeleton height={14} />
                <Skeleton width="30%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : list.length ? (
        GROUPS.map(([id, label]) => {
          const items = list.filter((n) => n.day === id);
          if (!items.length) return null;
          return (
            <View key={id} style={{ marginTop: space.xxl }}>
              <Txt variant="heading">{label}</Txt>
              <View style={{ marginTop: space.s }}>
                {items.map((n, i) => {
                  const Icon = ICON[n.kind] ?? BellIcon;
                  return (
                    <Pressable
                      key={n.id}
                      onPress={() => open(n)}
                      accessibilityRole="button"
                      accessibilityLabel={`${n.read ? '' : 'Sin leer. '}${n.title}. ${n.body}`}
                      style={({ pressed }) => [styles.row, styles.item, i < items.length - 1 && styles.divider, pressed && { opacity: 0.6 }]}
                    >
                      <Icon size={24} color={n.read ? color.inkSoft : color.ink} weight={n.read ? 'regular' : 'fill'} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt variant="body" style={{ fontFamily: n.read ? font.body : font.bodySemi }}>{n.title}</Txt>
                        <Txt variant="small" style={{ color: n.read ? color.inkSoft : color.ink }}>{n.body}</Txt>
                        <Txt variant="small" numeric>{n.when}</Txt>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })
      ) : (
        <View style={{ marginTop: space.xxl }}>
          <Txt variant="heading">Todavía no tienes notificaciones</Txt>
          <Txt variant="bodySoft" style={{ marginTop: space.s }}>
            Aquí aparecen la confirmación de cada cita, los recordatorios un día y una hora antes, los cambios o cancelaciones que haga el negocio y el aviso de que tu pedido está listo para recoger.
          </Txt>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  permission: { marginTop: space.xl },
  row: { flexDirection: 'row', gap: space.l, alignItems: 'flex-start' },
  item: { paddingVertical: space.l },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
});
