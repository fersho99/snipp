import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircleIcon } from 'phosphor-react-native';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { CANCEL_HOURS, describe, useAppointments } from '../data/appointments';
import { minutesLabel } from '../data/availability';
import { money } from '../theme/format';
import { color, font, radius, space, status } from '../theme/tokens';

// Appointment booked (RF-M06): folio, the appointment in one sentence and
// "Pagas en la sucursal" (RN-05). Defaults to C-10482 when opened directly.
export default function Booked() {
  const { folio = 'C-10482' } = useLocalSearchParams<{ folio?: string }>();
  const all = useAppointments();
  const appt = all.find((a) => a.folio === folio) ?? all.find((a) => a.folio === 'C-10482');
  if (!appt) return null;
  const d = describe(appt);

  return (
    <Screen
      footer={
        // The new appointment is one tap away; Inicio stays as the way out.
        <View style={{ gap: space.s }}>
          <Button label="Ver mi cita" onPress={() => router.replace(`/cita/${appt.folio}`)} />
          <Button variant="secondary" label="Volver al inicio" onPress={() => router.replace('/inicio')} />
        </View>
      }
    >
      <View style={{ marginTop: space.xxxl }}>
        <View style={styles.status}>
          <CheckCircleIcon size={20} color={status.verde.text} weight="fill" />
          <Txt variant="label" style={{ fontFamily: font.bodySemi }}>Cita confirmada, folio {appt.folio}</Txt>
        </View>
        <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.l }}>
          Te esperamos el {d.dateLabel} a las {d.timeLabel}
        </Txt>
        <Txt variant="body" style={{ marginTop: space.m }}>
          {d.service.name} con {d.employee.name} en {d.branch.name}, {d.branch.address}. Termina a las {d.endLabel}.
        </Txt>
      </View>

      <View style={styles.pay}>
        <View style={{ flex: 1 }}>
          <Txt variant="heading">Pagas en la sucursal</Txt>
          <Txt variant="small">La app no cobra las citas.</Txt>
        </View>
        <Txt variant="title" numeric>{money(d.service.price)}</Txt>
      </View>

      <View style={styles.facts}>
        <Txt variant="body">Te mandamos una notificación un día antes y otra una hora antes de tu cita.</Txt>
        <Txt variant="body">
          Puedes cancelarla o reagendarla desde Mis citas hasta {CANCEL_HOURS} horas antes: hasta las {minutesLabel(appt.start - CANCEL_HOURS * 60)} de ese día.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  pay: { marginTop: space.xxl, flexDirection: 'row', alignItems: 'center', gap: space.l, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l },
  facts: { marginTop: space.xl, gap: space.m },
});
