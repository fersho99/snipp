import { Text } from 'react-native';
import { type } from '../theme/tokens';

// Text with the app's type scale. `numeric` turns on tabular figures for
// prices, times and counts.
export default function Txt({ variant = 'body', numeric, style, children, ...rest }) {
  return (
    <Text style={[type[variant], numeric && type.number, style]} maxFontSizeMultiplier={1.6} {...rest}>
      {children}
    </Text>
  );
}
