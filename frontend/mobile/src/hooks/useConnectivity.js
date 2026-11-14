import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Tracks connectivity. `forcedOffline` lets the screen catalogue preview the
// offline state without actually disconnecting the device.
export default function useConnectivity(forcedOffline = false) {
  const [online, setOnline] = useState(!forcedOffline);
  const [retrying, setRetrying] = useState(false);
  const [forced, setForced] = useState(forcedOffline);

  useEffect(() => {
    if (forced) return undefined;
    return NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
  }, [forced]);

  const retry = useCallback(async () => {
    setRetrying(true);
    const state = await NetInfo.fetch();
    // Simulated delay so the retry is visible in the demo.
    await new Promise((r) => setTimeout(r, 900));
    setForced(false);
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    setRetrying(false);
  }, []);

  return { online: forced ? false : online, retry, retrying };
}
