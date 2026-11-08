import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Workshop dashboard', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function request() {
    return http.expectOne((req) => req.url === '/api/v1/repairs');
  }

  it('shows four German KPIs, a compact header and an explicitly unavailable creation action', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toBe('Werkstattübersicht');
    expect([...element.querySelectorAll('app-metric-card h2')].map((h) => h.textContent)).toEqual([
      'Offene Reparaturen',
      'Abholbereit',
      'Überfällige Aufträge',
      'Anstehende Termine',
    ]);
    const create = element.querySelector<HTMLButtonElement>('.create-action button')!;
    expect(create.disabled).toBe(true);
    expect(
      element.querySelector('#' + create.getAttribute('aria-describedby'))?.textContent,
    ).toContain('noch nicht verfügbar');
    expect(element.querySelectorAll('a[href]')).toHaveLength(0);
    expect(element.querySelector('.welcome')).toBeNull();
    request().flush([], { headers: { 'X-Total-Count': '0' } });
  });

  it('shows true empty data only for the integrated metric and never fabricates urgent records', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Aktuell sind keine Instrumente abholbereit.');
    expect(element.querySelectorAll('.value')).toHaveLength(1);
    expect(element.querySelectorAll('.state-label').length).toBe(3);
    expect(element.querySelector('.urgent')?.textContent).toContain(
      'Dies bedeutet nicht, dass keine dringenden Reparaturen vorliegen.',
    );
    expect(element.querySelector('.urgent a')).toBeNull();
  });

  it('renders a real count and can refresh without duplicate requests', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.componentInstance.loadReady();
    request().flush([{ id: 1 }], { headers: { 'X-Total-Count': '7' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.value').textContent).toContain('7');
    fixture.nativeElement.querySelector('.refresh').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.refresh').disabled).toBe(true);
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Aktuell sind keine Instrumente abholbereit.',
    );
  });

  it('handles API failure with safe copy, then retries successfully', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush(
      { detail: 'sensitive internal error' },
      { status: 503, statusText: 'Unavailable' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Nicht geladen');
    expect(fixture.nativeElement.textContent).not.toContain('sensitive');
    fixture.nativeElement.querySelector('.retry').click();
    request().flush([], { headers: { 'X-Total-Count': '2' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.value').textContent).toContain('2');
  });

  it('cancels an outstanding request when leaving the dashboard', () => {
    const fixture = TestBed.createComponent(Dashboard);
    const pending = request();
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
