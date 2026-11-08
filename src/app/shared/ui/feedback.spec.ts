import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoadingIndicator } from './loading-indicator';
import { EmptyState } from './empty-state';
import { ErrorMessage } from './error-message';

@Component({
  imports: [LoadingIndicator, EmptyState, ErrorMessage],
  template: `<app-loading-indicator label="Loading instruments" />
    <app-empty-state heading="No instruments yet" description="Add your first instrument.">
      <button type="button">Add instrument</button>
    </app-empty-state>
    <app-error-message message="Please try again."
      ><button type="button">Retry</button></app-error-message
    >`,
})
class FeedbackHost {}

describe('Shared feedback', () => {
  it('provides accessible loading and error announcements and contextual empty-state actions', async () => {
    TestBed.configureTestingModule({ imports: [FeedbackHost] });
    const fixture = TestBed.createComponent(FeedbackHost);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading instruments');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Please try again.');
    expect(element.querySelector('section')?.getAttribute('aria-label')).toBe('No instruments yet');
    expect(element.querySelector('section button')?.textContent).toBe('Add instrument');
    expect(element.querySelector('[role="alert"] button')?.textContent).toBe('Retry');
  });
});
