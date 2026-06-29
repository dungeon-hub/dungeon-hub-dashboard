import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p class="mt-4 text-gray-400">Completing authentication...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  async ngOnInit() {
    try {
      const completedLogin = await this.authService.completeLogin();

      if (completedLogin) {
        this.authService.handleAuthCallback();
      } else {
        this.router.navigate(['/login']);
      }
    } catch (err) {
      console.error('[OAuth] Failed to complete authentication callback:', err);
      this.router.navigate(['/login']);
    }
  }
}
