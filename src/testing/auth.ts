import { SessionUser } from '../app/core/auth/session-state';

export const testUser: SessionUser = {
  id: 1,
  email: 'maker@example.com',
  role: 'employee',
  is_active: true,
  customer_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
