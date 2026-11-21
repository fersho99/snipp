import { Alert, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { resetDemoData } from '@shared/store';
import Button from './Button';

const QUESTION = '¿Reiniciar los datos de demo?';
const DETAIL = 'La app y el panel vuelven a los datos de ejemplo. Se pierden las citas y los cambios hechos en este navegador.';

// "Reiniciar datos de demo": the app and the web panel go back to the sample
// data. Asks first, because it removes what was booked or changed in both.
export default function ResetDemo({ style }: { style?: StyleProp<ViewStyle> }) {
  const reset = () => {
    resetDemoData();
    // On the web the app keeps carts and orders in memory: start it again too.
    if (Platform.OS === 'web') window.location.reload();
  };
  const ask = () => {
    // Alert has no buttons on the web, so the browser asks there.
    if (Platform.OS === 'web') {
      if (window.confirm(`${QUESTION}\n\n${DETAIL}`)) reset();
      return;
    }
    Alert.alert(QUESTION, DETAIL, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reiniciar', style: 'destructive', onPress: reset },
    ]);
  };
  return <Button variant="link" label="Reiniciar datos de demo" onPress={ask} style={style} />;
}
