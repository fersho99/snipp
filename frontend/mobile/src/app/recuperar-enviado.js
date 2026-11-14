import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { EnvelopeSimpleIcon } from 'phosphor-react-native';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import Button from '../components/Button';
import { color, space } from '../theme/tokens';

const RESEND_SECONDS = 45;

// Password recovery, step 2: "check your email".
export default function ResetLinkSent() {
  const { correo = 'andrea.valenzuela@gmail.com' } = useLocalSearchParams();
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const countdown = `0:${String(seconds).padStart(2, '0')}`;

  return (
    <Screen
      footer={
        <View style={{ gap: space.s }}>
          <Button label="Volver a entrar" onPress={() => router.replace('/entrar')} />
          <Button
            variant="secondary"
            label={seconds > 0 ? `Reenviar enlace en ${countdown}` : 'Reenviar enlace'}
            disabled={seconds > 0}
            onPress={() => { setResent(true); setSeconds(RESEND_SECONDS); }}
          />
        </View>
      }
    >
      <View style={{ marginTop: space.huge }}>
        <EnvelopeSimpleIcon size={24} color={color.ink} />
        <Txt variant="title" accessibilityRole="header" style={{ marginTop: space.l }}>
          Revisa tu correo
        </Txt>
        <Txt variant="body" style={{ marginTop: space.m }}>
          Si <Txt variant="body" style={{ fontFamily: 'Onest_600SemiBold' }}>{correo}</Txt> tiene cuenta en SNIPP, ahí te llega el enlace en unos minutos.
        </Txt>
        <Txt variant="bodySoft" style={{ marginTop: space.m }}>
          Si no lo ves, busca en Spam o Promociones.
        </Txt>
        {resent ? (
          <Txt variant="small" style={{ marginTop: space.l, color: color.ink }} accessibilityLiveRegion="polite">
            Enviamos otro enlace. El anterior ya no funciona.
          </Txt>
        ) : null}
        <Button
          variant="link"
          label="Escribí mal el correo"
          onPress={() => router.replace({ pathname: '/recuperar', params: { correo } })}
          style={{ marginTop: space.l }}
        />
      </View>
    </Screen>
  );
}
