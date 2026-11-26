import { useMemo, useRef, useState, type ComponentRef } from 'react';
import useAction, { wait } from '../hooks/useAction';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { OfflineState, Skeleton } from '../components/States';
import { BookingCalendar, SlotGrid } from '../components/Booking';
import useConnectivity from '../hooks/useConnectivity';
import { CANCEL_HOURS, NOW_NEAR_C10482, appointmentStore, changeWindow, describe, useAppointment } from '../data/appointments';
import { DEMO_TODAY, getEmployee } from '../data/demo';
import { notificationStore } from '../data/notifications';
import { firstOpenDay, groupSlots, iso, lastBookableDate, minutesLabel, slotsFor } from '../data/availability';
import { longDate, minutes, shortDate } from '../theme/format';
import { space } from '../theme/tokens';
import type { LabeledSlot } from '../components/Booking';

// Reschedule (RF-M07): same service, professional and branch; new date and
// time; the folio stays the same. Respects the business's minimum notice
// (RN-03) unless the business made the change (?desdeCambio=1, RN-04).
// Dates up to two months from today (RN-02).
// States: ?estado=menos-de-2h | error (saving fails once) | sin-conexion
export default function Reschedule() {
  const { cita, desdeCambio, estado } = useLocalSearchParams<{ cita?: string; desdeCambio?: string; estado?: string }>();
  const appt = useAppointment(cita ?? 'C-10482');
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const fromChange = desdeCambio === '1';
  const [picked, setPicked] = useState<Date | null>(null);
  const page = useRef<ComponentRef<typeof ScrollView>>(null);
  const [slot, setSlot] = useState<LabeledSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const saving = useAction({ busy: 'Reagendando...', done: 'Cita reagendada', failed: 'No se pudo reagendar' });
  const failNext = useRef(estado === 'error');

  const d = appt && describe(appt);
  // After a business change, the client keeps the professional the business proposed.
  const employeeId = appt ? (fromChange && appt.change?.employeeId ? appt.change.employeeId : appt.employeeId) : null;
  const employee = employeeId ? getEmployee(employeeId) : null;
  // Until the client picks a day, the first one with free hours is shown, so
  // the hours are on screen without another tap.
  const firstDay = useMemo(
    () => (appt && d && employeeId ? firstOpenDay(d.branch, employeeId, d.service.id, d.service.minutes, appt.folio) : null),
    [appt, employeeId],
  );
  const date = picked ?? firstDay;

  const slots = useMemo(() => {
    if (!appt || !date || !d) return [];
    return slotsFor(d.branch, employeeId, d.service.id, date, d.service.minutes, appt.folio)
      .filter((s) => !(iso(date) === appt.date && s.start === appt.start))
      .map((s) => ({ ...s, label: minutesLabel(s.start) }));
  }, [appt, date?.getTime(), employeeId]);

  if (!online) return <OfflineState kind={failure} onRetry={retry} retrying={retrying} />;
  if (!appt || !d || !employee || !employeeId) return null;

  const now = estado === 'menos-de-2h' ? NOW_NEAR_C10482 : DEMO_TODAY;
  const win = changeWindow(appt, now);

  if (!win.allowed && !fromChange) {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>
          Ya no puedes reagendar desde la app
        </Txt>
        <Txt variant="body" style={{ marginTop: space.m }}>
          Tu cita es a las {d.timeLabel}, en {win.minutesLeft} minutos. {d.branch.name} permite cambios desde la app hasta {CANCEL_HOURS} horas antes.
        </Txt>
      </Screen>
    );
  }

  const pickDate = async (day: Date) => {
    setPicked(day);
    setSlot(null);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));
    setLoading(false);
    // The free hours are under the calendar: bring them into view.
    setTimeout(() => page.current?.scrollToEnd({ animated: true }), 50);
  };

  const save = () => saving.run(async () => {
    if (!slot || !date) return { ok: false, reason: 'Elige un nuevo horario.', retry: false };
    await wait(900);
    if (failNext.current) {
      failNext.current = false;
      return { ok: false, reason: 'No pudimos cambiar tu cita. Revisa tu internet e inténtalo de nuevo; tu cita sigue como estaba.' };
    }
    appointmentStore.update(appt.folio, { date: iso(date), start: slot.start, employeeId, status: 'confirmada', change: null, rescheduledFrom: appt.start });
    notificationStore.push({
      kind: 'reagendada',
      title: `Tu cita cambió al ${longDate(date).split(' de ')[0]} a las ${slot.label}`,
      body: `${d.service.name} con ${employee.name} en ${d.branch.name}. Sigue con el folio ${appt.folio}.`,
      route: `/cita/${appt.folio}`,
    });
    const target = `/cita/${appt.folio}?aviso=reagendada`;
    return {
      ok: true,
      message: `Listo: tu cita cambió al ${longDate(date).split(' de ')[0]} a las ${slot.label}`,
      next: () => {
        if (router.canDismiss?.()) router.dismissTo(target);
        else router.replace(target);
      },
    };
  });

  return (
    <Screen
      scrollRef={page}
      footer={
        <Button
          label={slot && date ? `Cambiar al ${longDate(date).split(' de ')[0]} a las ${slot.label}` : 'Elige un nuevo horario'}
          disabled={!slot}
          {...saving.button}
          onPress={save}
        />
      }
    >
      <BackButton />
      <Txt variant="small" style={{ marginTop: space.s }}>{d.branch.name}, folio {appt.folio}</Txt>
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.s }}>
        Cambia tu cita de {d.service.name.toLowerCase()} del {d.dateLabel.split(' de ')[0]} a las {d.timeLabel}
      </Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>
        {fromChange
          ? `Como el cambio lo hizo el negocio, puedes elegir otro horario con ${employee.name} sin importar la anticipación.`
          : `Sigues con ${employee.name} y conservas el folio. Puedes hacer cambios hasta el ${win.deadlineLabel}.`}
      </Txt>

      <Txt variant="small" style={{ marginTop: space.xl }}>
        Puedes elegir hasta el {shortDate(lastBookableDate())}. Los días tachados ya no tienen lugar.
      </Txt>
      <View style={{ marginTop: space.m, marginHorizontal: -space.s }}>
        <BookingCalendar
          branch={d.branch}
          employeeId={employeeId}
          serviceId={d.service.id}
          duration={d.service.minutes}
          selected={date}
          onSelect={pickDate}
          ignoreFolio={appt.folio}
        />
      </View>

      {date ? (
        <View style={{ marginTop: space.xl }}>
          <Txt variant="heading">
            {loading ? `Buscando horarios del ${longDate(date)}` : `${slots.length} ${slots.length === 1 ? 'horario libre' : 'horarios libres'} el ${longDate(date)}`}
          </Txt>
          <Txt variant="small" style={{ marginTop: space.xs }}>
            {d.service.name} de {minutes(d.service.minutes)} con {employee.name}.
          </Txt>
          <View style={{ marginTop: space.l }}>
            {loading ? <Skeleton height={104} radius={10} /> : <SlotGrid groups={groupSlots(slots)} selected={slot?.start} onSelect={setSlot} />}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
