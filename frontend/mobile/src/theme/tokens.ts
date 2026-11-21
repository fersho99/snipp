import type { TextStyle } from 'react-native';

// SNIPP design tokens. Base of SRS v1.2, section 4.1: white background,
// light gray surfaces (#F5F5F5), borders #E3E3E3, main text #111111,
// secondary text #6B6B6B and black primary buttons (photos keep their own
// color), plus the five status colors (see `status` below). No state is told
// apart by color alone: each one pairs an icon with explicit text (RN-19).
// Contrast (WCAG): ink on paper 18.9, inkSoft on paper 5.3, on sunken 4.9.

export const color = {
  paper: '#FFFFFF', // screen background
  raised: '#FFFFFF', // cards (with a divider border), sheets, modals, tab bar
  sunken: '#F5F5F5', // light gray surfaces: grouping, fields, secondary button
  sunkenPressed: '#EBEBEB',
  ink: '#111111', // main text, primary button, icons, selection
  inkPressed: '#333333',
  inkSoft: '#6B6B6B', // secondary text; never lighter than this for text
  grayLogo: '#7A7A7A', // decoration or text 24 px and up only (3.9:1)
  grayLight: '#BDBDBD', // decoration only (switch track off, dividers)
  divider: '#E3E3E3', // borders of cards, fields and secondary buttons
  white: '#FFFFFF',
  scrim: 'rgba(20,20,20,0.5)',
};

// SRS v1.2, 4.1: status colors. `stripe` is the 5 px left edge of a card,
// `soft` and `text` the label (each pair is 6.3:1 to 9.4:1). Color is used
// only on the stripe, the label, notices and counters (RN-19).
export type StatusColor = 'verde' | 'ambar' | 'rojo' | 'azul' | 'gris';
export const status: Record<StatusColor, { stripe: string; soft: string; text: string }> = {
  verde: { stripe: '#1E8E3E', soft: '#E6F4EA', text: '#0D652D' }, // confirmed or paid
  ambar: { stripe: '#F9AB00', soft: '#FEF4D6', text: '#7A4F01' }, // changed or needs attention
  rojo: { stripe: '#D93025', soft: '#FCE8E6', text: '#A50E0E' }, // cancelled or a problem
  azul: { stripe: '#1A73E8', soft: '#E8F0FE', text: '#174EA6' }, // ready or informative
  gris: { stripe: '#9AA0A6', soft: '#F1F3F4', text: '#3C4043' }, // finished, current, inactive
};

export const stripeWidth = 5;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48, huge: 64 };

export const radius = { control: 10, photo: 16 };

// Titles in Montserrat (matches the SNIPP wordmark), text in Onest.
export const font = {
  title: 'Montserrat_700Bold',
  titleSemi: 'Montserrat_600SemiBold',
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
};

// Type scale (mobile, base 16).
export const type: Record<'display' | 'title' | 'heading' | 'body' | 'bodySoft' | 'label' | 'small' | 'number', TextStyle> = {
  display: { fontFamily: font.title, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: color.ink },
  title: { fontFamily: font.title, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, color: color.ink },
  heading: { fontFamily: font.titleSemi, fontSize: 18, lineHeight: 23, letterSpacing: -0.1, color: color.ink },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: color.ink },
  bodySoft: { fontFamily: font.body, fontSize: 16, lineHeight: 23, color: color.inkSoft },
  label: { fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: color.ink },
  small: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.inkSoft },
  number: { fontVariant: ['tabular-nums'] },
};

// Minimum touch target on Android.
export const touch = 48;

// The single soft shadow allowed (bottom sheets and modals only).
export const sheetShadow = {
  shadowColor: '#141414',
  shadowOpacity: 0.14,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: -6 },
  elevation: 12,
};
