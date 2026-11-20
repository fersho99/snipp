import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { OfflineState, Skeleton } from '../components/States';
import { DateBlock, StatusCard, StatusLine, StatusNotice, TabBar } from '../components/Appointment';
import useConnectivity from '../hooks/useConnectivity';
import { canReport, canReview, describe, isUpcoming, startDate, statusOf, useAppointments } from '../data/appointments';
import { color, font, space, stripeWidth, touch } from '../theme/tokens';
import type { Appointment } from '../types/domain';

// My appointments: upcoming and history.
// States: ?estado=sin-citas | cargando | sin-conexion ; ?vista=historial
export default function MyAppointments() {
  const { estado, vista } = useLocalSearchParams<{ estado?: string; vista?: string }>();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const all = useAppointments();
  const [tab, setTab] = useState<'proximas' | 'historial'>(vista === 'historial' ? 'historial' : 'proximas');

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  const upcoming = estado === 'sin-citas' ? [] : all.filter((a) => isUpcoming(a)).sort((a, b) => startDate(a).getTime() - startDate(b).getTime());
  const history = all.filter((a) => !isUpcoming(a)).sort((a, b) => startDate(b).getTime() - startDate(a).getTime());
  const next = upcoming.find((a) => a.status === 'confirmada' || a.status === 'cambio');
  const pendingChange = upcoming.find((a) => a.status === 'cambio');
  const loading = estado === 'cargando';

  return (
    <Screen bottomBar={<TabBar />}>
      {loading ? (
        <Skeleton width="85%" height={58} style={{ marginTop: space.xl }} />
      ) : (
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.xl }}>
          {next ? nextSentence(next) : 'No tienes citas próximas'}
        </Txt>
      )}

      {pendingChange && !loading ? (
        <Pressable onPress={() => router.push(`/cambio/${pendingChange.folio}`)} accessibilityRole="button" style={styles.changeLine}>
          <StatusNotice tone="ambar" icon="atencion">
            <Txt variant="body">
              {describe(pendingChange).branch.name} cambió tu cita del {describe(pendingChange).dateLabel.split(' de ')[0]}.{' '}
              <Txt variant="body" style={styles.linkText}>Revisa el cambio</Txt>
            </Txt>
          </StatusNotice>
        </Pressable>
      ) : null}

      <View style={styles.tabs} accessibilityRole="tablist">
        {([
          ['proximas', 'Próximas', upcoming.length],
          ['historial', 'Historial', history.length],
        ] as const).map(([id, label, count]) => {
          const active = tab === id;
          return (
            <Pressable key={id} onPress={() => setTab(id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.tab}>
              <Txt style={[styles.tabText, active && styles.tabTextActive]}>
                {label} <Txt numeric style={[styles.tabText, active && { color: color.ink }]}>{loading ? '' : count}</Txt>
              </Txt>
              <View style={[styles.tabBar, active && { backgroundColor: color.ink }]} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ListSkeleton />
      ) : tab === 'proximas' ? (
        upcoming.length ? (
          <View style={styles.list}>
            {upcoming.map((a) => <AppointmentRow key={a.folio} appt={a} />)}
          </View>
        ) : (
          <EmptyUpcoming last={history.find((a) => a.status === 'atendida')} />
        )
      ) : (
        <View style={styles.list}>
          {history.map((a) => <AppointmentRow key={a.folio} appt={a} past />)}
        </View>
      )}
    </Screen>
  );
}

function nextSentence(a: Appointment) {
  const d = describe(a);
  const day = d.dateLabel.split(' de ')[0];
  return `Tu próxima cita es el ${day} a las ${d.timeLabel} con ${d.employee.name.split(' ')[0]}`;
}

function AppointmentRow({ appt, past }: { appt: Appointment; past?: boolean }) {
  const d = describe(appt);
  const status = statusOf(appt);
  const inactive = ['cancelada-negocio', 'cancelada-cliente', 'no-asistio'].includes(appt.status);
  return (
    <View>
      <Pressable
        onPress={() => router.push(`/cita/${appt.folio}`)}
        accessibilityRole="button"
        accessibilityLabel={`${d.service.name} con ${d.employee.name}, ${d.dateLabel} a las ${d.timeLabel}, ${status.label}`}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <StatusCard tone={status.color} style={styles.row}>
          <DateBlock date={d.date} muted={inactive} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{d.service.name} con {d.employee.name}</Txt>
            <Txt variant="small" numeric style={{ color: color.ink }}>{d.timeLabel} a {d.endLabel}</Txt>
            <Txt variant="small">{d.branch.name}</Txt>
            <StatusLine status={status} style={{ marginTop: space.xs }} />
          </View>
        </StatusCard>
      </Pressable>

      {past ? <PastActions appt={appt} /> : null}
    </View>
  );
}

function PastActions({ appt }: { appt: Appointment }) {
  const review = canReview(appt);
  const report = canReport(appt);
  const notes = [];
  if (appt.review) notes.push(`Calificaste con ${appt.review.stars} ${appt.review.stars === 1 ? 'estrella' : 'estrellas'}`);
  if (appt.report) notes.push(`Reporte enviado el ${appt.report.sentOn}, ${appt.report.state}`);
  if (!review && !report && !notes.length) return null;
  return (
    <View style={styles.pastActions}>
      {notes.map((n) => <Txt key={n} variant="small">{n}</Txt>)}
      {review || report ? (
        <View style={styles.pastLinks}>
          {review ? <Button variant="link" label="Calificar" onPress={() => router.push({ pathname: '/calificar', params: { cita: appt.folio } })} /> : null}
          {report ? <Button variant="link" label="Reportar un problema" onPress={() => router.push({ pathname: '/reportar', params: { cita: appt.folio } })} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function EmptyUpcoming({ last }: { last?: Appointment }) {
  const d = last && describe(last);
  return (
    <View style={{ marginTop: space.xl }}>
      {d ? (
        <Txt variant="bodySoft">
          La última fue el {d.dateLabel}: {d.service.name.toLowerCase()} con {d.employee.name} en {d.branch.name}.
        </Txt>
      ) : (
        <Txt variant="bodySoft">Cuando reserves, aquí vas a ver la fecha, la hora y quién te atiende.</Txt>
      )}
      <View style={{ marginTop: space.xl, gap: space.s }}>
        {d ? (
          <Button
            label={`Reservar otra vez con ${d.employee.name.split(' ')[0]}`}
            onPress={() => router.push({ pathname: '/reservar', params: { sucursal: d.branch.id, servicio: d.service.id, profesional: d.employee.id } })}
          />
        ) : null}
        <Button variant="secondary" label="Buscar un negocio" onPress={() => router.replace('/inicio')} />
      </View>
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.list} accessible accessibilityLabel="Cargando tus citas">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.row}>
          <View style={{ width: 56, alignItems: 'center', gap: space.xs }}>
            <Skeleton width={36} height={30} />
            <Skeleton width={48} height={12} />
          </View>
          <View style={{ flex: 1, gap: space.s }}>
            <Skeleton width="85%" height={18} />
            <Skeleton width="40%" height={14} />
            <Skeleton width="55%" height={14} />
            <Skeleton width="30%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Past-appointment links line up with the text of the card above.
const stripeOffset = stripeWidth + space.l + 56 + space.l;

const styles = StyleSheet.create({
  changeLine: { marginTop: space.l, minHeight: touch },
  linkText: { fontFamily: font.bodySemi, textDecorationLine: 'underline' },
  tabs: { flexDirection: 'row', gap: space.xl, marginTop: space.xl },
  tab: { minHeight: touch, justifyContent: 'flex-end' },
  tabText: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 22, color: color.inkSoft, paddingBottom: space.s },
  tabTextActive: { fontFamily: font.bodySemi, color: color.ink },
  tabBar: { height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  list: { marginTop: space.xl, gap: space.l },
  row: { flexDirection: 'row', gap: space.l, alignItems: 'flex-start' },
  pastActions: { paddingLeft: stripeOffset, marginTop: space.xs },
  pastLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl },
});
