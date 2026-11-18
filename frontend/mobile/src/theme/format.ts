// Formatting helpers: MXN money ($1,200), 12 h times (5:30 pm), Spanish dates.

export function money(amount: number) {
  const hasCents = Math.round(amount) !== amount;
  const fixed = hasCents ? amount.toFixed(2) : String(Math.round(amount));
  const [int, cents] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${withCommas}${cents ? `.${cents}` : ''}`;
}

export function time(date: Date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${suffix}`; // no-break space: "5:00 pm" never splits
}

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function longDate(date: Date) {
  return `${DAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export function shortDate(date: Date) {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export function minutes(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// Expected photo filename for a person: "Ramón Cázares" -> "ramon-cazares.jpg".
export function photoFile(name: string) {
  return `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')}.jpg`;
}
