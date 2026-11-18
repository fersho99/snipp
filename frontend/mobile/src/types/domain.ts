// Domain types of the SNIPP client app (SRS v1.1). The demo data in
// src/data uses them today; the real API will return the same shapes.
import type { ImageProps } from 'expo-image';

// A bundled photo (require) or a remote one.
export type Photo = ImageProps['source'];

export interface Business {
  id: string;
  name: string;
  kind: string;
  branches: { id: string; name: string; address: string; neighborhood: string; phone: string }[];
}

export interface Employee {
  id: string;
  name: string;
  specialty: string;
  businessId: string;
}

export interface Service {
  id: string;
  name: string;
  minutes: number;
  price: number;
}

export interface Client {
  firstName: string;
  name: string;
  email: string;
  phone: string;
  photo: string | null;
}

// Opening hours per weekday, 0 = Sunday. null = closed. [open, close] in whole hours, 24 h.
export type DayHours = [number, number] | null;

export interface Review {
  id: string;
  author: string;
  stars: number;
  date: string;
  service: string;
  text: string;
}

// RF-M05: a branch profile as the client sees it.
export interface Branch {
  id: string;
  businessId: string;
  name: string;
  kind: string;
  address: string;
  neighborhood: string;
  phone: string;
  rating: number | null;
  reviewCount: number;
  cover: Photo | null;
  // Expected file when the photo is not in the demo yet.
  coverFile?: string;
  gallery: { source: Photo; alt: string }[];
  galleryFiles?: string[];
  description: string;
  hours: DayHours[];
  services: Service[];
  staff: Employee[];
  reviews: Review[];
}

// RF-M06 to RF-M08, RF-W18.
export type AppointmentStatus =
  | 'confirmada'
  | 'cambio'
  | 'cancelada-negocio'
  | 'cancelada-cliente'
  | 'atendida'
  | 'no-asistio'
  | 'empleado-no-se-presento';

export type ReportReason = 'trato' | 'puntualidad' | 'higiene' | 'calidad' | 'otro';
// RF-M14.
export interface Report {
  sentOn: string;
  state: 'enviado' | 'en revisión' | 'atendido';
  reason: ReportReason | string;
  text: string;
}

export interface Appointment {
  folio: string;
  serviceId: string;
  employeeId: string;
  branchId: string;
  // YYYY-MM-DD
  date: string;
  // Minutes from midnight.
  start: number;
  status: AppointmentStatus;
  businessNote?: string;
  changedAt?: string;
  // RF-M08: a change the business proposed and the client has not answered.
  change?: { employeeId: string | null; date: string | null; start: number | null; note: string; at: string } | null;
  review?: { stars: number; text: string } | null;
  report?: Report | null;
}

// Icon used next to a status text; a status never depends on color alone.
export type Tone = 'done' | 'pending' | 'stopped' | 'soft';
export interface StatusText {
  label: string;
  tone: Tone;
}

// RF-M09: a product of one branch with its stock.
export interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  stock: number;
  branchId: string;
  photo?: Photo;
  photoFile?: string;
  description: string;
  howTo: string;
}

export type OrderStatus = 'pagado' | 'listo' | 'entregado' | 'cancelado';
// RF-M10, RF-M11.
export interface Order {
  folio: string;
  branchId: string;
  items: { productId: string; qty: number; price: number }[];
  total: number;
  pointsUsed: number;
  status: OrderStatus;
  paymentRef: string;
  placedOn: string;
  refund?: { amount: number; note: string };
  timeline: [OrderStatus, string][];
}

export interface CartItem {
  productId: string;
  qty: number;
}
export interface Cart {
  branchId: string | null;
  items: CartItem[];
}

// RF-M15: a points movement in one business.
export interface PointsMovement {
  id: string;
  businessId: string;
  points: number;
  label: string;
  date: string;
  route: string;
}

// RF-M16.
export type NotificationKind = 'confirmacion' | 'recordatorio-24h' | 'recordatorio-1h' | 'cambio' | 'cancelacion' | 'reagendada' | 'pedido-listo';
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  day: 'hoy' | 'ayer' | 'antes';
  when: string;
  read: boolean;
  route: string;
  title: string;
  body: string;
}
