import { Customer } from '../customers/customer.models';
import { Instrument } from '../instruments/instrument.models';
import { Repair } from '../repairs/repair.models';
export interface PickupEntry {
  repair: Repair;
  customer: Customer | null;
  instrument: Instrument | null;
  customerUnavailable: boolean;
  instrumentUnavailable: boolean;
}
export interface PickupSnapshot {
  entries: PickupEntry[];
  total: number | null;
  relationsPending: boolean;
}
export type PickupState =
  | { status: 'loading' }
  | { status: 'loaded'; data: PickupSnapshot }
  | { status: 'error'; message: string };
