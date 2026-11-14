import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { ErrorNote, OfflineState, PhotoPlaceholder, Skeleton } from '../components/States';
import { BookingCalendar, BookingSentence, SlotGrid } from '../components/Booking';
import useConnectivity from '../hooks/useConnectivity';
import { activeServices, bookableStaff, getBranch, isVisible } from '../data/catalog';
import { appointmentStore } from '../data/appointments';
import { employees, services } from '../data/demo';
import {
  blocksNote, fromHhmm, fromIso, groupSlots, hhmm, iso, lastBookableDate, minutesLabel, slotsFor, staffFor,
} from '../data/availability';
import { longDate, minutes, money, shortDate } from '../theme/format';
import { color, font, radius, space, touch } from '../theme/tokens';

const CANCEL_HOURS = 2; // branch setting: minimum notice to cancel or reschedule

const employeeName = (id) => employees.find((e) => e.id === id)?.name;
const firstName = (id) => employeeName(id)?.split(' ')[0];
const photoFile = (name) => `${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')}.jpg`;

// Booking flow: servicio → profesional → fecha y hora → confirmación.
// No stepper: the appointment is written as a sentence at the top and each
// chosen part can be tapped to change it.
// Deep links: ?sucursal=&servicio=&profesional=&fecha=YYYY-MM-DD&hora=HH:MM
// States: ?estado=horario-ocupado | cargando | sin-conexion
export default function Booking() {
  const p = useLocalSearchParams();
  const found = getBranch(p.sucursal ?? 'los-compas-centro') ?? getBranch('los-compas-centro');
  // Only active services and professionals who can take new appointments (RF-W07, RF-W12).
  const branch = { ...found, services: activeServices(found), staff: bookableStaff(found) };
  const bookable = isVisible(found) && branch.staff.length > 0;
  const { online, retry, retrying } = useConnectivity(p.estado === 'sin-conexion');

  const [serviceId, setServiceId] = useState(p.servicio ?? null);
  const [pro, setPro] = useState(p.profesional ?? null);
  const [date, setDate] = useState(p.fecha ? fromIso(p.fecha) : null);
  const [slot, setSlot] = useState(null);
  const [step, setStep] = useState(() => {
    if (p.hora) return 'confirmar';
    if (p.profesional) return 'fecha';
    if (p.servicio) return 'profesional';
    return 'servicio';
  });
  const [loadingSlots, setLoadingSlots] = useState(p.estado === 'cargando');
  const [submitting, setSubmitting] = useState(false);
  const [taken, setTaken] = useState(null); // slot that got booked by someone else
  const [failNext, setFailNext] = useState(p.estado === 'horario-ocupado');

  const service = services.find((s) => s.id === serviceId);
  const employeeId = pro;

  const slots = useMemo(() => {
    if (!service || !date || !pro) return [];
    return slotsFor(branch, employeeId, service.id, date, service.minutes)
      .filter((s) => !(taken && s.start === taken.start && iso(date) === taken.date))
      .map((s) => ({ ...s, label: minutesLabel(s.start) }));
  }, [branch, employeeId, service, date, pro, taken]);

  // Restore the slot from a deep link once the slots are known.
  useEffect(() => {
    if (p.hora && !slot && slots.length) {
      const wanted = fromHhmm(p.hora);
      setSlot(slots.find((s) => s.start === wanted) ?? null);
    }
  }, [slots]);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} detail="Sin internet no podemos ver los horarios libres ni apartar tu lugar. Lo que ya elegiste se queda aquí." />;

  // RF-M06: a booking needs a professional; a hidden branch takes no bookings (RN-13, RN-14).
  if (!bookable) {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>Todavía no se puede reservar en {found.name}</Txt>
        <Txt variant="bodySoft" style={{ marginTop: space.s }}>
          {isVisible(found) ? 'La sucursal no tiene profesionales registrados para atender citas.' : 'Esta sucursal no está disponible en SNIPP por ahora.'}
        </Txt>
      </Screen>
    );
  }

  // ----- navigation between steps
  const goBack = () => {
    if (step === 'confirmar') setStep('fecha');
    else if (step === 'fecha') setStep('profesional');
    else if (step === 'profesional') setStep('servicio');
    else if (router.canGoBack()) router.back();
    else router.replace('/inicio');
  };

  const pickService = (id) => {
    setServiceId(id);
    setSlot(null);
    if (pro && !staffFor(branch, id).some((e) => e.id === pro)) setPro(null);
    setStep('profesional');
  };

  const pickPro = (id) => {
    setPro(id);
    setSlot(null);
    setStep('fecha');
  };

  const pickDate = async (d) => {
    setDate(d);
    setSlot(null);
    setLoadingSlots(true);
    await new Promise((r) => setTimeout(r, 350));
    setLoadingSlots(p.estado === 'cargando');
  };

  const confirm = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitting(false);
    if (failNext) {
      setFailNext(false);
      setTaken({ start: slot.start, date: iso(date), employeeId: slot.employeeId });
      setSlot(null);
      return;
    }
    // The new appointment takes its slot right away (RF-M06).
    const folio = appointmentStore.add({ serviceId: service.id, employeeId: slot.employeeId, branchId: branch.id, date: iso(date), start: slot.start, status: 'confirmada' });
    router.replace({ pathname: '/reserva-confirmada', params: { folio } });
  };

  // ----- the sentence
  const parts = [];
  if (service) parts.push({ text: service.name, step: 'servicio' });
  if (service && pro) {
    parts.push(' con ');
    parts.push({ text: employeeName(employeeId), step: 'profesional' });
  }
  if (date && step !== 'servicio' && step !== 'profesional') {
    parts.push(', ');
    parts.push({ text: longDate(date), step: 'fecha' });
    if (slot) {
      parts.push(' a las ');
      parts.push({ text: slot.label, step: 'fecha' });
    }
  }

  const footer =
    step === 'fecha' ? (
      <Button label={slot ? `Continuar con las ${slot.label}` : 'Elige un horario'} disabled={!slot} onPress={() => setStep('confirmar')} />
    ) : step === 'confirmar' && slot ? (
      <Button label="Confirmar cita" onPress={confirm} loading={submitting} />
    ) : null;

  return (
    <Screen key={step} footer={footer}>
      <BackButton label={step === 'servicio' ? 'Salir de la reserva' : 'Paso anterior'} onPress={goBack} />
      <Txt variant="small" style={{ marginTop: space.s }}>{branch.name}, {branch.address}</Txt>
      <View style={{ marginTop: space.s }}>
        {parts.length ? (
          <BookingSentence parts={parts} onEdit={(s) => setStep(s)} />
        ) : (
          <Txt variant="title" accessibilityRole="header">¿Qué te vas a hacer?</Txt>
        )}
      </View>

      {step === 'servicio' && <ServiceStep branch={branch} selected={serviceId} onPick={pickService} />}
      {step === 'profesional' && service && <ProStep branch={branch} service={service} selected={pro} onPick={pickPro} />}
      {step === 'fecha' && service && (
        <DateStep
          branch={branch}
          service={service}
          employeeId={employeeId}
          date={date}
          onPickDate={pickDate}
          loading={loadingSlots}
          slots={slots}
          slot={slot}
          onPickSlot={setSlot}
          taken={taken}
        />
      )}
      {step === 'confirmar' && service && date && (
        <ConfirmStep
          branch={branch}
          service={service}
          date={date}
          slot={slot}
          taken={taken}
          alternatives={taken ? [...slots].sort((a, b) => Math.abs(a.start - taken.start) - Math.abs(b.start - taken.start)).slice(0, 3).sort((a, b) => a.start - b.start) : []}
          onPickSlot={(s) => { setSlot(s); }}
          onChangeDate={() => setStep('fecha')}
        />
      )}
    </Screen>
  );
}

