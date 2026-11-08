import { Customer, CustomerOverview } from '../app/features/customers/customer.models';

export const testCustomer: Customer = {
  id: 12,
  first_name: 'Maria',
  last_name: 'Beispiel',
  email: 'maria@example.com',
  phone: '+49512112345',
  is_archived: false,
};
export const testOverview: CustomerOverview = {
  customer: testCustomer,
  instruments: [
    {
      id: 8,
      type: 'violin',
      maker: 'Testwerkstatt',
      identification_number: 'TEST-8',
      year_of_manufacture: 1998,
      body_length_mm: 356,
      bow_weight_g: null,
      notes: 'Nur ein Testinstrument.',
      customer_id: 12,
      ownership: 'customer',
      is_archived: false,
    },
  ],
};
