// Branch profiles as the client app sees them: photos, hours, services,
// professionals and reviews. Built on top of the shared sample data.
import { DEMO_TODAY, employees, services } from './demo';
import { time } from '../theme/format';

const photo = {
  interior: require('../../assets/photos/barberia-interior.jpg'),
  fade: require('../../assets/photos/trabajo-fade.jpg'),
  unas: require('../../assets/photos/unas.jpg'),
  frasco: require('../../assets/photos/producto-frasco.jpg'),
};

// Hours per weekday, 0 = domingo. null = closed. [open, close] in 24 h.
const MON_SAT_10_20 = [null, [10, 20], [10, 20], [10, 20], [10, 20], [10, 20], [10, 18]];

// What the web panel controls and the app must respect (RF-W07, RF-W09,
// RF-W12, RF-W26, RF-W28, RN-13, RN-14). All active in the demo; change a
// flag to see the item disappear from the app.
export const businessStatus = {
  'los-compas': { subscription: 'activa', suspended: false },
  'estudio-marisol': { subscription: 'activa', suspended: false },
  'navaja-fina': { subscription: 'prueba', suspended: false },
};
const inactiveBranches = []; // branch ids deactivated by their Jefe
const inactiveServices = {}; // { branchId: [serviceId] }
export const employeeStatus = { luis: 'activo', ramon: 'activo', karla: 'activo', fernanda: 'activo', itzel: 'activo' }; // or 'migracion-pendiente'

const svc = (ids) => ids.map((id) => services.find((s) => s.id === id));
const staff = (ids) => ids.map((id) => employees.find((e) => e.id === id));

export const branches = [
  {
    id: 'los-compas-centro',
    businessId: 'los-compas',
    name: 'Barbería Los Compas',
    kind: 'Barbería',
    address: 'Av. Obregón y Calle 5',
    neighborhood: 'Col. Centro',
    phone: '653 534 2210',
    rating: 4.7,
    reviewCount: 212,
    cover: photo.interior,
    gallery: [
      { source: photo.interior, alt: 'Dos sillones de barbero de piel frente al espejo largo' },
      { source: photo.fade, alt: 'Barbero haciendo un fade con máquina en la nuca de un cliente' },
      { source: photo.frasco, alt: 'Frasco de pomada sobre una piedra' },
    ],
    description:
      'Barbería de barrio desde 2014. Fades, cortes clásicos y arreglo de barba con toalla caliente. Hay café mientras esperas y estacionamiento en la Calle 5.',
    hours: MON_SAT_10_20,
    services: svc(['corte-clasico', 'fade', 'barba', 'corte-barba']),
    staff: staff(['luis', 'ramon']),
    reviews: [
      { id: 'r1', author: 'Jorge Méndez', stars: 5, date: '4 de noviembre', service: 'Fade con Luis Ortega', text: 'Llegué a las 5:30 y a las 5:32 ya estaba en la silla. Luis dejó el fade parejo y me explicó cómo peinarlo en la casa.' },
      { id: 'r2', author: 'Carlos Ríos', stars: 5, date: '1 de noviembre', service: 'Corte + barba con Ramón Cázares', text: 'Ramón trabaja la navaja con mucha calma. La barba me quedó definida sin irritación.' },
      { id: 'r3', author: 'Daniela Paz', stars: 3, date: '28 de octubre', service: 'Corte clásico con Ramón Cázares', text: 'Buen corte, pero esperé 15 minutos aunque tenía cita a las 12:00.' },
    ],
  },
  {
    id: 'los-compas-norte',
    businessId: 'los-compas',
    name: 'Los Compas Norte',
    kind: 'Barbería',
    address: 'Av. Libertad y Calle 32',
    neighborhood: 'Col. Burócrata',
    phone: '653 536 1184',
    rating: 4.5,
    reviewCount: 86,
    cover: photo.fade,
    gallery: [
      { source: photo.fade, alt: 'Barbero haciendo un fade con máquina en la nuca de un cliente' },
      { source: photo.interior, alt: 'Dos sillones de barbero de piel frente al espejo largo' },
    ],
    description: 'La segunda sucursal de Los Compas, con los mismos precios. Más tranquila entre semana antes de las 4:00 pm.',
    hours: MON_SAT_10_20,
    services: svc(['corte-clasico', 'fade', 'barba', 'corte-barba']),
    staff: staff(['ramon']),
    reviews: [
      { id: 'r4', author: 'Iván Soto', stars: 5, date: '6 de noviembre', service: 'Fade con Ramón Cázares', text: 'Sin espera y el corte quedó igual que en la del centro.' },
      { id: 'r5', author: 'Luz Gámez', stars: 4, date: '30 de octubre', service: 'Corte clásico con Ramón Cázares', text: 'Le corté el pelo a mi hijo de 8 años. Mucha paciencia con él.' },
    ],
  },
  {
    id: 'estudio-marisol',
    businessId: 'estudio-marisol',
    name: 'Estudio Marisol',
    kind: 'Salón y uñas',
    address: 'Calle 2 y Av. Madero',
    neighborhood: 'Col. Centro',
    phone: '653 534 0957',
    rating: 4.8,
    reviewCount: 143,
    cover: photo.unas,
    gallery: [{ source: photo.unas, alt: 'Manos con uñas recién arregladas sobre una mesa con esmaltes y lámpara' }],
    description: 'Salón de color y uñas. Tintes, mechas y uñas acrílicas con cita. Para mechas, llega con el cabello sin lavar.',
    hours: [null, [9, 19], [9, 19], [9, 19], [9, 19], [9, 19], [9, 15]],
    services: svc(['tinte', 'mechas', 'unas']),
    staff: staff(['karla', 'fernanda']),
    reviews: [
      { id: 'r6', author: 'Paola Robles', stars: 5, date: '7 de noviembre', service: 'Mechas con Karla Ruiz', text: 'Karla me hizo prueba de mechón antes de empezar. El tono quedó exacto al de la foto que le llevé.' },
      { id: 'r7', author: 'Mariana León', stars: 5, date: '3 de noviembre', service: 'Uñas acrílicas con Fernanda Lugo', text: 'Me duraron tres semanas sin levantarse.' },
    ],
  },
  {
    id: 'navaja-fina',
    businessId: 'navaja-fina',
    name: 'Navaja Fina',
    kind: 'Barbería clásica',
    address: 'Blvd. Juárez',
    neighborhood: 'Col. Comercial',
    phone: '653 535 7702',
    rating: null,
    reviewCount: 0,
    cover: null,
    coverFile: 'navaja-fina-portada.jpg',
    gallery: [],
    galleryFiles: ['navaja-fina-portada.jpg', 'navaja-fina-sillones.jpg'],
    description: 'Barbería clásica con afeitado a navaja y toalla caliente. Abrió en SNIPP este mes.',
    hours: [null, null, [11, 21], [11, 21], [11, 21], [11, 21], [11, 21]],
    services: svc(['corte-clasico', 'barba', 'corte-barba']),
    staff: [],
    reviews: [],
  },
];

