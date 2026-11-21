import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { ScreenFailure } from '../components/States';

// Whether a screen can load (RF-M18): the device connection, plus the cases
// the screen catalogue can force with ?estado=:
// - sin-conexion: no internet;
// - error-servidor: the server failed;
// - tardo: no answer; after 15 s it becomes "Esto tardó demasiado";
// - no-existe: what was asked for no longer exists.
// `failure` says which error screen to show; `online` is true when none.
// A successful "Reintentar" clears the forced case, so the screen comes back
// with what was typed.
export const TIMEOUT_MS = 15000;

const FORCED: Record<string, ScreenFailure> = {
  'sin-conexion': 'sin-conexion',
  'error-servidor': 'servidor',
  tardo: 'esperando',
  'no-existe': 'no-existe',
};

export default function useConnectivity(estado?: string | boolean) {
  const initial = estado === true ? 'sin-conexion' : typeof estado === 'string' ? FORCED[estado] ?? null : null;
  const [forced, setForced] = useState<ScreenFailure | null>(initial);
  const [connected, setConnected] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (forced) return undefined;
    return NetInfo.addEventListener((state) => {
      setConnected(state.isConnected !== false && state.isInternetReachable !== false);
    });
  }, [forced]);

  // "Esto tardó demasiado" after 15 seconds without an answer.
  useEffect(() => {
    if (forced !== 'esperando') return undefined;
    const t = setTimeout(() => setForced('tiempo'), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [forced]);

  const retry = useCallback(async () => {
    setRetrying(true);
    const state = await NetInfo.fetch();
    // Simulated delay so the retry is visible in the demo.
    await new Promise((r) => setTimeout(r, 900));
    setForced(null);
    setConnected(state.isConnected !== false && state.isInternetReachable !== false);
    setRetrying(false);
  }, []);

  const failure: ScreenFailure | null = forced ?? (connected ? null : 'sin-conexion');
  return { online: !failure, failure, retry, retrying };
}
