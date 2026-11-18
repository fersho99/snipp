import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleIcon, LockSimpleIcon, RadioButtonIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { ErrorNote, OfflineState } from '../components/States';
import useConnectivity from '../hooks/useConnectivity';
import { REPORT_REASONS, canReport, describe, startDate, submitReport, useAppointments } from '../data/appointments';
import { color, font, radius, space, touch } from '../theme/tokens';
import type { ReportReason } from '../types/domain';

const MAX = 800;

// Report an employee to the Jefe of the business (RF-M13): pick the related
// appointment, a reason and a description. Only appointments attended or
// marked "Empleado no se presentó", one report per appointment (RN-15).
// Only the Jefe and the SNIPP Administrator see it; the employee never does.
// Opened from an appointment (?cita=) it comes preselected.
// States: ?estado=error-enviar | sin-conexion. Blocked: no appointment can be reported.
export default function Report() {
  const { cita, estado } = useLocalSearchParams<{ cita?: string; estado?: string }>();
  const all = useAppointments();
  const { online, retry, retrying } = useConnectivity(estado === 'sin-conexion');
  const reportable = all.filter(canReport).sort((a, b) => startDate(b).getTime() - startDate(a).getTime());
  const [folio, setFolio] = useState(cita ?? null);
  const [picking, setPicking] = useState(!cita);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  if (!online) return <OfflineState onRetry={retry} retrying={retrying} />;

  const appt = all.find((a) => a.folio === folio);

  // Opened for an appointment that cannot be reported (already reported, or not attended).
  if (cita && appt && !canReport(appt) && !picking) {
    const d = describe(appt);
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>
          {appt.report ? 'Ya reportaste esta cita' : 'Esta cita no se puede reportar'}
        </Txt>
        <Txt variant="body" style={{ marginTop: space.m }}>
          {appt.report
            ? `Enviaste el reporte sobre ${d.employee.name} el ${appt.report.sentOn}. Solo se puede enviar un reporte por cita.`
            : 'Solo se reportan citas atendidas o en las que el empleado no se presentó.'}
        </Txt>
        <Button variant="secondary" label="Ver mis reportes" onPress={() => router.replace('/reportes')} style={{ marginTop: space.xl }} />
      </Screen>
    );
  }

  if (!reportable.length && !appt) {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>No tienes citas que puedas reportar</Txt>
        <Txt variant="body" style={{ marginTop: space.m }}>
          Puedes reportar a un empleado por una cita atendida o en la que no se presentó, una vez por cita. Las citas de tu historial ya tienen reporte o no cumplen con eso.
        </Txt>
      </Screen>
    );
  }

  if (picking || !appt) {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>¿Sobre qué cita es el reporte?</Txt>
        <Txt variant="bodySoft" style={{ marginTop: space.s }}>Aparecen las citas atendidas o en las que el empleado no se presentó y que todavía no reportas.</Txt>
        <View style={{ marginTop: space.xl }}>
          {reportable.map((a, i) => {
            const d = describe(a);
            const selected = a.folio === folio;
            return (
              <Pressable
                key={a.folio}
                onPress={() => { setFolio(a.folio); setPicking(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [styles.option, i < reportable.length - 1 && styles.divider, pressed && { opacity: 0.6 }]}
              >
                {selected ? <RadioButtonIcon size={24} color={color.ink} weight="fill" /> : <CircleIcon size={24} color={color.inkSoft} />}
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="body" style={{ fontFamily: font.bodySemi }}>{d.service.name} con {d.employee.name}</Txt>
                  <Txt variant="small">{d.dateLabel}, {d.branch.name}</Txt>
                  {a.status === 'empleado-no-se-presento' ? <Txt variant="small">{d.employee.name.split(' ')[0]} no se presentó</Txt> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Screen>
    );
  }

  const d = describe(appt);
  const first = d.employee.name.split(' ')[0];

  const send = async () => {
    const e: Record<string, string> = {};
    if (!reason) e.reason = 'Elige un motivo.';
    if (!text.trim()) e.text = 'Cuenta qué pasó para que el Jefe pueda darle seguimiento.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setSendError(false);
    await new Promise((r) => setTimeout(r, 900));
    setSending(false);
    if (estado === 'error-enviar') {
      setSendError(true);
      return;
    }
    // Navigate first: once saved, this appointment no longer accepts a report.
    router.replace({ pathname: '/reportes', params: { enviado: appt.folio } });
    if (reason) submitReport(appt.folio, { reason, text: text.trim() });
  };

  return (
    <Screen footer={<Button label="Enviar reporte" loading={sending} onPress={send} />}>
      <BackButton />
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>
        Reporta a {d.employee.name} con el Jefe de {d.branch.name}
      </Txt>
      <View style={styles.chosen}>
        <View style={{ flex: 1 }}>
          <Txt variant="body">{d.service.name} del {d.dateLabel}, {d.timeLabel}</Txt>
          <Txt variant="small">Folio {appt.folio}</Txt>
        </View>
        {reportable.length > 1 || !canReport(appt) ? (
          <Button variant="link" label="Cambiar cita" onPress={() => setPicking(true)} />
        ) : null}
      </View>

      <View style={styles.privacy}>
        <LockSimpleIcon size={20} color={color.ink} style={{ marginTop: 2 }} />
        <Txt variant="body" style={{ flex: 1 }}>
          Solo lo ven el Jefe de {d.branch.name} y el Administrador de SNIPP. {first} no verá tu reporte ni tus datos.
        </Txt>
      </View>

      <Txt variant="label" style={{ marginTop: space.xl }}>Motivo</Txt>
      <View style={{ marginTop: space.xs }} accessibilityRole="radiogroup" accessibilityLabel="Motivo">
        {REPORT_REASONS.map((r) => {
          const selected = reason === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => { setReason(r.id); setErrors((x) => ({ ...x, reason: undefined })); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [styles.reason, pressed && { opacity: 0.6 }]}
            >
              {selected ? <RadioButtonIcon size={24} color={color.ink} weight="fill" /> : <CircleIcon size={24} color={color.inkSoft} />}
              <Txt variant="body" style={{ fontFamily: selected ? font.bodySemi : font.body }}>{r.label}</Txt>
            </Pressable>
          );
        })}
      </View>
      {errors.reason ? <Txt variant="small" style={{ color: color.ink }}>{errors.reason}</Txt> : null}

      <TextField
        label="¿Qué pasó?"
        value={text}
        onChangeText={(v) => { setText(v.slice(0, MAX)); setErrors((x) => ({ ...x, text: undefined })); }}
        multiline
        maxLength={MAX}
        placeholder="Describe lo que pasó, con la hora si la recuerdas"
        error={errors.text}
        hint={`${text.length} de ${MAX} caracteres.`}
        style={{ marginTop: space.xl }}
      />

      {sendError ? (
        <View style={{ marginTop: space.xl }}>
          <ErrorNote title="No se envió tu reporte">Hubo un problema con el servidor. Lo que escribiste sigue aquí; intenta de nuevo.</ErrorNote>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.l, minHeight: 72, paddingVertical: space.m },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.divider },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginTop: space.m },
  privacy: { flexDirection: 'row', gap: space.m, marginTop: space.xl, backgroundColor: color.sunken, borderRadius: radius.control, padding: space.l },
  reason: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: touch },
});
