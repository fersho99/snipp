import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentType, ReactNode } from 'react';
import type { IconProps } from 'phosphor-react-native';
import type { StatusColor, StatusIcon, StatusText } from '../types/domain';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowsClockwiseIcon, CalendarBlankIcon, CheckCircleIcon, ClockIcon, HouseIcon, InfoIcon, ShoppingBagIcon, UserIcon, WarningCircleIcon, XCircleIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { color, font, radius, space, status as statusColor, stripeWidth, touch } from '../theme/tokens';
import { CountBadge } from './CartButton';
import { cartSummary, useCart } from '../data/shop';

// SRS v1.2, 4.1: a status is a label with the light fill of its color, an
// icon and the text in the dark tone of that color. Never color alone (RN-19).
const ICON: Record<StatusIcon, ComponentType<IconProps>> = {
  check: CheckCircleIcon,
  reagendada: ArrowsClockwiseIcon,
  atencion: WarningCircleIcon,
  cancelada: XCircleIcon,
  reloj: ClockIcon,
  bolsa: ShoppingBagIcon,
  info: InfoIcon,
};

export function StatusLine({ status, style }: { status: StatusText; style?: StyleProp<ViewStyle> }) {
  const Icon = ICON[status.icon];
  const c = statusColor[status.color];
  return (
    <View style={[styles.status, { backgroundColor: c.soft }, style]}>
      <Icon size={16} color={c.text} weight={status.icon === 'reagendada' ? 'bold' : 'fill'} />
      <Txt variant="small" style={{ color: c.text, fontFamily: font.bodySemi, flexShrink: 1 }}>
        {status.label}
      </Txt>
    </View>
  );
}

// On-screen notice (SRS v1.2, 4.1 "Avisos en pantalla"): light fill of its
// status color, the stripe and the same icon as its label.
export function StatusNotice({ tone, icon, children, style }: { tone: StatusColor; icon: StatusIcon; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const Icon = ICON[icon];
  const c = statusColor[tone];
  return (
    <View style={[styles.notice, { backgroundColor: c.soft, borderLeftColor: c.stripe }, style]}>
      <Icon size={20} color={c.text} weight={icon === 'reagendada' ? 'bold' : 'fill'} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: space.xs }}>{children}</View>
    </View>
  );
}

// White card with the 5 px stripe of its status color on the left edge; the
// rest of the card stays white (SRS v1.2, 4.1).
export function StatusCard({ tone, children, style }: { tone: StatusColor; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, { borderLeftColor: statusColor[tone].stripe }, style]}>{children}</View>;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Date as typography: big day number, weekday and month under it.
export function DateBlock({ date, muted }: { date: Date; muted?: boolean }) {
  return (
    <View style={styles.dateBlock} accessible={false}>
      <Txt numeric style={[styles.dateDay, muted && { color: color.inkSoft }]}>{date.getDate()}</Txt>
      <Txt variant="small" style={{ textAlign: 'center' }}>{DAYS[date.getDay()]} {MONTHS[date.getMonth()]}</Txt>
    </View>
  );
}

const TABS: { path: string; label: string; Icon: ComponentType<IconProps>; push?: boolean }[] = [
  { path: '/inicio', label: 'Inicio', Icon: HouseIcon },
  { path: '/citas', label: 'Mis citas', Icon: CalendarBlankIcon },
  { path: '/carrito', label: 'Carrito', Icon: ShoppingBagIcon, push: true },
  { path: '/cuenta', label: 'Cuenta', Icon: UserIcon },
];

// Bottom navigation for the top-level client screens.
export function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const cartCount = cartSummary(useCart(), false).count;
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, space.s) }]} accessibilityRole="tablist">
      {TABS.map(({ path, label, Icon, push }) => {
        const active = pathname === path;
        return (
          <Pressable
            key={path}
            onPress={() => (active ? null : push ? router.push(path) : router.replace(path))}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={path === '/carrito' && cartCount ? `Carrito, ${cartCount} ${cartCount === 1 ? 'pieza' : 'piezas'}` : label}
            style={styles.tab}
          >
            <View style={[styles.tabMark, active && { backgroundColor: color.ink }]} />
            <View>
              <Icon size={24} color={active ? color.ink : color.inkSoft} weight={active ? 'fill' : 'regular'} />
              {path === '/carrito' && cartCount ? <CountBadge count={cartCount} style={{ top: -6, right: -12 }} /> : null}
            </View>
            <Txt variant="small" style={{ color: active ? color.ink : color.inkSoft, fontFamily: active ? font.bodySemi : font.body }}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.xs, paddingHorizontal: space.s, paddingVertical: 2, borderRadius: 6 },
  notice: { flexDirection: 'row', gap: space.m, padding: space.l, borderRadius: radius.control, borderLeftWidth: stripeWidth },
  card: { backgroundColor: color.raised, borderRadius: radius.control, borderLeftWidth: stripeWidth, padding: space.l },
  dateBlock: { width: 56, alignItems: 'center' },
  dateDay: { fontFamily: font.title, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: color.ink },
  tabBar: { flexDirection: 'row', backgroundColor: color.raised, paddingTop: 0 },
  tab: { flex: 1, minHeight: touch + 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabMark: { position: 'absolute', top: 0, width: 32, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
});
