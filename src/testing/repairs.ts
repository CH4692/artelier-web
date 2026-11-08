import { testRepair } from './instruments';
import { RepairDetailData } from '../app/features/repairs/repair.models';
export const testManagedRepair: RepairDetailData = {
  ...testRepair,
  status: 'accepted',
  performed_at: null,
  accepted_at: '2026-02-01T10:00:00Z',
  status_updated_at: '2026-02-01T10:00:00Z',
  expected_completion_date: '2026-02-10',
  internal_notes: 'Prüfung der Decke',
};
