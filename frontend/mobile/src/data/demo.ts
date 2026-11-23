// Sample data of the client app. Businesses, branches, services,
// professionals, products and the client come from the data shared with the
// web panel (frontend/shared/seed.ts), so both tell the same story.

// Demo "today": Thursday 12 November 2026 (the SRS v1.1 is dated 13/11/2026
// and the project runs 02/11/2026 to 19/03/2027). The booking calendar ends
// two months later, on 12 January 2027 (RN-02).
import { DEMO_TODAY } from '@shared/dates';
import * as shared from '@shared/seed';
import type { Business, Client, Employee, Service } from '../types/domain';

export { DEMO_TODAY };

export const businesses: Business[] = shared.businesses.map((b) => ({
  id: b.id,
  name: b.name,
  kind: b.kind,
  branches: shared.branches
    .filter((br) => br.businessId === b.id)
    .map(({ id, name, address, neighborhood, phone }) => ({ id, name, address, neighborhood, phone })),
}));

export const employees: Employee[] = shared.employees.map(({ id, name, specialty, businessId }) => ({ id, name, specialty, businessId }));

export const services: Service[] = shared.services.map(({ id, name, minutes, price }) => ({ id, name, minutes, price }));

export const products = shared.products.map(({ id, name, size, price }) => ({ id, name, size, price }));

export const client: Client = {
  ...shared.clients[0],
  photo: null, // no photo uploaded yet
  // Loyalty points live in data/shop.ts (movements per business, RF-M15).
};

// Lookups by id. The demo data always points to existing records, so a
// missing one is a bug and fails loudly instead of showing empty text.
export function getEmployee(id: string | null | undefined): Employee {
  const e = employees.find((x) => x.id === id);
  if (!e) throw new Error(`Missing employee ${id}`);
  return e;
}
export function getBusiness(id: string | null | undefined): Business {
  const b = businesses.find((x) => x.id === id);
  if (!b) throw new Error(`Missing business ${id}`);
  return b;
}
