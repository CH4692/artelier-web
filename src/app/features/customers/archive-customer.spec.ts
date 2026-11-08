import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ArchiveCustomer } from './archive-customer';
import { testCustomer } from '../../../testing/customers';

describe('Archive confirmation', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ArchiveCustomer],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function setup() {
    const fixture = TestBed.createComponent(ArchiveCustomer);
    fixture.componentRef.setInput('customer', testCustomer);
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    dialog.showModal = () => {
      dialog.open = true;
    };
    dialog.close = () => {
      dialog.open = false;
    };
    const changed = vi.fn();
    fixture.componentInstance.archived.subscribe(changed);
    return { fixture, component: fixture.componentInstance, dialog, changed };
  }

  it('requires an open confirmation dialog and allows cancellation without an API mutation', () => {
    const { component, dialog, changed } = setup();
    component.confirm();
    http.expectNone('/api/v1/customers/12/archive');
    component.open();
    expect(dialog.open).toBe(true);
    component.close();
    expect(dialog.open).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    http.expectNone('/api/v1/customers/12/archive');
  });

  it('blocks duplicate confirmation and escape during the request, then emits only the server response', async () => {
    const { fixture, component, dialog, changed } = setup();
    component.open();
    component.confirm();
    component.confirm();
    const escape = new Event('cancel', { cancelable: true });
    component.onCancel(escape);
    expect(escape.defaultPrevented).toBe(true);
    component.close();
    expect(dialog.open).toBe(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('dialog button').disabled).toBe(true);
    const request = http.expectOne('/api/v1/customers/12/archive');
    expect(request.request.method).toBe('PATCH');
    expect(changed).not.toHaveBeenCalled();
    request.flush({ ...testCustomer, is_archived: true });
    expect(changed).toHaveBeenCalledExactlyOnceWith({ ...testCustomer, is_archived: true });
    expect(dialog.open).toBe(false);
  });

  it('leaves the record unchanged and keeps confirmation open on failed archive', async () => {
    const { fixture, component, dialog, changed } = setup();
    component.open();
    component.confirm();
    http
      .expectOne('/api/v1/customers/12/archive')
      .flush({ detail: 'private data' }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(changed).not.toHaveBeenCalled();
    expect(component.customer().is_archived).toBe(false);
    expect(dialog.open).toBe(true);
    expect(component.pending()).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('private');
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Konflikt');
    component.confirm();
    http.expectOne('/api/v1/customers/12/archive').flush({ ...testCustomer, is_archived: true });
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
