import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircleIcon, MapPinIcon, PhoneIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../../components/Screen';
import Txt from '../../components/Txt';
import Button from '../../components/Button';
import { ErrorNote, OfflineState, PhotoPlaceholder, Skeleton } from '../../components/States';
import { StatusLine } from '../../components/Appointment';
import useConnectivity from '../../hooks/useConnectivity';
import { CANCEL_HOURS, NOW_NEAR_C10482, appointmentStore, canReport, canReview, changeWindow, describe, reportStatusOf, statusOf, useAppointment } from '../../data/appointments';
import { notificationStore } from '../../data/notifications';
import { DEMO_TODAY, getEmployee } from '../../data/demo';
import { money, photoFile } from '../../theme/format';
import { color, font, radius, sheetShadow, space, touch } from '../../theme/tokens';
import type { Appointment } from '../../types/domain';


// Appointment detail with the actions the rules allow.
// States: ?estado=menos-de-2h (clock 75 min before C-10482) | cargando | sin-conexion
// Notices after an action: ?aviso=reagendada | aceptada | cancelada
export default function AppointmentDetail() {
  const { folio, estado, aviso } = useLocalSearchParams<{ folio?: string; estado?: string; aviso?: string }>();
  const appt = useAppointment(folio);
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const [sheet, setSheet] = useState(false);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;
  if (estado === 'cargando') return <DetailSkeleton />;
  if (!appt) {
    return (
      <Screen>
        <BackButton />
        <ErrorNote title={`No encontramos la cita ${folio}`}>Revisa el folio o búscala en Mis citas.</ErrorNote>
      </Screen>
    );
  }

  const now = estado === 'menos-de-2h' ? NOW_NEAR_C10482 : DEMO_TODAY;
  const d = describe(appt);
  const status = statusOf(appt);
  const win = changeWindow(appt, now);
  const isActive = appt.status === 'confirmada';
  const isPast = ['atendida', 'no-asistio', 'empleado-no-se-presento'].includes(appt.status);
  const isCancelled = appt.status.startsWith('cancelada');
  const proposed = appt.status === 'cambio' && appt.change?.employeeId ? getEmployee(appt.change.employeeId) : null;

  return (
    <Screen>
      <BackButton />
      <StatusLine status={status} style={{ marginTop: space.s }} />
      <Txt variant="display" accessibilityRole="header" style={{ marginTop: space.s }}>
        {d.service.name} con {d.employee.name}
      </Txt>
      <Txt variant="heading" style={{ marginTop: space.m }}>{d.dateLabel}</Txt>
      <Txt variant="body" numeric>{d.timeLabel} a {d.endLabel}</Txt>

      <Notice aviso={aviso} appt={appt} d={d} />

      {appt.status === 'cambio' && proposed ? (
        <Pressable onPress={() => router.push(`/cambio/${appt.folio}`)} accessibilityRole="button" style={styles.changeLine}>
          <View style={[styles.bar, { backgroundColor: color.ink }]} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Txt variant="body">
              {d.branch.name} propone que te atienda {proposed.name} en lugar de {d.employee.name.split(' ')[0]}.
            </Txt>
            <Txt variant="label" style={{ textDecorationLine: 'underline' }}>Aceptar, reagendar o cancelar</Txt>
          </View>
        </Pressable>
      ) : null}

      {appt.status === 'cancelada-negocio' ? (
        <View style={{ marginTop: space.xl, gap: space.l }}>
          <ErrorNote title={`${d.branch.name} canceló esta cita ${appt.changedAt}`}>
            “{appt.businessNote}”
          </ErrorNote>
          <Button
            label="Reservar otro horario"
            onPress={() => router.push({ pathname: '/reservar', params: { sucursal: d.branch.id, servicio: d.service.id } })}
          />
        </View>
      ) : null}

      {/* Who */}
      <View style={styles.section}>
        <Txt variant="small">Te atiende</Txt>
        <View style={styles.person}>
          <PhotoPlaceholder compact filename={photoFile(d.employee.name)} style={styles.personPhoto} />
          <View style={{ flex: 1 }}>
            <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{d.employee.name}</Txt>
            <Txt variant="small">{d.employee.specialty}</Txt>
          </View>
        </View>
      </View>

      {/* Where */}
      <View style={styles.section}>
        <Txt variant="small">Dónde</Txt>
        <Txt variant="body" style={{ fontFamily: font.bodySemi, marginTop: space.xs }}>{d.branch.name}</Txt>
        <View style={styles.contactRow}>
          <MapPinIcon size={22} color={color.ink} />
          <Txt variant="body" style={{ flex: 1 }}>{d.branch.address}, {d.branch.neighborhood}</Txt>
        </View>
        <View style={styles.contactRow}>
          <PhoneIcon size={22} color={color.ink} />
          <Txt variant="body" numeric>{d.branch.phone}</Txt>
        </View>
      </View>

      <View style={styles.priceBlock}>
        <View style={{ flex: 1 }}>
          <Txt variant="heading">{isPast || isCancelled ? 'Precio del servicio' : 'Pagas en la sucursal'}</Txt>
          <Txt variant="small">
            {isCancelled ? 'No hay ningún cargo por la cancelación.' : appt.status === 'atendida' ? 'Se pagó en la sucursal.' : isPast ? 'No se cobró nada.' : 'La app no cobra las citas.'}
          </Txt>
        </View>
        <Txt variant="title" numeric>{money(d.service.price)}</Txt>
      </View>
      <Txt variant="small" numeric style={{ marginTop: space.m }}>Folio {appt.folio}</Txt>

      {/* Actions allowed by the rules */}
      {isActive ? (
        win.allowed ? (
          <View style={styles.actions}>
            <Txt variant="small">Puedes cambiarla o cancelarla desde la app hasta el {win.deadlineLabel}.</Txt>
            <Button variant="secondary" label="Reagendar" onPress={() => router.push({ pathname: '/reagendar', params: { cita: appt.folio } })} />
            <Button variant="link" label="Cancelar cita" onPress={() => setSheet(true)} />
          </View>
        ) : (
          <View style={styles.actions}>
            <View style={styles.blocked}>
              <View style={[styles.bar, { backgroundColor: color.inkSoft }]} />
              <Txt variant="body" style={{ flex: 1 }}>
                Ya no puedes cancelar ni reagendar desde la app porque faltan menos de {CANCEL_HOURS} horas
                {win.minutesLeft ? ` (tu cita es en ${win.minutesLeft} minutos)` : ''}.
              </Txt>
            </View>
          </View>
        )
      ) : null}

      {isPast ? <PastActions appt={appt} /> : null}

      <CancelSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        d={d}
        onConfirm={() => {
          appointmentStore.update(appt.folio, { status: 'cancelada-cliente' });
          notificationStore.push({
            kind: 'cancelacion',
            title: `Cancelaste tu cita del ${d.dateLabel.split(' de ')[0]}`,
            body: `${d.service.name} de las ${d.timeLabel} con ${d.employee.name} en ${d.branch.name}. No hay ningún cargo.`,
            route: `/cita/${appt.folio}`,
          });
          setSheet(false);
          router.setParams({ aviso: 'cancelada' });
        }}
      />
    </Screen>
  );
}

