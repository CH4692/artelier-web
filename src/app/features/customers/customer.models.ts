/** Mirrors the existing FastAPI CustomerRead/Create/Update and overview schemas. */
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_archived: boolean;
}
export interface CustomerInput {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
}
export interface CustomerInstrument {
  id: number;
  type: 'violin' | 'viola' | 'cello' | 'double_bass' | 'bow';
  body_length_mm: number | null;
  bow_weight_g: number | null;
  maker: string | null;
  year_of_manufacture: number | null;
  identification_number: string | null;
  notes: string | null;
  customer_id: number | null;
  ownership: 'customer' | 'workshop' | 'unassigned';
  is_archived: boolean;
}
export interface CustomerOverview {
  customer: Customer;
  instruments: CustomerInstrument[];
}
export interface CustomerPage {
  customers: Customer[];
  total: number | null;
}
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; data: T }
  | { status: 'error'; message: string; notFound: boolean };
