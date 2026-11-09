import type { ApiLoadState } from '../../core/api/load-state';
import type { components } from '../../core/api/generated/schema';

// Read responses include default/null fields; the UI deliberately sends complete editor values.
export type Customer = Required<components['schemas']['CustomerRead']>;
export type CustomerInput = Required<components['schemas']['CustomerCreate']>;
export type CustomerInstrument = Required<components['schemas']['InstrumentRead']>;
export type CustomerOverview = Omit<
  components['schemas']['CustomerOverview'],
  'customer' | 'instruments'
> & {
  customer: Customer;
  instruments: CustomerInstrument[];
};
export interface CustomerPage {
  customers: Customer[];
  total: number | null;
}
export type LoadState<T> = ApiLoadState<T>;
