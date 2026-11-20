import { useRef, useState } from 'react';
import useAction, { wait } from '../../hooks/useAction';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import Button from '../../components/Button';
import { OfflineState, PhotoPlaceholder } from '../../components/States';
import useConnectivity from '../../hooks/useConnectivity';
import { CANCEL_HOURS, appointmentStore, describe, useAppointment } from '../../data/appointments';
import { getEmployee } from '../../data/demo';
import { fromIso, minutesLabel } from '../../data/availability';
import { longDate, money, photoFile } from '../../theme/format';
import { color, font, space } from '../../theme/tokens';

// The business changed professional, date or time. The client accepts,
// reschedules or cancels, with no minimum-notice limit.
// States: ?estado=error (the first answer fails) | sin-conexion
export default function ChangeNotice() {
  const { folio, estado } = useLocalSearchParams<{ folio?: string; estado?: string }>();
  const appt = useAppointment(folio ?? 'C-10490');
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const accepting = useAction({ busy: 'Aceptando...', done: 'Cambio aceptado', failed: 'No se pudo aceptar' });
  const cancelling = useAction({ busy: 'Cancelando...', done: 'Cita cancelada', failed: 'No se pudo cancelar' });
  const failNext = useRef(estado === 'error');

  if (!online) return <OfflineState kind={failure} onRetry={retry} retrying={retrying} detail="Sin internet no podemos enviar tu respuesta a la barbería. Tu cita sigue igual mientras tanto." />;
  if (!appt) return null;

  const d = describe(appt);

  if (appt.status !== 'cambio') {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" style={{ marginTop: space.m }}>Ya respondiste a este cambio</Txt>
        <Txt variant="bodySoft" style={{ marginTop: space.s }}>Tu cita {appt.folio} quedó para el {d.dateLabel} a las {d.timeLabel} con {d.employee.name}.</Txt>
        <Button variant="secondary" label="Ver la cita" onPress={() => router.replace(`/cita/${appt.folio}`)} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  const ch = appt.change;
  if (!ch) return null;
  const newEmployee = getEmployee(ch.employeeId ?? appt.employeeId);
  const newDate = ch.date ? fromIso(ch.date) : d.date;
  const newStart = ch.start ?? appt.start;
  const proChanged = newEmployee.id !== appt.employeeId;
  const whenChanged = Boolean(ch.date || ch.start);

  const headline = [
    `${d.branch.name} cambió tu cita:`,
    proChanged ? ` ahora te atiende ${newEmployee.name} en lugar de ${d.employee.name}` : '',
    whenChanged ? `${proChanged ? ',' : ''} ahora es el ${longDate(newDate)} a las ${minutesLabel(newStart)}` : '',
    !whenChanged ? ', mismo día y hora.' : '.',
  ].join('');

  const respond = (kind: 'aceptar' | 'cancelar') => (kind === 'aceptar' ? accepting : cancelling).run(async () => {
    await wait(800);
    if (failNext.current) {
      failNext.current = false;
      return { ok: false, reason: 'No pudimos enviar tu respuesta. Revisa tu internet e inténtalo de nuevo; tu cita no cambió.' };
    }
    if (kind === 'aceptar') {
      return {
        ok: true,
        message: `Listo: aceptaste el cambio de tu cita ${appt.folio}`,
        next: () => {
          appointmentStore.update(appt.folio, { status: 'confirmada', employeeId: newEmployee.id, date: ch.date ?? appt.date, start: newStart, change: null });
          router.replace(`/cita/${appt.folio}?aviso=aceptada`);
        },
      };
    }
    return {
      ok: true,
      message: `Listo: cancelaste tu cita del ${d.dateLabel.split(' de ')[0]}`,
      detail: ['No hay ningún cargo.'],
      next: () => {
        appointmentStore.update(appt.folio, { status: 'cancelada-cliente', change: null });
        router.replace(`/cita/${appt.folio}?aviso=cancelada`);
      },
    };
  });
  const busy = accepting.busy || cancelling.busy;

  const footer = confirmCancel ? (
    <View style={{ gap: space.s }}>
      <Txt variant="body" style={{ marginBottom: space.xs }}>¿Cancelar tu cita de {d.service.name.toLowerCase()} del {d.dateLabel.split(' de ')[0]}? La barbería recibe el aviso.</Txt>
      <Button variant="danger" label="Sí, cancelar cita" {...cancelling.button} onPress={() => respond('cancelar')} />
      <Button variant="secondary" label="No, regresar" onPress={() => setConfirmCancel(false)} disabled={busy} />
    </View>
  ) : (
    <View style={{ gap: space.s }}>
      <Button label="Aceptar el cambio" {...accepting.button} onPress={() => respond('aceptar')} />
      <Button variant="secondary" label="Reagendar" disabled={busy} onPress={() => router.push({ pathname: '/reagendar', params: { cita: appt.folio, desdeCambio: '1' } })} />
      <Button variant="link" label="Cancelar cita" disabled={busy} onPress={() => setConfirmCancel(true)} style={{ alignSelf: 'center' }} />
    </View>
  );

  return (
    <Screen footer={footer}>
      <BackButton />
      <Txt variant="small" style={{ marginTop: space.s }}>Aviso de {d.branch.name}, {ch.at}</Txt>
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.s }}>{headline}</Txt>

      {proChanged ? (
        <View style={styles.compare}>
          <Person label="Antes" name={d.employee.name} specialty={d.employee.specialty} struck />
          <Person label="Ahora" name={newEmployee.name} specialty={newEmployee.specialty} />
        </View>
      ) : null}

      <View style={styles.same}>
        <Txt variant="small">{whenChanged ? 'Nuevo horario' : 'Sin cambios'}</Txt>
        <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium }}>
          {longDate(newDate)}, de {minutesLabel(newStart)} a {minutesLabel(newStart + d.service.minutes)}
        </Txt>
        <Txt variant="body" numeric>{d.service.name}, {money(d.service.price)} que pagas en la sucursal</Txt>
        <Txt variant="body">{d.branch.name}, {d.branch.address}</Txt>
      </View>

      {ch.note ? (
        <View style={styles.quote}>
          <View style={styles.quoteBar} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt variant="small">Mensaje de la barbería</Txt>
            <Txt variant="body">“{ch.note}”</Txt>
          </View>
        </View>
      ) : null}

      <Txt variant="small" style={{ marginTop: space.xl }}>
        Como el cambio lo hizo el negocio, puedes responder cuando quieras, aunque falten menos de {CANCEL_HOURS} horas para tu cita.
      </Txt>
    </Screen>
  );
}

function Person({ label, name, specialty, struck }: { label: string; name: string; specialty: string; struck?: boolean }) {
  return (
    <View style={styles.person}>
      <Txt variant="small">{label}</Txt>
      <PhotoPlaceholder compact filename={photoFile(name)} style={styles.personPhoto} />
      <Txt
        variant="body"
        style={[{ fontFamily: font.bodySemi }, struck && { textDecorationLine: 'line-through', color: color.inkSoft, fontFamily: font.body }]}
      >
        {name}
      </Txt>
      <Txt variant="small">{specialty}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  compare: { flexDirection: 'row', gap: space.l, marginTop: space.xl },
  person: { flex: 1, gap: space.xs },
  personPhoto: { height: 96, padding: space.s },
  same: { marginTop: space.xl, gap: 2 },
  quote: { flexDirection: 'row', gap: space.m, marginTop: space.xl },
  quoteBar: { width: 3, borderRadius: 2, backgroundColor: color.inkSoft },
});
