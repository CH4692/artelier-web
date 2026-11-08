import { CustomerInstrument } from '../customers/customer.models';

/** Reuse the existing InstrumentRead shape shared with customer overviews. */
export type Instrument = CustomerInstrument;
export type InstrumentType = Instrument['type'];
export type Ownership = Instrument['ownership'];
export type InstrumentInput = Omit<Instrument, 'id' | 'is_archived'>;
export interface InstrumentFilters {
  q: string;
  type: string;
  ownership: string;
  include_archived: boolean;
  offset: number;
  limit: number;
  sort_by: string;
  sort_order: string;
}
export interface InstrumentPage {
  instruments: Instrument[];
  total: number | null;
}
export type InstrumentState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; data: T }
  | { status: 'error'; message: string; notFound: boolean };
export type RepairStatus =
  | 'accepted'
  | 'awaiting_approval'
  | 'in_progress'
  | 'awaiting_materials'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';
export interface InstrumentRepair {
  id: number;
  instrument_id: number;
  work_description: string;
  performed_at: string | null;
  created_at: string;
  is_archived: boolean;
  customer_id: number | null;
  accepted_at: string | null;
  expected_completion_date: string | null;
  status: RepairStatus;
  status_updated_at: string | null;
  internal_notes: string | null;
  documents: {
    id: number;
    repair_order_id: number;
    filename: string;
    size_bytes: number;
    sha256: string;
    created_at: string;
  }[];
}
export interface InstrumentHistory {
  instrument: Instrument;
  repair_orders: InstrumentRepair[];
}
export interface HistoryPage {
  history: InstrumentHistory;
  total: number | null;
}
