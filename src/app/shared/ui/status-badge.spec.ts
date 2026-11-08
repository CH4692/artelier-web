import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StatusBadge, StatusTone } from './status-badge';

@Component({
  imports: [StatusBadge],
  template: `<app-status-badge [tone]="tone()">! Needs attention</app-status-badge>`,
})
class Host {
  tone = signal<StatusTone>('error');
}

describe('StatusBadge', () => {
  it('preserves the accessible status label across all semantic tones', async () => {
    const fixture = TestBed.createComponent(Host);
    for (const tone of ['success', 'warning', 'error', 'info'] as const) {
      fixture.componentInstance.tone.set(tone);
      fixture.detectChanges();
      await fixture.whenStable();
      const badge: HTMLElement = fixture.nativeElement.querySelector('.badge');
      expect(badge.dataset['tone']).toBe(tone);
      expect(badge.textContent).toBe('! Needs attention');
    }
  });
});
