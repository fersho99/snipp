// Branch profiles as the client app sees them: photos, hours, services,
// professionals and reviews. Everything but the photos comes from the data
// shared with the web panel (frontend/shared/store.ts), so a branch, a
// service or an Empleado the Jefe registers shows up here, and one the Jefe
// deactivates goes away (RF-W05 to RF-W10, RN-14).
import { dayMonth } from '@shared/effects';
import { isPublished } from '@shared/feedback';
import { businessVisible } from '@shared/rules';
import { getData } from '@shared/store';
import type { Branch as SharedBranch, DemoData } from '@shared/types';
import { DEMO_TODAY, employees, liveList, services } from './demo';
import { time } from '../theme/format';
import type { Branch, Employee, Service } from '../types/domain';

const photo = {
  interior: require('../../assets/photos/barberia-interior.jpg'),
  fade: require('../../assets/photos/trabajo-fade.jpg'),
  unas: require('../../assets/photos/unas.jpg'),
  frasco: require('../../assets/photos/producto-frasco.jpg'),
};

const svc = (ids: string[]): Service[] => ids.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => !!s);

// Photos and the rating before the demo of each sample branch. A branch
// registered in the panel has no photos in the app yet (they are files of
// that browser) and starts without rating.
type AppExtras = Pick<Branch, 'id' | 'rating' | 'reviewCount' | 'cover' | 'coverFile' | 'gallery' | 'galleryFiles'>;
const EXTRAS: AppExtras[] = [
  {
    id: 'los-compas-centro',
    rating: 4.7,
    reviewCount: 212,
    cover: photo.interior,
    gallery: [
      { source: photo.interior, alt: 'Dos sillones de barbero de piel frente al espejo largo' },
      { source: photo.fade, alt: 'Barbero haciendo un fade con máquina en la nuca de un cliente' },
      { source: photo.frasco, alt: 'Frasco de pomada sobre una piedra' },
    ],
  },
  {
    id: 'los-compas-norte',
    rating: 4.5,
    reviewCount: 86,
    cover: photo.fade,
    gallery: [
      { source: photo.fade, alt: 'Barbero haciendo un fade con máquina en la nuca de un cliente' },
      { source: photo.interior, alt: 'Dos sillones de barbero de piel frente al espejo largo' },
    ],
  },
  {
    id: 'estudio-marisol',
    rating: 4.8,
    reviewCount: 143,
    cover: photo.unas,
    gallery: [{ source: photo.unas, alt: 'Manos con uñas recién arregladas sobre una mesa con esmaltes y lámpara' }],
  },
  {
    id: 'navaja-fina',
    rating: null,
    reviewCount: 0,
    cover: null,
    coverFile: 'navaja-fina-portada.jpg',
    gallery: [],
    galleryFiles: ['navaja-fina-portada.jpg', 'navaja-fina-sillones.jpg'],
  },
];

const hour = (hhmm: string) => Number(hhmm.split(':')[0]);
const reviewDate = (on: string) => dayMonth(on);

