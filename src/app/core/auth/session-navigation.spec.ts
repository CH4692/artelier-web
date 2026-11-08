import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionNavigation } from './session-navigation';

describe('Session navigation', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('coalesces simultaneous forbidden responses until navigation settles', async () => {
    const router = TestBed.inject(Router);
    let finish!: (result: boolean) => void;
    const navigate = vi.spyOn(router, 'navigate').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const navigation = TestBed.inject(SessionNavigation);
    navigation.redirect(403);
    navigation.redirect(403);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/access-denied'], { replaceUrl: true });
    finish(true);
    await Promise.resolve();
  });

  it('retains the workshop URL when redirecting an expired session', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/repairs?filter=open');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    TestBed.inject(SessionNavigation).redirect(401);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      replaceUrl: true,
      queryParams: { returnUrl: '/repairs?filter=open', reason: 'session-expired' },
    });
  });

  it('does not redirect again while already on the target page', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login?returnUrl=%2Frepairs');
    const navigate = vi.spyOn(router, 'navigate');
    TestBed.inject(SessionNavigation).redirect(401);
    expect(navigate).not.toHaveBeenCalled();
  });
});
