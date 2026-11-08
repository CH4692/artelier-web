import { of } from 'rxjs';
import { DashboardService } from './dashboard.service';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Workshop dashboard', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(DashboardService), 'pickup').mockReturnValue(
      of({ entries: [], total: 0, relationsPending: false }),
    );
  });
  afterEach(() => http.verify());

  function request() {
    return http.expectOne((req) => req.url === '/api/v1/repairs');
  }

  it('shows four German KPIs, a compact header and an available repair creation action', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toBe('Werkstattübersicht');
    expect([...element.querySelectorAll('app-metric-card h2')].map((h) => h.textContent)).toEqual([
      'Offene Reparaturen',
      'Abholbereit',
      'Überfällige Aufträge',
      'Bevorstehende Fristen',
    ]);
    expect(element.querySelector('.create-action a')?.getAttribute('href')).toBe('/repairs/new');
    expect(element.querySelector('.welcome')).toBeNull();
    expect(element.querySelector('.section-number')).toBeNull();
    expect(element.querySelectorAll('.refresh')).toHaveLength(1);
    expect(
      element.querySelector('.refresh')?.closest('article')?.getAttribute('aria-labelledby'),
    ).toBe('ready-title');
    request().flush([], { headers: { 'X-Total-Count': '0' } });
  });

  it('shows true empty data only for the integrated metric and never fabricates urgent records', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Keine Aufträge abholbereit.');
    expect(element.querySelectorAll('.value')).toHaveLength(1);
    expect(element.querySelectorAll('.state-label').length).toBe(3);
    expect(element.querySelector('.urgent')?.textContent).toContain(
      'Dringende Aufträge können dennoch bestehen.',
    );
    expect(element.querySelector('.urgent a')?.getAttribute('href')).toBe('/repairs?view=open');
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
    expect(fixture.nativeElement.textContent).toContain('Keine Aufträge abholbereit.');
  });

  it('handles API failure with safe copy, then retries successfully', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush(
      { detail: 'sensitive internal error' },
      { status: 503, statusText: 'Unavailable' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Daten konnten nicht geladen werden.');
    expect(fixture.nativeElement.textContent).not.toContain('sensitive');
    fixture.nativeElement.querySelector('.retry').click();
    request().flush([], { headers: { 'X-Total-Count': '2' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.value').textContent).toContain('2');
  });

  it('keeps the last real count visible while refreshing and after a failed refresh', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush([], { headers: { 'X-Total-Count': '7' } });
    await fixture.whenStable();
    fixture.componentInstance.loadReady();
    fixture.componentInstance.loadReady();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.value')?.textContent).toContain('7');
    expect(element.textContent).toContain('Letzter Stand');
    expect(element.querySelector('.refresh')?.getAttribute('aria-busy')).toBe('true');
    request().flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(element.querySelector('.value')?.textContent).toContain('7');
    expect(element.textContent).toContain('Letzter Stand');
    expect(element.textContent).toContain('Daten konnten nicht geladen werden.');
    expect(element.querySelectorAll('.metric-actions button')).toHaveLength(1);
    element.querySelector<HTMLButtonElement>('.retry')!.click();
    request().flush([], { headers: { 'X-Total-Count': '3' } });
    await fixture.whenStable();
    expect(element.querySelector('.value')?.textContent).toContain('3');
    expect(element.textContent).not.toContain('Letzter Stand');
  });

  it('retains a previously confirmed zero without presenting a failed refresh as currently empty', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    fixture.componentInstance.loadReady();
    request().flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.value')?.textContent).toContain('0');
    expect(element.textContent).toContain('Letzter Stand');
    expect(element.querySelector('#ready-title')?.closest('article')?.textContent).not.toContain(
      'Keine Aufträge abholbereit.',
    );
    element.querySelector<HTMLButtonElement>('.retry')!.click();
    await fixture.whenStable();
    expect(element.querySelector('.value')?.textContent).toContain('0');
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    await fixture.whenStable();
    expect(element.textContent).toContain('Keine Aufträge abholbereit.');
    expect(element.textContent).not.toContain('Letzter Stand');
  });

  it('preserves the last count when a refresh response lacks a reliable total', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush([], { headers: { 'X-Total-Count': '4' } });
    fixture.componentInstance.loadReady();
    request().flush([]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.value')?.textContent).toContain('4');
    expect(element.textContent).toContain('Letzter Stand');
    expect(fixture.componentInstance.ready()).toEqual({ status: 'unavailable', previousValue: 4 });
  });

  it('preserves the focused refresh control through failure, retry and recovery', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    request().flush([], { headers: { 'X-Total-Count': '2' } });
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const button = element.querySelector<HTMLButtonElement>('.refresh')!;
    button.focus();
    button.click();
    request().flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(element.querySelector('.refresh')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-label')).toBe('Abholbereit: Erneut versuchen');
    expect(element.querySelectorAll('.metric-actions button')).toHaveLength(1);
    button.click();
    await fixture.whenStable();
    expect(element.querySelector('.refresh')).toBe(button);
    expect(button.disabled).toBe(true);
    request().flush([], { headers: { 'X-Total-Count': '3' } });
    await fixture.whenStable();
    expect(element.querySelector('.refresh')).toBe(button);
    expect(button.getAttribute('aria-label')).toBe('Abholzahl aktualisieren');
    expect(button.disabled).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it('cancels an outstanding request when leaving the dashboard', () => {
    const fixture = TestBed.createComponent(Dashboard);
    const pending = request();
    fixture.destroy();
    expect(pending.cancelled).toBe(true);
  });
});
