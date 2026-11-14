// SNIPP design tokens. The whole interface is grayscale (photos keep their
// own color). No state is told apart by color alone: each one pairs an icon
// with explicit text (see components/Appointment.js StatusLine).
// Contrast (WCAG): ink on paper 16.9, inkSoft on paper 6.4, on sunken 5.7.

export const color = {
  paper: '#F5F5F5', // screen background
  raised: '#FFFFFF', // sheets, modals, tab bar
  sunken: '#E8E8E8', // grouping without borders, fields, secondary button
  sunkenPressed: '#DADADA',
  ink: '#141414', // main text, primary button, icons, selection
  inkPressed: '#333333',
  inkSoft: '#595959', // secondary text; never lighter than this for text
  grayLogo: '#7A7A7A', // decoration or text 24 px and up only (3.9:1)
  grayLight: '#BDBDBD', // decoration only (switch track off, dividers)
  divider: '#DCDCDC', // 1 px between rows of dense web tables only
  white: '#FFFFFF',
  scrim: 'rgba(20,20,20,0.5)',
};

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
export const type = {
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
