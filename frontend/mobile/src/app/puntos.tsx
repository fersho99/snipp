import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { OfflineState, Skeleton } from '../components/States';
import useConnectivity from '../hooks/useConnectivity';
import { branches } from '../data/catalog';
import { PESOS_PER_POINT_EARNED, PESOS_PER_POINT_SPENT, pointBalances, usePointsLedger } from '../data/shop';
import { money } from '../theme/format';
import { color, font, space } from '../theme/tokens';

// Loyalty points (RF-M15, RN-09): balance per business, how they were earned
// (attended appointments and purchases) and spent, and where they can be used:
// only on products of that same business. Each business sets its rule on the web (RF-W24).
// States: ?estado=sin-puntos | cargando | sin-conexion
export default function Points() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const ledger = usePointsLedger();

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  if (estado === 'cargando') {
    return (
      <Screen>
        <BackButton />
        <View style={{ gap: space.s, marginTop: space.m }} accessible accessibilityLabel="Cargando tus puntos">
          <Skeleton width="80%" height={32} />
          <Skeleton width="65%" height={18} />
          <Skeleton height={52} radius={10} style={{ marginTop: space.xl }} />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={40} style={{ marginTop: space.m }} />)}
        </View>
      </Screen>
    );
  }

  const balances = estado === 'sin-puntos' ? [] : pointBalances(ledger);

  if (!balances.length) {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>Todavía no tienes puntos</Txt>
        <Txt variant="body" style={{ marginTop: space.m }}>
          Los negocios dan puntos por tus citas atendidas y por tus compras en su tienda. Cada negocio define cuántos, y solo los canjeas como descuento en productos de ese mismo negocio.
        </Txt>
        <Button variant="secondary" label="Buscar un negocio" onPress={() => router.replace('/inicio')} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton />
      {balances.map((b, i) => <BusinessPoints key={b.businessId} balance={b} first={i === 0} />)}
    </Screen>
  );
}

function BusinessPoints({ balance, first }: { balance: ReturnType<typeof pointBalances>[number]; first?: boolean }) {
  const store = branches.find((br) => br.businessId === balance.businessId);
  return (
    <View style={{ marginTop: first ? space.m : space.huge }}>
      <Txt variant={first ? 'display' : 'title'} accessibilityRole="header">
        Tienes {balance.points} {balance.points === 1 ? 'punto' : 'puntos'} en {balance.businessName}
      </Txt>
      <Txt variant="body" style={{ marginTop: space.m }}>
        {balance.points
          ? `Valen ${money(balance.points * PESOS_PER_POINT_SPENT)} de descuento en productos de su tienda. No se pueden usar en otro negocio.`
          : 'Ya usaste todos tus puntos de este negocio.'}
      </Txt>
      <Txt variant="small" style={{ marginTop: space.s }}>
        Regla de {balance.businessName}: 1 punto por cada {money(PESOS_PER_POINT_EARNED)} en citas atendidas y compras; cada punto vale {money(PESOS_PER_POINT_SPENT)}.
      </Txt>
      {balance.points && store ? (
        <Button label={`Ir a la tienda de ${store.name}`} onPress={() => router.push(`/tienda/${store.id}`)} style={{ marginTop: space.xl }} />
      ) : null}

      <Txt variant="label" style={{ marginTop: space.xxl }}>Movimientos</Txt>
      <View style={{ marginTop: space.xs }}>
        {balance.movements.map((m, i) => (
          <Pressable
            key={m.id}
            onPress={() => router.push(m.route)}
            accessibilityRole="button"
            accessibilityLabel={`${m.label}, ${m.date}, ${m.points > 0 ? 'más' : 'menos'} ${Math.abs(m.points)} puntos`}
            style={({ pressed }) => [styles.move, i < balance.movements.length - 1 && styles.divider, pressed && { opacity: 0.6 }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="body">{m.label}</Txt>
              <Txt variant="small">{m.date}</Txt>
            </View>
            <Txt variant="body" numeric style={{ fontFamily: font.bodySemi, color: m.points > 0 ? color.ink : color.inkSoft }}>
              {m.points > 0 ? `+${m.points}` : `−${Math.abs(m.points)}`}
            </Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  move: { flexDirection: 'row', alignItems: 'center', gap: space.l, minHeight: 64, paddingVertical: space.s },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
});