// A branch shows in the app only if it is active and its business is not
// suspended and has a paid subscription or trial.
export function isVisible(branch) {
  const biz = businessStatus[branch.businessId];
  return !inactiveBranches.includes(branch.id) && biz && !biz.suspended && biz.subscription !== 'vencida';
}

// Services and professionals the client can book right now.
export const activeServices = (branch) => branch.services.filter((s) => !(inactiveServices[branch.id] ?? []).includes(s.id));
export const bookableStaff = (branch) => branch.staff.filter((e) => employeeStatus[e.id] === 'activo');

export const visibleBranches = () => branches.filter(isVisible);

export const getBranch = (id) => branches.find((b) => b.id === id);

export const priceFrom = (branch) => Math.min(...activeServices(branch).map((s) => s.price));

export const cheapestService = (branch) => activeServices(branch).reduce((a, b) => (b.price < a.price ? b : a));

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const at = (h) => time(new Date(2025, 0, 1, h, 0));

// "Abierto hasta las 8:00 pm" / "Abre hoy a las 11:00 am" / "Cerrado, abre el lunes a las 10:00 am"
export function openStatus(branch, now = DEMO_TODAY) {
  const today = branch.hours[now.getDay()];
  const hour = now.getHours() + now.getMinutes() / 60;
  if (today && hour >= today[0] && hour < today[1]) {
    return { open: true, label: `Abierto hasta las ${at(today[1])}` };
  }
  if (today && hour < today[0]) {
    return { open: false, label: `Abre hoy a las ${at(today[0])}` };
  }
  for (let i = 1; i <= 7; i += 1) {
    const day = (now.getDay() + i) % 7;
    const h = branch.hours[day];
    if (h) {
      const when = i === 1 ? 'mañana' : `el ${DAY_NAMES[day]}`;
      return { open: false, label: `Cerrado, abre ${when} a las ${at(h[0])}` };
    }
  }
  return { open: false, label: 'Cerrado' };
}

// Week schedule starting Monday, for the branch profile.
export function weekSchedule(branch, now = DEMO_TODAY) {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const h = branch.hours[day];
    return {
      day: DAY_NAMES[day],
      today: day === now.getDay(),
      label: h ? `${at(h[0])} a ${at(h[1])}` : 'Cerrado',
    };
  });
}

export const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Matches by business name, service, neighborhood/address or kind.
export function searchBranches(query, serviceId) {
  const q = normalize(query ?? '');
  return visibleBranches().filter((b) => {
    if (serviceId && !activeServices(b).some((s) => s.id === serviceId)) return false;
    if (!q) return true;
    const haystack = [b.name, b.kind, b.neighborhood, b.address, ...activeServices(b).map((s) => s.name)].map(normalize).join(' | ');
    return q.split(/\s+/).every((word) => haystack.includes(word));
  });
}

// If the query is exactly a service name ("fade", "unas acrilicas"), return it.
export function serviceFromQuery(query) {
  const q = normalize(query ?? '');
  if (!q) return null;
  return services.find((s) => normalize(s.name) === q || normalize(s.name).startsWith(q)) ?? null;
}

