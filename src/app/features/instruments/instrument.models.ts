import type { ApiLoadState } from '../../core/api/load-state';
import type { components } from '../../core/api/generated/schema';
import { CustomerInstrument } from '../customers/customer.models';

/** Reuse the existing InstrumentRead shape shared with customer overviews. */
export type Instrument = CustomerInstrument;
export type InstrumentType = Instrument['type'];
export type Ownership = Instrument['ownership'];
export type InstrumentInput = Required<components['schemas']['InstrumentCreate']>;
export interface InstrumentFilters {
  customer_id?: number;
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
export type InstrumentState<T> = ApiLoadState<T>;
export type RepairStatus = components['schemas']['RepairStatus'];
export type InstrumentRepair = Required<components['schemas']['RepairOrderDetail']>;
export type InstrumentHistory = Omit<
  components['schemas']['InstrumentHistoryRead'],
  'instrument' | 'repair_orders'
> & {
  instrument: Instrument;
  repair_orders: InstrumentRepair[];
};
export interface HistoryPage {
  history: InstrumentHistory;
  total: number | null;
}
