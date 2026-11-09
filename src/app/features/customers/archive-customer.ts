import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Customer } from './customer.models';
import { CustomersService } from './customers.service';
import { customerError } from './customer-errors';

@Component({
  selector: 'app-archive-customer',
  template: `
    <button #trigger type="button" (click)="open()">Kunde archivieren</button>
    <dialog
      #dialog
      aria-labelledby="archive-title"
      aria-describedby="archive-description"
      (cancel)="onCancel($event)"
    >
      <div class="dialog-body">
        <h2 id="archive-title">Kunde archivieren?</h2>
        <p id="archive-description">
          {{ customer().first_name }} {{ customer().last_name }} wird aus der aktiven Kundenliste
          ausgeblendet. Daten und zugeordnete Instrumente bleiben erhalten.
        </p>
        @if (error()) {
          <p class="field-error" role="alert">{{ error() }}</p>
        }
      </div>
      <div class="actions">
        <button type="button" (click)="close()" [disabled]="pending()" autofocus>Abbrechen</button>
        <button
          type="button"
          (click)="confirm()"
          [disabled]="pending()"
          [attr.aria-busy]="pending()"
        >
          {{ pending() ? 'Wird archiviert…' : 'Archivieren bestätigen' }}
        </button>
      </div>
    </dialog>
  `,
  styles: `
    dialog[open] {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .dialog-body {
      min-height: 0;
      overflow: auto;
      overflow-wrap: anywhere;
      overscroll-behavior: contain;
      padding: var(--space-1);
    }
    .actions {
      flex-shrink: 0;
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-top: var(--space-5);
    }
  `,
})
export class ArchiveCustomer {
  readonly customer = input.required<Customer>();
  readonly archived = output<Customer>();
  readonly pending = signal(false);
  readonly error = signal('');
  private readonly service = inject(CustomersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  open() {
    this.error.set('');
    this.dialog().nativeElement.showModal();
  }
  close() {
    if (!this.pending()) {
      this.dialog().nativeElement.close();
      this.trigger().nativeElement.focus();
    }
  }
  onCancel(event: Event) {
    event.preventDefault();
    this.close();
  }
  confirm() {
    if (this.pending() || !this.dialog().nativeElement.open) return;
    this.pending.set(true);
    this.error.set('');
    this.service
      .archive(this.customer().id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: (customer) => {
          this.dialog().nativeElement.close();
          this.trigger().nativeElement.focus();
          this.archived.emit(customer);
        },
        error: (error) => this.error.set(customerError(error)),
      });
  }
}
