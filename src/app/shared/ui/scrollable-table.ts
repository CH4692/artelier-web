import { Directive, ElementRef, inject } from '@angular/core';

/** Consistent horizontal keyboard scrolling, including WebKit's focusable regions. */
@Directive({
  selector: '[appScrollableTable]',
  host: { '(keydown)': 'scroll($event)' },
})
export class ScrollableTable {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  scroll(event: KeyboardEvent) {
    const region = this.element.nativeElement;
    // Links and controls inside a table retain their own keyboard behavior.
    if (event.target !== region || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (region.scrollWidth <= region.clientWidth) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    region.scrollBy({ left: event.key === 'ArrowRight' ? 80 : -80, behavior: 'instant' });
  }
}
