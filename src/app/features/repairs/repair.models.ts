import { InstrumentRepair, RepairStatus } from '../instruments/instrument.models';
export type { RepairStatus } from '../instruments/instrument.models';
export type Repair = Omit<InstrumentRepair, 'documents'>;
export type RepairDetailData = InstrumentRepair;
export interface RepairUpdate {
  work_description: string;
  expected_completion_date: string | null;
  internal_notes: string | null;
}
export interface RepairCreate extends RepairUpdate {
  customer_id: number;
  instrument_id: number;
}
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
