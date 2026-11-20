import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BellIcon, CoinsIcon, FlagIcon, ReceiptIcon, UserIcon } from 'phosphor-react-native';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import ListRow from '../components/ListRow';
import { OfflineState, Skeleton } from '../components/States';
import { TabBar } from '../components/Appointment';
import useConnectivity from '../hooks/useConnectivity';
import { client } from '../data/demo';
import { useAppointments } from '../data/appointments';
import { pointBalances, useOrders, usePointsLedger } from '../data/shop';
import { useNotifications } from '../data/notifications';
import { space } from '../theme/tokens';

// Account tab: entry to profile, orders (RF-M11), points (RF-M15),
// reports (RF-M14) and notifications (RF-M16).
// States: ?estado=cargando | sin-conexion
export default function Account() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const orders = useOrders();
  const ledger = usePointsLedger();
  const appts = useAppointments();
  const notes = useNotifications();

  if (!online) return <OfflineState kind={failure} tabs onRetry={retry} retrying={retrying} />;
  const loading = estado === 'cargando';

  const ready = orders.find((o) => o.status === 'listo');
  const paid = orders.filter((o) => o.status === 'pagado').length;
  const ordersDetail = ready
    ? `${ready.folio} está listo para recoger`
    : paid
      ? `${paid} ${paid === 1 ? 'pedido pagado' : 'pedidos pagados'}, todavía no ${paid === 1 ? 'está listo' : 'están listos'}`
      : orders.length ? `${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'}` : 'Todavía no has comprado nada';

  const top = pointBalances(ledger)[0];
  const pointsDetail = top ? `${top.points} en ${top.businessName}` : 'Todavía no tienes puntos';

  const reports = appts.filter((a) => a.report);
  const open = reports.filter((a) => a.report?.state !== 'atendido').length;
  const reportsDetail = reports.length
    ? open ? `${open} sin atender de ${reports.length}` : `${reports.length} ${reports.length === 1 ? 'atendido' : 'atendidos'}`
    : 'No has enviado reportes';

  const unread = notes.filter((n) => !n.read).length;
  const notesDetail = unread ? `${unread} sin leer` : 'Estás al día';

  return (
    <Screen bottomBar={<TabBar />}>
      {loading ? (
        <View style={{ marginTop: space.xl, gap: space.s }} accessible accessibilityLabel="Cargando tu cuenta">
          <Skeleton width="70%" height={28} />
          <Skeleton width="55%" height={14} />
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={52} radius={10} style={{ marginTop: space.l }} />)}
        </View>
      ) : (
        <>
          <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.xl }}>{client.name}</Txt>
          <Txt variant="small" style={{ marginTop: space.xs }}>{client.email}</Txt>

          <View style={styles.list}>
            <ListRow Icon={ReceiptIcon} title="Mis pedidos" detail={ordersDetail} onPress={() => router.push('/pedidos')} />
            <ListRow Icon={CoinsIcon} title="Puntos" detail={pointsDetail} onPress={() => router.push('/puntos')} />
            <ListRow Icon={FlagIcon} title="Mis reportes" detail={reportsDetail} onPress={() => router.push('/reportes')} />
            <ListRow Icon={BellIcon} title="Notificaciones" detail={notesDetail} onPress={() => router.push('/notificaciones')} />
            <ListRow Icon={UserIcon} title="Editar perfil" detail="Nombre, teléfono y foto" onPress={() => router.push('/perfil')} last />
          </View>

          <Button variant="link" label="Cerrar sesión" onPress={() => router.replace('/entrar')} style={{ marginTop: space.xl }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space.xl },
});
