// Sample data used by every batch of screens. Keep it identical across
// mobile and web so the screens tell one coherent story.

// Demo "today": Thursday 12 November 2026 (the SRS v1.1 is dated 13/11/2026
// and the project runs 02/11/2026 to 19/03/2027). The booking calendar ends
// two months later, on 12 January 2027 (RN-02).
export const DEMO_TODAY = new Date(2026, 10, 12, 10, 0);

export const businesses = [
  {
    id: 'los-compas',
    name: 'Barbería Los Compas',
    kind: 'Barbería',
    branches: [
      { id: 'los-compas-centro', name: 'Barbería Los Compas', address: 'Av. Obregón y Calle 5', neighborhood: 'Col. Centro', phone: '653 534 2210' },
      { id: 'los-compas-norte', name: 'Los Compas Norte', address: 'Av. Libertad y Calle 32', neighborhood: 'Col. Burócrata', phone: '653 536 1184' },
    ],
  },
  {
    id: 'estudio-marisol',
    name: 'Estudio Marisol',
    kind: 'Salón y uñas',
    branches: [{ id: 'estudio-marisol', name: 'Estudio Marisol', address: 'Calle 2 y Av. Madero', neighborhood: 'Col. Centro', phone: '653 534 0957' }],
  },
  {
    id: 'navaja-fina',
    name: 'Navaja Fina',
    kind: 'Barbería clásica',
    branches: [{ id: 'navaja-fina', name: 'Navaja Fina', address: 'Blvd. Juárez', neighborhood: 'Col. Comercial', phone: '653 535 7702' }],
  },
];

export const employees = [
  { id: 'luis', name: 'Luis Ortega', specialty: 'Fades y barba', businessId: 'los-compas' },
  { id: 'ramon', name: 'Ramón Cázares', specialty: 'Corte clásico, navaja', businessId: 'los-compas' },
  { id: 'oscar', name: 'Óscar Félix', specialty: 'Fades y diseños', businessId: 'los-compas' },
  { id: 'karla', name: 'Karla Ruiz', specialty: 'Color y mechas', businessId: 'estudio-marisol' },
  { id: 'fernanda', name: 'Fernanda Lugo', specialty: 'Uñas acrílicas', businessId: 'estudio-marisol' },
  { id: 'itzel', name: 'Itzel Duarte', specialty: 'Recepción', businessId: 'los-compas' },
];

export const services = [
  { id: 'corte-clasico', name: 'Corte clásico', minutes: 40, price: 180 },
  { id: 'fade', name: 'Fade', minutes: 45, price: 220 },
  { id: 'barba', name: 'Arreglo de barba', minutes: 25, price: 120 },
  { id: 'corte-barba', name: 'Corte + barba', minutes: 60, price: 280 },
  { id: 'tinte', name: 'Tinte completo', minutes: 120, price: 850 },
  { id: 'mechas', name: 'Mechas', minutes: 150, price: 1200 },
  { id: 'unas', name: 'Uñas acrílicas', minutes: 90, price: 450 },
];

export const products = [
  { id: 'pomada', name: 'Pomada mate', size: '100 g', price: 230, stock: 14 },
  { id: 'aceite', name: 'Aceite para barba', size: '30 ml', price: 190, stock: 6 },
  { id: 'shampoo', name: 'Shampoo matizador', size: '300 ml', price: 310, stock: 0 },
  { id: 'cera', name: 'Cera fijación media', size: '', price: 210, stock: 22 },
];

export const client = {
  firstName: 'Andrea',
  name: 'Andrea Valenzuela',
  email: 'andrea.valenzuela@gmail.com',
  phone: '653 118 4420',
  photo: null, // no photo uploaded yet
  // Loyalty points live in data/shop.js (movements per business, RF-M15).
};

export const nextAppointment = {
  folio: 'C-10482',
  serviceId: 'fade',
  employeeId: 'luis',
  branchId: 'los-compas-centro',
  dateLabel: 'jueves 19 de noviembre',
  timeLabel: '5:30 pm',
};
