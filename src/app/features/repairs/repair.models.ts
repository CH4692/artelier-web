import type { components } from '../../core/api/generated/schema';
import { InstrumentRepair, RepairStatus } from '../instruments/instrument.models';
export type { RepairStatus } from '../instruments/instrument.models';
export type Repair = Omit<InstrumentRepair, 'documents'>;
export type RepairDetailData = InstrumentRepair;
export type RepairUpdate = Pick<
  Required<components['schemas']['RepairOrderUpdate']>,
  'expected_completion_date' | 'internal_notes'
> & {
  work_description: NonNullable<components['schemas']['RepairOrderUpdate']['work_description']>;
};
export type RepairCreate = RepairUpdate &
  Pick<components['schemas']['RepairOrderRegister'], 'customer_id' | 'instrument_id'>;
export interface RepairPage {
  repairs: Repair[];
  total: number | null;
}
export interface RepairFilter {
  status: RepairStatus;
  customer_id: number | null;
  include_archived: boolean;
  offset: number;
}
