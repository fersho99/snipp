import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentType } from 'react';
import type { IconProps } from 'phosphor-react-native';
import type { StatusText, Tone } from '../types/domain';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarBlankIcon, CheckCircleIcon, ClockIcon, HouseIcon, ShoppingBagIcon, UserIcon, XCircleIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { color, font, space, touch } from '../theme/tokens';
import { CountBadge } from './CartButton';
import { cartSummary, useCart } from '../data/shop';

// Grayscale UI: every status is an icon plus explicit text, never color alone.
// tone: done (confirmada, atendida, pagado) | pending (falta respuesta, en revisión)
//       | stopped (cancelada, no se presentó, error) | soft (pasado sin acción)
const ICON: Partial<Record<Tone, ComponentType<IconProps>>> = { done: CheckCircleIcon, pending: ClockIcon, stopped: XCircleIcon };

export function StatusLine({ status, style }: { status: StatusText; style?: StyleProp<ViewStyle> }) {
  const Icon = ICON[status.tone];
  return (
    <View style={[styles.status, style]}>
      {Icon ? <Icon size={18} color={color.ink} weight={status.tone === 'pending' ? 'bold' : 'fill'} /> : null}
      <Txt
        variant="small"
        style={{ color: status.tone === 'soft' ? color.inkSoft : color.ink, fontFamily: status.tone === 'soft' ? font.body : font.bodySemi, flexShrink: 1 }}
      >
        {status.label}
      </Txt>
    </View>
  );
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
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dateBlock: { width: 56, alignItems: 'center' },
  dateDay: { fontFamily: font.title, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: color.ink },
  tabBar: { flexDirection: 'row', backgroundColor: color.raised, paddingTop: 0 },
  tab: { flex: 1, minHeight: touch + 12, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabMark: { position: 'absolute', top: 0, width: 32, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
});
