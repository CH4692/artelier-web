import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { RepairEditor } from './repair-editor';
import { testManagedRepair } from '../../../testing/repairs';
describe('Repair intake and editing', () => {
  let http: HttpTestingController;
  function setup(edit = false) {
    const params = new BehaviorSubject(convertToParamMap(edit ? { id: '20' } : {}));
    TestBed.configureTestingModule({
      imports: [RepairEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { data: { edit }, paramMap: params.value } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(RepairEditor);
    return { fixture, component: fixture.componentInstance, params };
  }
  afterEach(() => http?.verify());
  function fill(component: RepairEditor) {
    component.form.controls.customer_id.setValue(12);
    component.form.controls.instrument_id.setValue(8);
    component.form.controls.work_description.setValue('  Steg anpassen  ');
  }
  it('requires existing references and nonblank description, with Unicode and calendar validation', () => {
    const { component } = setup();
    component.submit();
    http.expectNone('/api/v1/repairs');
    expect(component.form.invalid).toBe(true);
    fill(component);
    expect(component.form.valid).toBe(true);
    component.form.controls.work_description.setValue(' ');
    expect(component.form.invalid).toBe(true);
    component.form.controls.work_description.setValue('😀'.repeat(10000));
    expect(component.form.controls.work_description.valid).toBe(true);
    component.form.controls.work_description.setValue('a'.repeat(10001));
    expect(component.form.controls.work_description.invalid).toBe(true);
    component.form.controls.internal_notes.setValue('a'.repeat(10001));
    expect(component.form.controls.internal_notes.invalid).toBe(true);
    for (const date of ['2026-02-30', '0000-01-01', '2026-13-01']) {
      component.form.controls.expected_completion_date.setValue(date);
      expect(component.form.controls.expected_completion_date.invalid).toBe(true);
    }
    component.form.controls.expected_completion_date.setValue('2028-02-29');
    expect(component.form.controls.expected_completion_date.valid).toBe(true);
  });
  it('clears instrument immediately on customer change and removal', () => {
    const { component } = setup();
    fill(component);
    component.form.controls.customer_id.setValue(13);
    expect(component.form.controls.instrument_id.value).toBeNull();
    expect(component.customerId()).toBe(13);
    component.form.controls.instrument_id.setValue(9);
    component.form.controls.customer_id.setValue(null);
    expect(component.instrumentId()).toBeNull();
    expect(component.form.invalid).toBe(true);
  });
  it('creates once with normalized fields and server-owned status and timestamps omitted', () => {
    const { component } = setup();
    fill(component);
    component.submit();
    component.submit();
    expect(component.pending()).toBe(true);
    const req = http.expectOne('/api/v1/repairs');
    expect(req.request.body).toEqual({
      customer_id: 12,
      instrument_id: 8,
      work_description: 'Steg anpassen',
      expected_completion_date: null,
      internal_notes: null,
    });
    req.flush(testManagedRepair);
    expect(component.pending()).toBe(false);
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/repairs', 20], {
      state: { repairConfirmation: 'created' },
    });
  });
  it('edits only backend-editable fields and explicitly clears nullable date and notes', () => {
    const { component } = setup(true);
    http.expectOne('/api/v1/repairs/20').flush(testManagedRepair);
    expect(component.form.controls.internal_notes.value).toBe('Prüfung der Decke');
    component.form.controls.expected_completion_date.setValue('');
    component.form.controls.internal_notes.setValue('');
    component.submit();
    const req = http.expectOne('/api/v1/repairs/20');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      work_description: testManagedRepair.work_description,
      expected_completion_date: null,
      internal_notes: null,
    });
    req.flush(testManagedRepair);
  });
  it('maps 422 to known fields, preserves unsaved text and permits corrected retry', () => {
    const { component } = setup();
    fill(component);
    component.submit();
    http.expectOne('/api/v1/repairs').flush(
      {
        detail: [
          { loc: ['body', 'work_description'], msg: 'sensitive' },
          { loc: ['body', 'unknown'], msg: 'sensitive' },
        ],
      },
      { status: 422, statusText: 'Invalid' },
    );
    expect(component.form.controls.work_description.value).toBe('  Steg anpassen  ');
    expect(component.fieldError('work_description')).toBe('Bitte prüfen Sie diese Angabe.');
    expect(component.error()).not.toContain('sensitive');
    component.form.controls.work_description.setValue('Neue Arbeit');
    component.submit();
    http.expectOne('/api/v1/repairs').flush(testManagedRepair);
  });
  for (const status of [403, 404, 409, 503])
    it(`retains input after ${status}`, () => {
      const { component } = setup();
      fill(component);
      component.submit();
      http
        .expectOne('/api/v1/repairs')
        .flush({ detail: 'private' }, { status, statusText: 'Failure' });
      expect(component.form.controls.work_description.value).toBe('  Steg anpassen  ');
      expect(component.pending()).toBe(false);
      expect(component.error()).not.toContain('private');
    });
  it('cancels superseded edit reads and never replaces the new record with old data', () => {
    const { component, params } = setup(true);
    const old = http.expectOne('/api/v1/repairs/20');
    params.next(convertToParamMap({ id: '21' }));
    expect(old.cancelled).toBe(true);
    http
      .expectOne('/api/v1/repairs/21')
      .flush({ ...testManagedRepair, id: 21, work_description: 'Neue Arbeit' });
    expect(component.form.controls.work_description.value).toBe('Neue Arbeit');
  });
  it('shows a not-found edit without a request for invalid IDs', () => {
    const { component, params } = setup(true);
    http.expectOne('/api/v1/repairs/20').flush(testManagedRepair);
    params.next(convertToParamMap({ id: 'bad' }));
    expect(component.state()).toMatchObject({ status: 'error', notFound: true });
  });
});
