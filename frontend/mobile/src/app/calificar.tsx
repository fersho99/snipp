import { useRef, useState } from 'react';
import useAction, { wait } from '../hooks/useAction';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StarIcon } from 'phosphor-react-native';
import Screen, { BackButton } from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import TextField, { FieldError } from '../components/TextField';
import { ErrorScreen, OfflineState } from '../components/States';
import useConnectivity from '../hooks/useConnectivity';
import { canReview, describe, submitReview, useAppointment } from '../data/appointments';
import { color, space, touch } from '../theme/tokens';

const MAX = 500;
const WORDS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];

// Rate the business (RF-M12): 1 to 5 stars and a review, only after an
// attended appointment and once per appointment (RN-08).
// States: ?estado=error-enviar (publishing fails once) | sin-conexion. Blocked: already rated or not attended.
export default function Rate() {
  const { cita = 'C-10431', estado } = useLocalSearchParams<{ cita?: string; estado?: string }>();
  const appt = useAppointment(cita);
  const { online, failure, retry, retrying } = useConnectivity(estado);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const publishing = useAction({ busy: 'Publicando...', done: 'Reseña publicada', failed: 'No se pudo publicar' });
  const failNext = useRef(estado === 'error-enviar');

  if (!online) return <OfflineState kind={failure} onRetry={retry} retrying={retrying} />;
  if (!appt) {
    return <ErrorScreen kind="no-existe" detail={`La cita ${cita} ya no existe o el folio está mal escrito. Revisa tus citas en Mis citas.`} onRetry={retry} retrying={retrying} />;
  }

  const d = describe(appt);
  const day = d.dateLabel.split(' de ')[0];

  if (!canReview(appt)) {
    return (
      <Screen>
        <BackButton />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.m }}>
          {appt.review ? 'Ya calificaste esta cita' : 'Esta cita no se puede calificar'}
        </Txt>
        <Txt variant="body" style={{ marginTop: space.m }}>
          {appt.review
            ? `Le diste ${appt.review.stars} ${appt.review.stars === 1 ? 'estrella' : 'estrellas'} a ${d.branch.name}. Solo se puede dejar una reseña por cita.`
            : `Solo se califican las citas atendidas. Tu ${d.service.name.toLowerCase()} del ${day} con ${d.employee.name} no se atendió.`}
        </Txt>
      </Screen>
    );
  }

  const send = () => {
    const e: Record<string, string> = {};
    if (!stars) e.stars = 'Elige de 1 a 5 estrellas.';
    if (!text.trim()) e.text = 'Escribe tu reseña; puede ser corta.';
    setErrors(e);
    if (Object.keys(e).length) return;
    publishing.run(async () => {
      await wait(900);
      if (failNext.current) {
        failNext.current = false;
        return { ok: false, reason: 'No se publicó tu reseña por un problema con el servidor. Lo que escribiste sigue aquí; inténtalo de nuevo.' };
      }
      return {
        ok: true,
        message: `Listo: tu reseña ya está en la página de ${d.branch.name}`,
        next: () => {
          // Navigate first: once saved, this appointment no longer accepts a review.
          const target = `/cita/${appt.folio}?aviso=calificada`;
          if (router.canDismiss?.()) router.dismissTo(target);
          else router.replace(target);
          submitReview(appt.folio, { stars, text: text.trim() });
        },
      };
    });
  };

  return (
    <Screen footer={<Button label="Publicar reseña" {...publishing.button} onPress={send} />}>
      <BackButton />
      <Txt variant="small" style={{ marginTop: space.s }}>{d.branch.name}, folio {appt.folio}</Txt>
      <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.s }}>
        ¿Cómo te fue con tu {d.service.name.toLowerCase()} del {day}?
      </Txt>
      <Txt variant="bodySoft" style={{ marginTop: space.s }}>Te atendió {d.employee.name}.</Txt>

      <View style={{ marginTop: space.xl }}>
        <View style={styles.stars} accessibilityRole="radiogroup" accessibilityLabel="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => { setStars(n); setErrors((x) => ({ ...x, stars: undefined })); }}
              accessibilityRole="radio"
              accessibilityState={{ checked: stars === n }}
              accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}, ${WORDS[n]}`}
              style={styles.star}
            >
              <StarIcon size={36} color={n <= stars ? color.ink : color.inkSoft} weight={n <= stars ? 'fill' : 'regular'} />
            </Pressable>
          ))}
        </View>
        <Txt variant="label" style={{ marginTop: space.xs, color: stars ? color.ink : color.inkSoft }} accessibilityLiveRegion="polite">
          {stars ? `${stars} de 5: ${WORDS[stars]}` : 'Toca una estrella'}
        </Txt>
        {errors.stars ? <View style={{ marginTop: space.xs }}><FieldError>{errors.stars}</FieldError></View> : null}
      </View>

      <TextField
        label="Tu reseña"
        value={text}
        onChangeText={(v) => { setText(v.slice(0, MAX)); setErrors((x) => ({ ...x, text: undefined })); }}
        multiline
        maxLength={MAX}
        placeholder={`Por ejemplo: cómo te atendió ${d.employee.name.split(' ')[0]} y cómo quedó el ${d.service.name.toLowerCase()}`}
        error={errors.text}
        hint={`Se publica en la página de ${d.branch.name} con tu nombre. ${text.length} de ${MAX} caracteres.`}
        style={{ marginTop: space.xl }}
      />

    </Screen>
  );
}

const styles = StyleSheet.create({
  stars: { flexDirection: 'row', marginLeft: -space.s },
  star: { width: touch + 4, height: touch + 4, alignItems: 'center', justifyContent: 'center' },
});