type Described = ReturnType<typeof describe>;
function Notice({ aviso, appt, d }: { aviso?: string; appt: Appointment; d: Described }) {
  if (!aviso) return null;
  const text = ({
    reagendada: `Listo. Cambiaste tu cita al ${d.dateLabel} a las ${d.timeLabel}. ${d.employee.name.split(' ')[0]} ya tiene el aviso.`,
    aceptada: `Aceptaste el cambio. Te atiende ${d.employee.name} el ${d.dateLabel} a las ${d.timeLabel}.`,
    cancelada: `Cancelaste esta cita. ${d.branch.name} ya recibió el aviso y no hay ningún cargo.`,
    calificada: `Gracias. Tu reseña ya aparece en la página de ${d.branch.name}, que ahora tiene ${d.branch.rating} de calificación con ${d.branch.reviewCount} reseñas.`,
  } as Record<string, string>)[aviso];
  if (!text) return null;
  return (
    <View style={[styles.changeLine, { minHeight: 0 }]} accessibilityLiveRegion="polite">
      <View style={[styles.bar, { backgroundColor: color.ink }]} />
      {aviso !== 'cancelada' ? <CheckCircleIcon size={20} color={color.ink} weight="fill" /> : null}
      <Txt variant="body" style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}

function PastActions({ appt }: { appt: Appointment }) {
  const review = canReview(appt);
  const report = canReport(appt);
  return (
    <View style={styles.actions}>
      {appt.review ? (
        <Txt variant="body">Calificaste esta cita con {appt.review.stars} {appt.review.stars === 1 ? 'estrella' : 'estrellas'}: “{appt.review.text}”</Txt>
      ) : null}
      {appt.report ? (
        <View style={{ gap: space.xs }}>
          <StatusLine status={{ ...reportStatusOf(appt.report), label: `Reporte ${reportStatusOf(appt.report).label.toLowerCase()}` }} />
          <Txt variant="body">
            Enviaste un reporte sobre {describe(appt).employee.name} el {appt.report.sentOn}. Solo lo ven el Jefe de {describe(appt).branch.name} y el Administrador de SNIPP.
          </Txt>
          <Button variant="link" label="Ver mis reportes" onPress={() => router.push('/reportes')} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
      {appt.status === 'empleado-no-se-presento' ? (
        <Txt variant="small">No puedes calificar esta cita porque no se dio el servicio.</Txt>
      ) : null}
      {appt.status === 'no-asistio' ? (
        <Txt variant="small">Como no asististe, esta cita no se puede calificar ni reportar.</Txt>
      ) : null}
      {review ? <Button label="Calificar" onPress={() => router.push({ pathname: '/calificar', params: { cita: appt.folio } })} /> : null}
      {report ? <Button variant={review ? 'link' : 'secondary'} label="Reportar un problema" onPress={() => router.push({ pathname: '/reportar', params: { cita: appt.folio } })} /> : null}
    </View>
  );
}

function CancelSheet({ visible, onClose, onConfirm, d }: { visible: boolean; onClose: () => void; onConfirm: () => void; d: Described }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }]}>
        <Txt variant="title" accessibilityRole="header">
          ¿Cancelar tu cita de {d.service.name.toLowerCase()} del {d.dateLabel.split(' de ')[0]} a las {d.timeLabel}?
        </Txt>
        <Txt variant="bodySoft" style={{ marginTop: space.s }}>
          {d.employee.name} recibe el aviso y ese horario queda libre para alguien más. No hay cargo, porque las citas se pagan en la sucursal.
        </Txt>
        <View style={{ gap: space.s, marginTop: space.xl }}>
          <Button
            variant="danger"
            label="Sí, cancelar cita"
            loading={busy}
            onPress={async () => { setBusy(true); await new Promise((res) => setTimeout(res, 800)); setBusy(false); onConfirm(); }}
          />
          <Button variant="secondary" label="No, conservarla" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function DetailSkeleton() {
  return (
    <Screen>
      <BackButton />
      <View style={{ gap: space.s, marginTop: space.s }} accessible accessibilityLabel="Cargando la cita">
        <Skeleton width={100} height={14} />
        <Skeleton width="85%" height={32} />
        <Skeleton width="60%" height={32} />
        <Skeleton width="55%" height={20} style={{ marginTop: space.m }} />
        <Skeleton width="35%" height={16} />
        <View style={[styles.person, { marginTop: space.xxl }]}>
          <Skeleton width={64} height={64} radius={16} />
          <View style={{ flex: 1, gap: space.s }}>
            <Skeleton width="50%" height={16} />
            <Skeleton width="35%" height={14} />
          </View>
        </View>
        <Skeleton height={72} radius={10} style={{ marginTop: space.xxl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  changeLine: { flexDirection: 'row', gap: space.m, marginTop: space.xl, minHeight: touch },
  bar: { width: 3, borderRadius: 2 },
  section: { marginTop: space.xxl },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.l, marginTop: space.s },
  personPhoto: { width: 64, height: 64, padding: space.xs },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 40 },
  priceBlock: { marginTop: space.xxl, flexDirection: 'row', alignItems: 'center', gap: space.l, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l },
  actions: { marginTop: space.xxl, gap: space.m },
  blocked: { flexDirection: 'row', gap: space.m },
  backdrop: { flex: 1, backgroundColor: color.scrim },
  sheet: {
    backgroundColor: color.raised,
    borderTopLeftRadius: radius.photo,
    borderTopRightRadius: radius.photo,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    ...sheetShadow,
  },
});
