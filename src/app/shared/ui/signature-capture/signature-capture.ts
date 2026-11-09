import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { SignatureDraft, SignaturePoint } from './signature.models';

/** Capture a local drawing only. Consumers own authorization, format adaptation and persistence. */
@Component({
  selector: 'app-signature-capture',
  templateUrl: './signature-capture.html',
  styleUrl: './signature-capture.scss',
})
export class SignatureCapture {
  readonly inputId = input.required<string>();
  readonly label = input('Unterschrift zeichnen');
  readonly alternativeInstructions = input.required<string>();
  readonly disabled = input(false);
  readonly confirmed = output<SignatureDraft>();
  readonly invalidated = output<void>();
  readonly alternativeRequested = output<void>();
  readonly hasInk = signal(false);
  readonly drawing = signal(false);
  readonly error = signal('');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private strokes: SignaturePoint[][] = [];
  private activePointer: number | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    effect(() => {
      if (this.disabled() && this.activePointer !== null) this.cancel();
    });
    afterNextRender(() => {
      const canvas = this.canvas().nativeElement;
      this.context = canvas.getContext('2d');
      if (!this.context) {
        this.error.set(
          'Die Zeichenfläche ist in diesem Browser nicht verfügbar. Bitte nutzen Sie die alternative Möglichkeit.',
        );
        return;
      }
      const resize = () => this.redraw();
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
      observer?.observe(canvas);
      window.addEventListener('resize', resize);
      this.redraw();
      this.destroyRef.onDestroy(() => {
        observer?.disconnect();
        window.removeEventListener('resize', resize);
        this.strokes = [];
        this.context = null;
      });
    });
  }
  start(event: PointerEvent) {
    if (
      this.disabled() ||
      !this.context ||
      !event.isPrimary ||
      event.button !== 0 ||
      this.activePointer !== null
    )
      return;
    event.preventDefault();
    const canvas = this.canvas().nativeElement;
    canvas.setPointerCapture(event.pointerId);
    this.activePointer = event.pointerId;
    this.drawing.set(true);
    this.error.set('');
    this.invalidated.emit();
    const point = this.point(event);
    this.strokes.push([point]);
    this.hasInk.set(true);
    this.paintDot(point);
  }
  move(event: PointerEvent) {
    if (event.pointerId !== this.activePointer || this.disabled()) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) this.append(sample);
  }
  finish(event: PointerEvent) {
    if (event.pointerId !== this.activePointer) return;
    this.append(event);
    this.release();
  }
  cancel(event?: PointerEvent) {
    if (this.activePointer === null || (event && event.pointerId !== this.activePointer)) return;
    this.strokes.pop();
    this.release();
    this.hasInk.set(this.strokes.length > 0);
    this.redraw();
  }
  clear() {
    if (this.disabled()) return;
    this.release();
    this.strokes = [];
    this.hasInk.set(false);
    this.error.set('');
    this.invalidated.emit();
    this.redraw();
  }
  confirm() {
    if (this.disabled() || this.drawing()) return;
    if (!this.hasInk()) {
      this.error.set(
        'Bitte zeichnen Sie zuerst eine Unterschrift oder nutzen Sie die alternative Möglichkeit.',
      );
      return;
    }
    this.error.set('');
    this.confirmed.emit({
      strokes: this.strokes.map((stroke) => stroke.map((point) => ({ ...point }))),
    });
  }
  requestAlternative() {
    if (!this.disabled()) this.alternativeRequested.emit();
  }
  private release() {
    const id = this.activePointer;
    this.activePointer = null;
    this.drawing.set(false);
    if (id !== null) {
      const canvas = this.canvas().nativeElement;
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
  }
  private point(event: PointerEvent): SignaturePoint {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height))),
      pressure: event.pressure > 0 ? Math.min(1, event.pressure) : 0.5,
    };
  }
  private append(event: PointerEvent) {
    const stroke = this.strokes.at(-1);
    if (!stroke) return;
    const point = this.point(event);
    const previous = stroke.at(-1)!;
    if (previous.x === point.x && previous.y === point.y) return;
    stroke.push(point);
    this.paintLine(previous, point);
  }
  private paintDot(point: SignaturePoint) {
    const ctx = this.context;
    if (!ctx) return;
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    ctx.beginPath();
    ctx.arc(point.x * rect.width, point.y * rect.height, 1.25, 0, 2 * Math.PI);
    ctx.fill();
  }
  private paintLine(from: SignaturePoint, to: SignaturePoint) {
    const ctx = this.context;
    if (!ctx) return;
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    ctx.lineWidth = 1.5 + to.pressure * 2;
    ctx.beginPath();
    ctx.moveTo(from.x * rect.width, from.y * rect.height);
    ctx.lineTo(to.x * rect.width, to.y * rect.height);
    ctx.stroke();
  }
  private redraw() {
    const canvas = this.canvas().nativeElement;
    const ctx = this.context;
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = getComputedStyle(canvas).color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of this.strokes) {
      if (stroke[0]) this.paintDot(stroke[0]);
      for (let index = 1; index < stroke.length; index++)
        this.paintLine(stroke[index - 1], stroke[index]);
    }
  }
}
