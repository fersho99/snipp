import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { OfflineState, Skeleton } from '../components/States';
import { StatusCard, StatusLine } from '../components/Appointment';
import useConnectivity from '../hooks/useConnectivity';
import { canReport, describe, reasonLabel, reportStatusOf, startDate, useAppointments } from '../data/appointments';
import { font, space } from '../theme/tokens';
import type { Appointment } from '../types/domain';
import { DoneNote } from '../components/Done';

// My reports (RF-M14): each report with its status (enviado, en revisión,
// atendido). The Jefe changes the status on the web and it shows here.
// ?enviado=FOLIO shows the confirmation after sending one.
// States: ?estado=sin-reportes | cargando | sin-conexion
export default function MyReports() {
  const { estado, enviado } = useLocalSearchParams<{ estado?: string; enviado?: string }>();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const all = useAppointments();

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  const reports = estado === 'sin-reportes' ? [] : all.filter((a) => a.report).sort((a, b) => startDate(b).getTime() - startDate(a).getTime());
  const canSendMore = estado !== 'sin-reportes' && all.some(canReport);
  const sent = enviado && all.find((a) => a.folio === enviado && a.report);

  return (
    <Screen footer={canSendMore ? <Button variant="secondary" label="Reportar un problema" onPress={() => router.push('/reportar')} /> : null}>
      <BackButton />
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>Mis reportes</Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        Solo los ven el Jefe de cada negocio y el Administrador de SNIPP. El empleado reportado no ve tus reportes ni tus datos.
      </Txt>

      {sent ? (
        <DoneNote style={{ marginTop: space.xl }}>
          Enviaste tu reporte sobre {describe(sent).employee.name}. Ya aparece en el panel del Jefe de {describe(sent).branch.name}.
        </DoneNote>
      ) : null}

      {estado === 'cargando' ? (
        <View style={styles.list} accessible accessibilityLabel="Cargando tus reportes">
          {[0, 1].map((i) => (
            <View key={i} style={{ gap: space.s }}>
              <Skeleton width={110} height={14} />
              <Skeleton width="75%" height={18} />
              <Skeleton width="60%" height={14} />
              <Skeleton height={44} />
            </View>
          ))}
        </View>
      ) : reports.length ? (
        <View style={styles.list}>
          {reports.map((a) => <ReportItem key={a.folio} appt={a} />)}
        </View>
      ) : (
        <View style={{ marginTop: space.xxl }}>
          <Txt variant="heading">No has enviado reportes</Txt>
          <Txt variant="bodySoft" style={{ marginTop: space.s }}>
            Si algo no estuvo bien con un empleado, puedes reportarlo con el Jefe del negocio desde una cita atendida o en la que no se presentó, una vez por cita.
          </Txt>
        </View>
      )}
    </Screen>
  );
}

function ReportItem({ appt }: { appt: Appointment }) {
  const d = describe(appt);
  const r = appt.report;
  if (!r) return null;
  const status = reportStatusOf(r);
  const meaning = ({
    enviado: `Todavía no lo revisan en ${d.branch.name}.`,
    'en revisión': `El Jefe de ${d.branch.name} lo está revisando.`,
    atendido: `El Jefe de ${d.branch.name} lo marcó como atendido.`,
  } as Record<string, string>)[r.state];
  return (
    <StatusCard tone={status.color} style={{ gap: 2 }}>
      <StatusLine status={status} />
      <Txt variant="body" style={{ fontFamily: font.bodySemi, marginTop: space.xs }}>
        {d.employee.name}: {reasonLabel(r.reason).toLowerCase()}
      </Txt>
      <Txt variant="small">{d.service.name} del {d.dateLabel}, {d.branch.name}</Txt>
      <Txt variant="body" style={{ marginTop: space.s }}>“{r.text}”</Txt>
      <Txt variant="small" style={{ marginTop: space.s }}>Enviado el {r.sentOn}. {meaning}</Txt>
      <Button variant="link" label="Ver la cita" onPress={() => router.push(`/cita/${appt.folio}`)} style={{ alignSelf: 'flex-start' }} />
    </StatusCard>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: space.xxl, gap: space.l },
});
