import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Repair, RepairStatus } from './repair.models';
import { REPAIR_STATUSES } from './repair.copy';
import { RepairsService } from './repairs.service';
import { repairError } from './repair-errors';
@Component({
  selector: 'app-repair-status-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './repair-status-editor.html',
  styleUrl: './repairs.scss',
})
export class RepairStatusEditor {
  readonly repair = input.required<Repair>();
  readonly saved = output<Repair>();
  readonly reload = output<void>();
  readonly labels = REPAIR_STATUSES;
  readonly statuses = Object.keys(REPAIR_STATUSES) as RepairStatus[];
  readonly target = new FormControl<RepairStatus | ''>('', {
    nonNullable: true,
    validators: Validators.required,
  });
  readonly form = new FormGroup({ status: this.target });
  readonly pending = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  private readonly service = inject(RepairsService);
  private readonly destroyRef = inject(DestroyRef);
  submit() {
    if (this.pending()) return;
    this.target.markAsTouched();
    const target = this.target.value;
    if (this.target.invalid || !target || !this.statuses.includes(target)) return;
    this.pending.set(true);
    this.error.set('');
    this.success.set('');
    this.service
      .changeStatus(this.repair().id, target)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: (repair) => {
          this.saved.emit(repair);
          this.target.reset('');
          this.success.set('Status gespeichert: ' + this.labels[repair.status] + '.');
        },
        error: (error) => this.error.set(repairError(error)),
      });
  }
}
