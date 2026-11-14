import { View } from 'react-native';
import { Image } from 'expo-image';
import { space } from '../theme/tokens';

const ISOTIPO = require('../../assets/brand/snipp-isotipo.png');
const WORDMARK = require('../../assets/brand/snipp-wordmark.png');
const WORDMARK_RATIO = 891 / 177;

// SNIPP logo: isotipo (comb, scissors and the "S") plus the wordmark.
// `size` is the isotipo height; the wordmark scales with it.
export default function Logo({ size = 36, wordmark = true, style }) {
  const wordHeight = Math.round(size * 0.46);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.s }, style]} accessible accessibilityRole="image" accessibilityLabel="SNIPP">
      <Image source={ISOTIPO} style={{ width: size, height: size }} contentFit="contain" />
      {wordmark ? <Image source={WORDMARK} style={{ width: Math.round(wordHeight * WORDMARK_RATIO), height: wordHeight }} contentFit="contain" /> : null}
    </View>
  );
}
