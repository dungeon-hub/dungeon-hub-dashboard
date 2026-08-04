import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StatsControllerService } from '@dungeon-hub/api-client';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('shows global stats to unauthenticated users', async () => {
    const getGlobalStats = vi.fn().mockReturnValue(of({ linkedUsers: '321' }));
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => false, login: vi.fn() },
        },
        { provide: StatsControllerService, useValue: { getGlobalStats } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    expect(getGlobalStats).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Login with Discord');
    expect(fixture.nativeElement.textContent).toContain('Global Stats');
    expect(fixture.nativeElement.textContent).toContain('321');
  });
});
