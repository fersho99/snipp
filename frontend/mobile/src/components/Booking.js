import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CaretLeftIcon, CaretRightIcon } from 'phosphor-react-native';
import Txt from './Txt';
import { dayStatus, iso, lastBookableDate, today } from '../data/availability';
import { shortDate } from '../theme/format';
import { color, font, radius, space, touch, type } from '../theme/tokens';

// The appointment written as a sentence that grows with each choice:
// "Fade con Luis Ortega, jueves 20 de noviembre a las 5:30 pm".
// Each chosen part is underlined and tappable to change it.
export function BookingSentence({ parts, onEdit }) {
  return (
    <Txt variant="title" accessibilityRole="header">
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <Txt key={i} variant="title">{p}</Txt>
        ) : (
          <Txt
            key={i}
            variant="title"
            onPress={() => onEdit(p.step)}
            accessibilityRole="button"
            accessibilityLabel={`${p.text}. Toca para cambiar`}
            style={styles.part}
          >
            {p.text}
          </Txt>
        ),
      )}
    </Txt>
  );
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = [
  ['L', 'lunes'], ['M', 'martes'], ['M', 'miércoles'], ['J', 'jueves'], ['V', 'viernes'], ['S', 'sábado'], ['D', 'domingo'],
];

// Month calendar that simply ends at the last bookable date (two months from
// today): later days are not rendered at all, and there is no next month.
export function BookingCalendar({ branch, employeeId, serviceId, duration, selected, onSelect, ignoreFolio }) {
  const start = today();
  const end = lastBookableDate();
  const months = useMemo(() => {
    const list = [];
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      list.push(new Date(d));
      d.setMonth(d.getMonth() + 1);
    }
    return list;
  }, [start.getTime(), end.getTime()]);

  const initialIndex = selected ? Math.max(0, months.findIndex((m) => m.getMonth() === selected.getMonth() && m.getFullYear() === selected.getFullYear())) : 0;
  const [index, setIndex] = useState(initialIndex);
  const month = months[index];

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const list = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      if (date > end) break; // the calendar ends here
      list.push({ date, status: dayStatus(branch, employeeId, serviceId, date, duration, ignoreFolio) });
    }
    return list;
  }, [month, branch, employeeId, serviceId, duration]);

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={styles.monthBar}>
        <Txt variant="heading">{MONTHS[month.getMonth()]} {month.getFullYear()}</Txt>
        <View style={{ flexDirection: 'row' }}>
          <NavArrow dir="prev" disabled={index === 0} onPress={() => setIndex(index - 1)} label={index > 0 ? `Ver ${MONTHS[months[index - 1].getMonth()]}` : 'No hay meses anteriores'} />
          <NavArrow dir="next" disabled={index === months.length - 1} onPress={() => setIndex(index + 1)} label={index < months.length - 1 ? `Ver ${MONTHS[months[index + 1].getMonth()]}` : 'No se puede reservar más adelante'} />
        </View>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map(([l, name]) => (
          <View key={name} style={styles.cell} accessible accessibilityLabel={name}>
            <Txt variant="small">{l}</Txt>
          </View>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.week}>
          {Array.from({ length: 7 }).map((_, c) => {
            const cell = row[c];
            if (!cell) return <View key={c} style={styles.cell} />;
            const { date, status } = cell;
            const isSelected = selected && iso(selected) === iso(date);
            const isToday = iso(date) === iso(start);
            const enabled = status === 'open';
            const reason = { past: 'ya pasó', closed: 'cerrado', full: 'sin horarios libres', off: 'no trabaja ese día', open: 'con horarios libres' }[status];
            return (
              <Pressable
                key={c}
                disabled={!enabled}
                onPress={() => onSelect(date)}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled, selected: !!isSelected }}
                accessibilityLabel={`${shortDate(date)}${isToday ? ', hoy' : ''}, ${reason}`}
                style={styles.cell}
              >
                <View style={[styles.day, isSelected && styles.daySelected]}>
                  <Txt
                    numeric
                    style={[
                      styles.dayText,
                      !enabled && styles.dayDisabled,
                      (status === 'full' || status === 'off') && styles.dayStruck,
                      isToday && styles.dayToday,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function NavArrow({ dir, disabled, onPress, label }) {
  const Icon = dir === 'prev' ? CaretLeftIcon : CaretRightIcon;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} style={[styles.nav, disabled && { opacity: 0.3 }]}>
      <Icon size={22} color={color.ink} />
    </Pressable>
  );
}

// Grid of free times. Selected time is ink with white text; others sit on sunken.
export function SlotGrid({ groups, selected, onSelect }) {
  return (
    <View style={{ gap: space.xl }}>
      {groups.map((g) => (
        <View key={g.id}>
          <Txt variant="label">{g.label}<Txt variant="small" numeric>  {g.items.length} {g.items.length === 1 ? 'horario' : 'horarios'}</Txt></Txt>
          <View style={styles.slots}>
            {g.items.map((s) => {
              const active = selected === s.start;
              return (
                <Pressable
                  key={s.start}
                  onPress={() => onSelect(s)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => [styles.slot, active && styles.slotActive, pressed && !active && { backgroundColor: color.sunkenPressed }]}
                >
                  <Txt numeric style={[styles.slotText, active && { color: color.white }]}>{s.label}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  part: {
    ...type.title,
    textDecorationLine: 'underline',
    textDecorationColor: color.ink,
    textDecorationStyle: 'solid',
  },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: touch, height: touch, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, height: touch, alignItems: 'center', justifyContent: 'center' },
  day: { width: 42, height: 42, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: color.ink },
  dayText: { fontFamily: font.bodySemi, fontSize: 16, color: color.ink },
  dayDisabled: { color: color.inkSoft, fontFamily: font.body },
  dayStruck: { textDecorationLine: 'line-through' },
  dayToday: { textDecorationLine: 'underline', fontFamily: font.bodySemi },
  dayTextSelected: { color: color.white, opacity: 1, fontFamily: font.bodySemi },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.s },
  slot: {
    flexBasis: '31%',
    flexGrow: 1,
    maxWidth: '33%',
    minHeight: touch,
    borderRadius: radius.control,
    backgroundColor: color.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive: { backgroundColor: color.ink },
  slotText: { fontFamily: font.bodyMedium, fontSize: 15, color: color.ink },
});
