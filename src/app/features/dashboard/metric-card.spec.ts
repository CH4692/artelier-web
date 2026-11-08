import { TestBed } from '@angular/core/testing';
import { MetricCard } from './metric-card';
import { UI_DE } from '../../shared/i18n/ui.de';
import { MetricState } from './dashboard.service';

describe('MetricCard states', () => {
  function render(state: MetricState) {
    const fixture = TestBed.createComponent(MetricCard);
    fixture.componentRef.setInput('metric', {
      key: 'ready',
      ...UI_DE.dashboard.ready,
      tone: 'success',
    });
    fixture.componentRef.setInput('state', state);
    fixture.detectChanges();
    return fixture;
  }

  it('announces loading without showing a fake number', () => {
    const fixture = render({ status: 'loading' });
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Daten werden geladen.');
    expect(fixture.nativeElement.querySelector('.value')).toBeNull();
  });

  it('distinguishes unavailable integration from an empty result', () => {
    const fixture = render({ status: 'unavailable' });
    expect(fixture.nativeElement.textContent).toContain('Noch nicht verfügbar');
    expect(fixture.nativeElement.textContent).not.toContain(UI_DE.dashboard.ready.empty);
    expect(fixture.nativeElement.querySelector('.value')).toBeNull();
  });

  it('renders zero with the meaningful empty state', () => {
    const fixture = render({ status: 'available', value: 0 });
    expect(fixture.nativeElement.querySelector('.value').textContent).toContain('0');
    expect(fixture.nativeElement.textContent).toContain(UI_DE.dashboard.ready.empty);
  });

  it('formats real numbers in German and associates each metric with its heading', () => {
    const fixture = render({ status: 'available', value: 1234 });
    expect(fixture.nativeElement.querySelector('.value').textContent).toContain('1.234');
    const id = fixture.nativeElement.querySelector('article').getAttribute('aria-labelledby');
    expect(fixture.nativeElement.querySelector(`#${id}`).textContent).toBe('Abholbereit');
    expect(fixture.nativeElement.querySelector('app-status-badge').textContent).toContain(
      'Zur Abholung',
    );
  });

  for (const status of ['loading', 'error', 'unavailable'] as const) {
    it(`labels a previous value as stale in the ${status} state`, () => {
      const fixture = render({ status, previousValue: 0 });
      expect(fixture.nativeElement.querySelector('.value').textContent).toContain('0');
      expect(fixture.nativeElement.textContent).toContain('Letzter Stand');
      expect(fixture.nativeElement.textContent).not.toContain(UI_DE.dashboard.ready.empty);
      expect(fixture.nativeElement.querySelector('app-status-badge')).toBeNull();
    });
  }

  it('uses the singular unit and avoids a misleading pickup badge for an empty result', () => {
    const fixture = render({ status: 'available', value: 1 });
    expect(fixture.nativeElement.querySelector('.value > span').textContent.trim()).toBe('Auftrag');
    fixture.componentRef.setInput('state', { status: 'available', value: 0 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-status-badge')).toBeNull();
  });

  it('provides a keyboard-accessible retry action for errors', () => {
    const fixture = render({ status: 'error' });
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.type).toBe('button');
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('Daten konnten nicht geladen werden.');
  });
});
