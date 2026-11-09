import { Subject } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, NavigationStart, Event } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { SessionState } from '../../core/auth/session-state';
import { testUser } from '../../../testing/auth';
import { testInstrument } from '../../../testing/instruments';
import { Instruments } from './instruments';

describe('Instrument list', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionState).authenticate(testUser);
  });
  afterEach(() => http.verify());
  const request = () => http.expectOne((r) => r.url === '/api/v1/instruments');
  it('shows loading, real instrument metadata, customer links and dedicated detail navigation', async () => {
    const harness = await RouterTestingHarness.create('/instruments');
    expect(harness.routeNativeElement?.textContent).toContain('werden geladen');
    request().flush([testInstrument], { headers: { 'X-Total-Count': '1' } });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('TEST-8');
    expect(harness.routeNativeElement?.textContent).toContain('Testwerkstatt');
    expect(harness.routeNativeElement?.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/instruments/8',
    );
    expect(harness.routeNativeElement?.querySelector('a[href="/customers/12"]')).not.toBeNull();
  });
  it('debounces queries, cancels prior reads and reuses search terms after history navigation', async () => {
    const harness = await RouterTestingHarness.create('/instruments?offset=25');
    const initial = request();
    const component = harness.routeDebugElement!.componentInstance as Instruments;
    component.search.setValue('TE');
    await new Promise((resolve) => setTimeout(resolve, 50));
    component.search.setValue('TEST');
    http.expectNone((r) => r.url === '/api/v1/instruments');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('q=TEST'), {
      timeout: 1500,
    });
    expect(initial.cancelled).toBe(true);
    const next = request();
    expect(next.request.params.get('offset')).toBe('0');
    next.flush([]);
    await harness.navigateByUrl('/instruments');
    request().flush([]);
    component.search.setValue('TEST');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('q=TEST'), {
      timeout: 1500,
    });
    request().flush([]);
  });
  it('cancels a debounced search as soon as another navigation starts and permits later searches', async () => {
    const harness = await RouterTestingHarness.create('/instruments');
    request().flush([]);
    const component = harness.routeDebugElement!.componentInstance as Instruments;
    const router = TestBed.inject(Router);
    const events = new Subject<Event>();
    const eventSource = vi.spyOn(router, 'events', 'get').mockReturnValue(events);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.useFakeTimers();
    try {
      component.search.setValue('pending');
      await vi.advanceTimersByTimeAsync(200);
      events.next(new NavigationStart(42, '/instruments/8'));
      await vi.advanceTimersByTimeAsync(500);
      expect(navigate).not.toHaveBeenCalled();
      component.search.setValue('next');
      await vi.advanceTimersByTimeAsync(300);
      expect(navigate).toHaveBeenCalledOnce();
      expect(navigate.mock.calls[0][1]?.queryParams).toEqual({ q: 'next', offset: null });
    } finally {
      vi.useRealTimers();
      eventSource.mockRestore();
      navigate.mockRestore();
    }
  });
  it('uses backend filters and pagination and identifies archived instruments', async () => {
    const harness = await RouterTestingHarness.create(
      '/instruments?type=bow&ownership=workshop&include_archived=true&sort_by=maker&sort_order=desc',
    );
    const req = request();
    expect(req.request.params.get('type')).toBe('bow');
    expect(req.request.params.get('sort_by')).toBe('maker');
    req.flush([{ ...testInstrument, is_archived: true }], { headers: { 'X-Total-Count': '26' } });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Archiviert');
    (harness.routeDebugElement!.componentInstance as Instruments).page(1);
    await harness.fixture.whenStable();
    const page = request();
    expect(page.request.params.get('offset')).toBe('25');
    page.flush([]);
  });
  it('distinguishes empty from errors and supports retry', async () => {
    const harness = await RouterTestingHarness.create('/instruments');
    request().flush({ detail: 'private' }, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('private');
    expect(harness.routeNativeElement?.textContent).not.toContain('Keine Instrumente gefunden');
    (harness.routeDebugElement!.componentInstance as Instruments).retry();
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Keine Instrumente gefunden');
  });
  it('does not send malformed URL filters to the API', async () => {
    const harness = await RouterTestingHarness.create('/instruments?type=invalid');
    expect(harness.routeNativeElement?.textContent).toContain('ungültig');
    http.expectNone((r) => r.url === '/api/v1/instruments');
  });
});