// ----------------------------------------------------------------- servicio
function ServiceStep({ branch, selected, onPick }) {
  return (
    <View style={{ marginTop: space.xxl }}>
      <Txt variant="label">Elige el servicio</Txt>
      <View style={{ marginTop: space.s }}>
        {branch.services.map((s) => {
          const active = s.id === selected;
          return (
            <Pressable
              key={s.id}
              onPress={() => onPick(s.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${s.name}, ${minutes(s.minutes)}, ${money(s.price)}`}
              style={({ pressed }) => [styles.optionRow, pressed && { backgroundColor: color.sunken }]}
            >
              <View style={[styles.selectBar, active && styles.selectBarActive]} />
              <View style={{ flex: 1 }}>
                <Txt variant="body" style={{ fontFamily: active ? font.bodySemi : font.bodyMedium }}>{s.name}</Txt>
                <Txt variant="small" numeric>{minutes(s.minutes)}</Txt>
              </View>
              <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium }}>{money(s.price)}</Txt>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="small" style={{ marginTop: space.l }}>Las citas se pagan en la sucursal, no en la app.</Txt>
    </View>
  );
}

// -------------------------------------------------------------- profesional
function ProStep({ branch, service, selected, onPick }) {
  const able = staffFor(branch, service.id);
  const unable = branch.staff.filter((e) => !able.includes(e));
  return (
    <View style={{ marginTop: space.xxl }}>
      <Txt variant="label">¿Con quién?</Txt>
      <View style={styles.proGrid}>
        {able.map((e) => {
          const active = selected === e.id;
          return (
            <Pressable key={e.id} onPress={() => onPick(e.id)} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${e.name}, ${e.specialty}`} style={styles.proTile}>
              <View style={[styles.proPhotoWrap, active && styles.proPhotoActive]}>
                <PhotoPlaceholder filename={photoFile(e.name)} style={styles.proPhoto} />
              </View>
              <Txt variant="heading" style={{ marginTop: space.s }}>{e.name}</Txt>
              <Txt variant="small">{e.specialty}</Txt>
            </Pressable>
          );
        })}
      </View>
      {unable.length ? (
        <Txt variant="small" style={{ marginTop: space.l }}>
          {unable.map((e) => e.name).join(' y ')} no {unable.length === 1 ? 'hace' : 'hacen'} {service.name.toLowerCase()} en esta sucursal.
        </Txt>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------- fecha y hora
function DateStep({ branch, service, employeeId, date, onPickDate, loading, slots, slot, onPickSlot, taken }) {
  const who = employeeId ? firstName(employeeId) : null;
  const block = date && blocksNote(employeeId, date);
  return (
    <View style={{ marginTop: space.xxl }}>
      <Txt variant="label">¿Qué día y a qué hora?</Txt>
      <Txt variant="small" style={{ marginTop: space.xs }}>
        Puedes reservar hasta el {shortDate(lastBookableDate())}. Los días tachados ya no tienen lugar.
      </Txt>
      <View style={styles.calendarWrap}>
        <BookingCalendar branch={branch} employeeId={employeeId} serviceId={service.id} duration={service.minutes} selected={date} onSelect={onPickDate} />
      </View>

      {date ? (
        <View style={{ marginTop: space.xl }}>
          <Txt variant="heading">
            {loading ? `Buscando horarios del ${longDate(date)}` : `${slots.length} ${slots.length === 1 ? 'horario libre' : 'horarios libres'} el ${longDate(date)}`}
          </Txt>
          <Txt variant="small" style={{ marginTop: space.xs }}>
            {who
              ? `Solo ves las horas en que ${who} puede hacerte un ${service.name.toLowerCase()} de ${minutes(service.minutes)}, sin choques con sus otras citas${block ? ` ni su ${block}` : ''}.`
              : `Solo ves las horas en que alguien puede hacerte un ${service.name.toLowerCase()} de ${minutes(service.minutes)}.`}
          </Txt>
          {taken ? (
            <Txt variant="small" style={{ marginTop: space.xs, color: color.ink }}>Las {minutesLabel(taken.start)} ya no están: alguien las reservó hace un momento.</Txt>
          ) : null}
          <View style={{ marginTop: space.l }}>
            {loading ? <SlotsSkeleton /> : <SlotGrid groups={groupSlots(slots)} selected={slot?.start} onSelect={onPickSlot} />}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SlotsSkeleton() {
  return (
    <View style={{ gap: space.xl }} accessible accessibilityLabel="Buscando horarios libres">
      {[0, 1].map((g) => (
        <View key={g} style={{ gap: space.s }}>
          <Skeleton width={110} height={16} />
          <View style={{ flexDirection: 'row', gap: space.s }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} height={48} radius={10} style={{ flex: 1 }} width={0} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: space.s }}>
            {[0, 1].map((i) => <Skeleton key={i} height={48} radius={10} style={{ flex: 1 }} width={0} />)}
            <View style={{ flex: 1 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ------------------------------------------------------------- confirmación
function ConfirmStep({ branch, service, date, slot, taken, alternatives, onPickSlot, onChangeDate }) {
  if (!slot) {
    // The chosen time was taken while confirming.
    return (
      <View style={{ marginTop: space.xxl, gap: space.l }}>
        {taken ? (
          <ErrorNote title={`Alguien acaba de reservar las ${minutesLabel(taken.start)}`}>
            Mientras confirmabas, ese horario se ocupó{taken.employeeId ? ` con ${firstName(taken.employeeId)}` : ''}. No se hizo ninguna cita a tu nombre.
          </ErrorNote>
        ) : (
          <Skeleton height={120} radius={10} />
        )}
        {alternatives.length ? (
          <View>
            <Txt variant="label">Siguen libres el {longDate(date)}</Txt>
            <View style={styles.altRow}>
              {alternatives.map((s) => (
                <Pressable key={s.start} onPress={() => onPickSlot(s)} accessibilityRole="button" style={styles.altSlot}>
                  <Txt numeric style={{ fontFamily: font.bodyMedium, fontSize: 15 }}>{s.label}</Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <Button variant="secondary" label="Elegir otro día" onPress={onChangeDate} />
      </View>
    );
  }

  const end = slot.start + service.minutes;
  const deadline = slot.start - CANCEL_HOURS * 60;
  const attendant = slot.employeeId ? employeeName(slot.employeeId) : null;

  return (
    <View style={{ marginTop: space.xxl }}>
      <View style={styles.summary}>
        <SummaryRow label="Servicio" value={`${service.name}, ${minutes(service.minutes)}`} />
        <SummaryRow label="Te atiende" value={attendant} />
        <SummaryRow label="Cuándo" value={`${longDate(date)}, de ${slot.label} a ${minutesLabel(end)}`} />
        <SummaryRow label="Dónde" value={`${branch.name}, ${branch.address}, ${branch.neighborhood}`} />
      </View>

      <View style={styles.priceBlock}>
        <View style={{ flex: 1 }}>
          <Txt variant="heading">Pagas en la sucursal</Txt>
          <Txt variant="small">La app no cobra las citas.</Txt>
        </View>
        <Txt variant="title" numeric>{money(service.price)}</Txt>
      </View>

      <Txt variant="body" style={{ marginTop: space.xl }}>
        Puedes cancelar o cambiar tu cita desde la app hasta {CANCEL_HOURS} horas antes, es decir, hasta el {longDate(date)} a las {minutesLabel(deadline)}. Después de esa hora ya no se puede desde la app.
      </Txt>

    </View>
  );
}

function SummaryRow({ label, value, detail }) {
  return (
    <View style={{ gap: 2 }}>
      <Txt variant="small">{label}</Txt>
      <Txt variant="body" numeric style={{ fontFamily: font.bodyMedium }}>{value}</Txt>
      {detail ? <Txt variant="small">{detail}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 64, paddingRight: space.xs, borderRadius: radius.control },
  selectBar: { width: 3, alignSelf: 'stretch', marginVertical: space.s, borderRadius: 2, backgroundColor: 'transparent' },
  selectBarActive: { backgroundColor: color.ink },
  proGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.l, marginTop: space.m },
  proTile: { width: '47%', flexGrow: 1 },
  proPhotoWrap: { borderRadius: radius.photo + 3, padding: 0, borderWidth: 3, borderColor: 'transparent', margin: -3 },
  proPhotoActive: { borderColor: color.ink },
  proPhoto: { aspectRatio: 4 / 5, padding: space.s },
  calendarWrap: { marginTop: space.l, marginHorizontal: -space.s },
  summary: { gap: space.l },
  priceBlock: { marginTop: space.xl, flexDirection: 'row', alignItems: 'center', gap: space.l, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l },
  altRow: { flexDirection: 'row', gap: space.s, marginTop: space.s, flexWrap: 'wrap' },
  altSlot: { minHeight: touch, minWidth: 96, paddingHorizontal: space.l, borderRadius: radius.control, backgroundColor: color.sunken, alignItems: 'center', justifyContent: 'center' },
});
