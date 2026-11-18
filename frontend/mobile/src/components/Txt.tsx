import { Text, type TextProps } from 'react-native';
import { type } from '../theme/tokens';

// Text with the app's type scale. `numeric` turns on tabular figures for
// prices, times and counts.
export type TxtVariant = 'display' | 'title' | 'heading' | 'body' | 'bodySoft' | 'label' | 'small';
export default function Txt({ variant = 'body', numeric, style, children, ...rest }: TextProps & { variant?: TxtVariant; numeric?: boolean }) {
  return (
    <Text style={[type[variant], numeric && type.number, style]} maxFontSizeMultiplier={1.6} {...rest}>
      {children}
    </Text>
  );
}
