import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Customer } from '../../src/app/features/customers/customer.models';
import type { Instrument } from '../../src/app/features/instruments/instrument.models';
import type { Repair, RepairStatus } from '../../src/app/features/repairs/repair.models';
export interface Credentials {
  email: string;
  password: string;
}
export interface Runtime {
  employees: Credentials[];
  admin: Credentials;
  portal: Credentials;
  apiURL: string;
  expiryURL: string;
  baseURL: string;
}
export function runtime(): Runtime {
  return JSON.parse(readFileSync(process.env['E2E_RUNTIME']!, 'utf8')) as Runtime;
}
export const unique = (prefix: string) => `${prefix}-${randomUUID().slice(0, 12)}`;
export async function loginUI(page: Page, credentials: Credentials) {
  await page.getByLabel('Email', { exact: true }).fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
export async function loginAPI(page: Page, credentials: Credentials, url = '/api/v1/auth/login') {
  const response = await page.request.post(url, {
    data: credentials,
    headers: { Origin: runtime().baseURL, 'X-CSRF-Protection': '1' },
  });
  expect(response.status(), 'Real backend login').toBe(200);
}
export class Records {
  private customers: number[] = [];
  private instruments: number[] = [];
  private repairs: number[] = [];
  constructor(private api: APIRequestContext) {}
  async write<T>(method: 'post' | 'patch', path: string, data: unknown): Promise<T> {
    const response = await this.api[method]('/api/v1/' + path, {
      data,
      headers: { Origin: runtime().baseURL, 'X-CSRF-Protection': '1' },
    });
    expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
    return response.json() as Promise<T>;
  }
  async customer(firstName = unique('E2E')) {
    const data = await this.write<Customer>('post', 'customers', {
      first_name: firstName,
      last_name: 'Testkunde',
      email: null,
      phone: null,
    });
    this.customers.push(data.id);
    return data;
  }
  async instrument(customer: Customer, identifier = unique('E2E')) {
    const data = await this.write<Instrument>('post', 'instruments', {
      type: 'violin',
      ownership: 'customer',
      customer_id: customer.id,
      identification_number: identifier,
      maker: 'Testwerkstatt',
      body_length_mm: 356,
    });
    this.instruments.push(data.id);
    return data;
  }
  async repair(customer: Customer, instrument: Instrument) {
    const data = await this.write<Repair>('post', 'repairs', {
      customer_id: customer.id,
      instrument_id: instrument.id,
      work_description: unique('E2E-Arbeit'),
      expected_completion_date: '2030-04-12',
    });
    this.repairs.push(data.id);
    return data;
  }
  async status(id: number, status: RepairStatus) {
    return this.write<Repair>('patch', `repairs/${id}/status`, { status });
  }
  async cleanup() {
    for (const [path, ids] of [
      ['repair-orders', this.repairs],
      ['instruments', this.instruments],
      ['customers', this.customers],
    ] as const)
      for (const id of ids)
        await this.write('patch', `${path}/${id}/archive`, { is_archived: true });
  }
}
export const test = base.extend<{ credentials: Credentials; signedIn: Page; records: Records }>({
  credentials: async ({ baseURL }, use, info) => {
    expect(baseURL).toBe(runtime().baseURL);
    await use(runtime().employees[info.parallelIndex % 8]);
  },
  signedIn: async ({ page, credentials }, use) => {
    await loginAPI(page, credentials);
    await use(page);
  },
  records: async ({ signedIn }, use) => {
    const records = new Records(signedIn.request);
    try {
      await use(records);
    } finally {
      await records.cleanup();
    }
  },
});
export { expect };
export async function selectCustomer(page: Page, name: string) {
  await page.getByRole('button', { name: 'Kunden suchen', exact: true }).click();
  await page.getByLabel('Name, E-Mail oder Telefon suchen').fill(name);
  await page.getByRole('button', { name: new RegExp(name) }).click();
}
export async function selectInstrument(page: Page, identifier: string) {
  await page.getByRole('button', { name: 'Instrumente suchen', exact: true }).click();
  await page.getByLabel('Kennnummer suchen', { exact: true }).fill(identifier);
  await page.getByRole('button', { name: new RegExp(identifier) }).click();
}

/** Wait for the shell navigation completion signal before interacting with a new document. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('main')).toBeFocused();
}
