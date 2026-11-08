import { Instrument, InstrumentRepair } from '../app/features/instruments/instrument.models';
export const testInstrument: Instrument = {
  id: 8,
  type: 'violin',
  maker: 'Testwerkstatt',
  year_of_manufacture: 1998,
  identification_number: 'TEST-8',
  body_length_mm: 356,
  bow_weight_g: null,
  notes: 'Testnotiz',
  customer_id: 12,
  ownership: 'customer',
  is_archived: false,
};
export const testRepair: InstrumentRepair = {
  id: 20,
  instrument_id: 8,
  work_description: 'Steg anpassen',
  performed_at: '2026-02-01T10:00:00Z',
  accepted_at: '2026-01-30T10:00:00Z',
  created_at: '2026-01-30T10:00:00Z',
  expected_completion_date: '2026-02-02',
  is_archived: false,
  customer_id: 12,
  status: 'completed',
  status_updated_at: '2026-02-01T10:00:00Z',
  internal_notes: null,
  documents: [],
};
