import { TestBed } from '@angular/core/testing';
import { SignatureCapture } from './signature-capture';
import { SignatureDraft } from './signature.models';

describe('Signature capture draft boundary', () => {
  const context = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  let resize: () => void;
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal('devicePixelRatio', 2);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  async function setup() {
    const fixture = TestBed.createComponent(SignatureCapture);
    fixture.componentRef.setInput('inputId', 'unit-signature');
    fixture.componentRef.setInput(
      'alternativeInstructions',
      'Bitte fragen Sie nach einer alternativen Freigabe.',
    );
    fixture.detectChanges();
    const canvas: HTMLCanvasElement = fixture.nativeElement.querySelector('canvas');
    let rect = { left: 20, top: 40, width: 400, height: 200 };
    vi.spyOn(canvas, 'getBoundingClientRect').mockImplementation(() => ({
      ...rect,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }));
    canvas.setPointerCapture = vi.fn();
    canvas.hasPointerCapture = () => true;
    canvas.releasePointerCapture = vi.fn();
    await fixture.whenStable();
    resize();
    return {
      fixture,
      component: fixture.componentInstance,
      canvas,
      setRect: (value: typeof rect) => {
        rect = value;
        resize();
      },
    };
  }
  function pointer(values: Partial<PointerEvent> = {}): PointerEvent {
    return {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 120,
      clientY: 140,
      pressure: 0.5,
      preventDefault: vi.fn(),
      getCoalescedEvents: () => [],
      ...values,
    } as unknown as PointerEvent;
  }
  it('rejects empty confirmation and exposes an accessible alternative', async () => {
    const { fixture, component } = await setup();
    const confirmed = vi.fn(),
      alternative = vi.fn();
    component.confirmed.subscribe(confirmed);
    component.alternativeRequested.subscribe(alternative);
    component.confirm();
    fixture.detectChanges();
    expect(confirmed).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Bitte zeichnen',
    );
    expect(fixture.nativeElement.querySelector('canvas').getAttribute('aria-label')).toBe(
      'Unterschrift zeichnen',
    );
    component.requestAlternative();
    expect(alternative).toHaveBeenCalledOnce();
  });
  it('normalizes coordinates independently of backing pixels, captures the pointer and emits copied local data', async () => {
    const { component, canvas } = await setup();
    const confirmed = vi.fn();
    component.confirmed.subscribe(confirmed);
    component.start(pointer());
    component.move(pointer({ clientX: 220, clientY: 90 }));
    component.finish(pointer({ clientX: 320, clientY: 190 }));
    component.confirm();
    const draft = confirmed.mock.calls[0][0] as SignatureDraft;
    expect(draft.strokes[0]).toEqual([
      { x: 0.25, y: 0.5, pressure: 0.5 },
      { x: 0.5, y: 0.25, pressure: 0.5 },
      { x: 0.75, y: 0.75, pressure: 0.5 },
    ]);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(400);
    expect(context.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1);
    (draft.strokes[0][0] as { x: number }).x = 0.9;
    component.confirm();
    expect(confirmed.mock.calls[1][0].strokes[0][0].x).toBe(0.25);
  });
  it('clears, redraws and invalidates a previously confirmed draft', async () => {
    const { component } = await setup();
    const invalidated = vi.fn();
    component.invalidated.subscribe(invalidated);
    component.start(pointer());
    component.finish(pointer());
    component.confirm();
    component.clear();
    expect(component.hasInk()).toBe(false);
    expect(invalidated).toHaveBeenCalledTimes(2);
    component.confirm();
    expect(component.error()).not.toBe('');
    component.start(pointer({ pointerType: 'pen', pressure: 0.8 }));
    component.finish(pointer({ clientX: 200, pointerType: 'pen', pressure: 0.8 }));
    expect(component.error()).toBe('');
    expect(component.hasInk()).toBe(true);
  });
  it('discards a cancelled in-progress stroke while keeping previous completed strokes', async () => {
    const { component } = await setup();
    const confirmed = vi.fn();
    component.confirmed.subscribe(confirmed);
    component.start(pointer());
    component.finish(pointer());
    component.start(pointer({ pointerId: 2 }));
    component.move(pointer({ pointerId: 2, clientX: 250 }));
    component.cancel(pointer({ pointerId: 2 }));
    component.confirm();
    expect(confirmed.mock.calls[0][0].strokes).toHaveLength(1);
    expect(component.drawing()).toBe(false);
  });
  it('ignores secondary pointers and right clicks and clamps captured strokes inside the surface', async () => {
    const { component } = await setup();
    component.start(pointer({ button: 2 }));
    component.start(pointer({ isPrimary: false }));
    expect(component.hasInk()).toBe(false);
    const confirmed = vi.fn();
    component.confirmed.subscribe(confirmed);
    component.start(pointer());
    component.move(pointer({ pointerId: 99, clientX: 200 }));
    component.finish(pointer({ clientX: 1000, clientY: -100 }));
    component.confirm();
    expect(confirmed.mock.calls[0][0].strokes[0]).toHaveLength(2);
    expect(confirmed.mock.calls[0][0].strokes[0][1]).toMatchObject({ x: 1, y: 0 });
  });
  it('retains normalized strokes on resize and blocks editing or confirmation while disabled', async () => {
    const { component, fixture, setRect, canvas } = await setup();
    const confirmed = vi.fn();
    component.confirmed.subscribe(confirmed);
    component.start(pointer());
    component.finish(pointer({ clientX: 220 }));
    setRect({ left: 10, top: 10, width: 200, height: 100 });
    expect(canvas.width).toBe(400);
    component.confirm();
    expect(confirmed.mock.calls[0][0].strokes[0][0]).toMatchObject({ x: 0.25, y: 0.5 });
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    component.clear();
    component.start(pointer());
    component.confirm();
    expect(confirmed).toHaveBeenCalledOnce();
    expect(component.hasInk()).toBe(true);
  });
});
