import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { ErrorNote, OfflineState, Skeleton } from '../components/States';
import { Cover, RatingLine, SearchField } from '../components/Branch';
import useConnectivity from '../hooks/useConnectivity';
import { cheapestService, openStatus, visibleBranches } from '../data/catalog';
import { client } from '../data/demo';
import { TabBar } from '../components/Appointment';
import { describe, isUpcoming, startDate, useAppointments } from '../data/appointments';
import { money } from '../theme/format';
import { color, font, space, touch } from '../theme/tokens';
import type { Branch } from '../types/domain';

// Home / search (RF-M05). Upcoming appointment as one line of text, the
// search box, then the businesses as a list of covers with plain-text details.
// States: ?estado=sin-cita | cargando | error | sin-conexion
export default function Home() {
  const { estado } = useLocalSearchParams<{ estado?: string }>();
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const [query, setQuery] = useState('');
  const [failed, setFailed] = useState(estado === 'error');
  const [reloading, setReloading] = useState(false);
  const appointments = useAppointments();

  if (!online) return <OfflineState kind={failure} tabs onRetry={retry} retrying={retrying} />;

  const search = (q: string) => {
    if (!q?.trim()) return;
    router.push({ pathname: '/resultados', params: { q: q.trim() } });
  };

  const reload = async () => {
    setReloading(true);
    await new Promise((r) => setTimeout(r, 900));
    setReloading(false);
    setFailed(false);
  };

  const list = [...visibleBranches()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const appt = estado === 'sin-cita'
    ? null
    : appointments.filter((a) => isUpcoming(a) && a.status !== 'cancelada-negocio').sort((a, b) => startDate(a).getTime() - startDate(b).getTime())[0];
  const next = appt && describe(appt);

  return (
    <Screen bottomBar={<TabBar />}>
      <View style={styles.topBar}>
        <Logo size={32} />
      </View>

      {appt && next ? (
        <Pressable onPress={() => router.push(`/cita/${appt.folio}`)} accessibilityRole="button" accessibilityHint="Abre el detalle de la cita">
          <Txt variant="body" style={styles.next}>
            Tu próxima cita es el <Txt style={styles.strong}>{next.dateLabel.split(' de ')[0]} a las {next.timeLabel}</Txt> con {next.employee.name.split(' ')[0]} en {next.branch.name}.{' '}
            <Txt style={styles.nextLink}>Ver cita</Txt>
          </Txt>
        </Pressable>
      ) : (
        <Txt variant="title" accessibilityRole="header" style={styles.next}>
          {client.firstName}, ¿dónde te toca la próxima?
        </Txt>
      )}

      <View style={{ marginTop: space.xl }}>
        <SearchField value={query} onChangeText={setQuery} onSubmit={search} label="Buscar negocio, servicio o colonia" placeholder="Negocio, servicio o colonia" />
      </View>

      <Txt variant="heading" accessibilityRole="header" style={{ marginTop: space.xxl }}>
        {list.length} negocios en San Luis Río Colorado
      </Txt>

      {failed ? (
        <View style={{ marginTop: space.l, gap: space.l }}>
          <ErrorNote title="No pudimos cargar los negocios">
            El servidor tardó demasiado en responder. Tu cita y tu cuenta no se afectan.
          </ErrorNote>
          <Button variant="secondary" label="Volver a cargar" onPress={reload} loading={reloading} />
        </View>
      ) : estado === 'cargando' ? (
        <ListSkeleton />
      ) : (
        <View style={styles.list}>
          {list.map((b) => (
            <BranchListItem key={b.id} branch={b} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function BranchListItem({ branch }: { branch: Branch }) {
  const status = openStatus(branch);
  const cheapest = cheapestService(branch);
  return (
    <Pressable
      onPress={() => router.push(`/sucursal/${branch.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${branch.name}, ${branch.kind} en ${branch.neighborhood}`}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      <Cover branch={branch} height={196} />
      <View style={styles.itemHead}>
        <Txt variant="heading" style={{ flex: 1 }}>{branch.name}</Txt>
        <RatingLine branch={branch} />
      </View>
      <Txt variant="small" numeric style={{ marginTop: 2 }}>
        {branch.kind} en {branch.address}, {branch.neighborhood}
      </Txt>
      <View style={styles.itemFoot}>
        <Txt variant="small" style={{ color: status.open ? color.ink : color.inkSoft, fontFamily: font.bodyMedium }}>{status.label}</Txt>
        <Txt variant="small" numeric style={{ color: color.ink }}>
          {cheapest.name} desde {money(cheapest.price)}
        </Txt>
      </View>
    </Pressable>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.list} accessible accessibilityLabel="Cargando negocios">
      {[0, 1].map((i) => (
        <View key={i}>
          <Skeleton height={196} radius={16} />
          <View style={styles.itemHead}>
            <Skeleton width="55%" height={20} />
            <Skeleton width={110} height={14} />
          </View>
          <Skeleton width="70%" height={14} style={{ marginTop: space.s }} />
          <Skeleton width="45%" height={14} style={{ marginTop: space.s }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: touch },
  nextLink: { fontFamily: font.bodyMedium, textDecorationLine: 'underline' },
  next: { marginTop: space.l },
  strong: { fontFamily: font.bodySemi },
  list: { marginTop: space.l, gap: space.xxl },
  itemHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.m, marginTop: space.m },
  itemFoot: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.s, marginTop: space.xs },
});
