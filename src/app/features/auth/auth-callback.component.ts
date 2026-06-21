import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { OAuthService } from 'angular-oauth2-oidc';

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
  private oauthService = inject(OAuthService);

  async ngOnInit() {
    // Load user profile from userinfo endpoint after callback
    if (this.oauthService.hasValidAccessToken()) {
      await this.oauthService.loadUserProfile();
    }
    this.authService.handleAuthCallback();
  }
}