// The shared branch plus the photos. Reviews come from the shared data: one
// removed by the Administrador leaves the list and the average (RF-W28), a
// new one from the app joins them (RF-M12).
function appBranch(d: DemoData, b: SharedBranch): Branch {
  const extras = EXTRAS.find((x) => x.id === b.id);
  const published = d.reviews.filter((r) => r.branchId === b.id && isPublished(r));
  const fresh = published.filter((r) => r.id.startsWith('rv-'));
  const removed = d.reviews.filter((r) => r.branchId === b.id && !isPublished(r) && !r.id.startsWith('rv-'));
  const sum = (list: { stars: number }[]) => list.reduce((x, r) => x + r.stars, 0);
  let rating: number | null;
  let reviewCount: number;
  if (extras?.rating != null) {
    reviewCount = extras.reviewCount + fresh.length - removed.length;
    rating = reviewCount ? Math.round(((extras.rating * extras.reviewCount + sum(fresh) - sum(removed)) / reviewCount) * 10) / 10 : null;
  } else {
    reviewCount = published.length;
    rating = reviewCount ? Math.round((sum(published) / reviewCount) * 10) / 10 : null;
  }
  return {
    cover: null,
    gallery: [],
    ...extras,
    id: b.id,
    rating,
    reviewCount,
    businessId: b.businessId,
    name: b.name,
    kind: d.businesses.find((x) => x.id === b.businessId)?.kind ?? '',
    address: b.address,
    neighborhood: b.neighborhood,
    phone: b.phone,
    description: b.description,
    hours: b.hours.map((h) => (h ? [hour(h[0]), hour(h[1])] : null)),
    // RN-14: inactive services are not offered.
    services: svc(b.serviceIds.filter((id) => !b.inactiveServiceIds.includes(id))),
    // Professionals clients can book: bookable and not leaving (RF-W10, RF-W12).
    staff: d.employees
      .filter((e) => e.branchId === b.id && e.bookable && e.status === 'activo')
      .map((e) => employees.find((x) => x.id === e.id))
      .filter((e): e is Employee => !!e),
    reviews: [...published].sort((x, y) => y.on.localeCompare(x.on)).map((r) => ({ id: r.id, author: r.author, stars: r.stars, date: reviewDate(r.on), service: r.service, text: r.text })),
  };
}

export const branches: Branch[] = liveList((d) => d.branches.map((b) => appBranch(d, b)));

// RN-13, RF-W09: a branch shows in the app only if the Jefe has it active,
// it offers something, and its business is not suspended and its
// subscription or trial has not run out (the same rule the store uses to
// reject a booking).
export function isVisible(branch: Branch) {
  const shared = getData().branches.find((b) => b.id === branch.id);
  return !!shared?.active && branch.services.length > 0 && businessVisible(getData().businesses.find((b) => b.id === branch.businessId), DEMO_TODAY);
}

// Services and professionals the client can book right now.
export const activeServices = (branch: Branch) => branch.services;
export const bookableStaff = (branch: Branch) => branch.staff;

export const visibleBranches = () => branches.filter(isVisible);

export const getBranch = (id: string | undefined): Branch | undefined => branches.find((b) => b.id === id);
// For records that always point to an existing branch (orders, appointments).
export function branchOf(id: string): Branch {
  const b = getBranch(id);
  if (!b) throw new Error(`Missing branch ${id}`);
  return b;
}

export const priceFrom = (branch: Branch) => Math.min(...activeServices(branch).map((s) => s.price));

export const cheapestService = (branch: Branch) => activeServices(branch).reduce((a, b) => (b.price < a.price ? b : a));

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const at = (h: number) => time(new Date(2025, 0, 1, h, 0));

// "Abierto hasta las 8:00 pm" / "Abre hoy a las 11:00 am" / "Cerrado, abre el lunes a las 10:00 am"
export function openStatus(branch: Branch, now = DEMO_TODAY) {
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
export function weekSchedule(branch: Branch, now = DEMO_TODAY) {
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const h = branch.hours[day];
    return {
      day: DAY_NAMES[day],
      today: day === now.getDay(),
      label: h ? `${at(h[0])} a ${at(h[1])}` : 'Cerrado',
    };
  });
}

export const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Matches by business name, service, neighborhood/address or kind.
export function searchBranches(query?: string | null, serviceId?: string | null) {
  const q = normalize(query ?? '');
  return visibleBranches().filter((b) => {
    if (serviceId && !activeServices(b).some((s) => s.id === serviceId)) return false;
    if (!q) return true;
    const haystack = [b.name, b.kind, b.neighborhood, b.address, ...activeServices(b).map((s) => s.name)].map(normalize).join(' | ');
    return q.split(/\s+/).every((word) => haystack.includes(word));
  });
}

// If the query is exactly a service name ("fade", "unas acrilicas"), return it.
export function serviceFromQuery(query?: string | null) {
  const q = normalize(query ?? '');
  if (!q) return null;
  return services.find((s) => normalize(s.name) === q || normalize(s.name).startsWith(q)) ?? null;
}

