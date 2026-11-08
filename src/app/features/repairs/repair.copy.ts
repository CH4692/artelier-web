import { INSTRUMENT_COPY } from '../instruments/instrument.copy';
import { RepairStatus } from './repair.models';
export const REPAIR_STATUSES = INSTRUMENT_COPY.statuses;
export const OPEN_STATUSES: RepairStatus[] = [
  'accepted',
  'awaiting_approval',
  'in_progress',
  'awaiting_materials',
  'ready_for_pickup',
];
export const CLOSED_STATUSES: RepairStatus[] = ['completed', 'cancelled'];
export const REPAIR_FIELDS = {
  work_description: 'Arbeitsbeschreibung',
  expected_completion_date: 'Geplanter Abschluss',
  internal_notes: 'Interne Notizen',
} as const;
