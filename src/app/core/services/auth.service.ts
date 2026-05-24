import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { BehaviorSubject, Observable, filter } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private oauthService = inject(OAuthService);
  private router = inject(Router);

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    // Log all OAuth events for debugging
    this.oauthService.events.subscribe((e: OAuthEvent) => {
      console.log('OAuth Event:', e.type, e);

      if (e.type === 'token_received') {
        this.isAuthenticatedSubject.next(true);
      }

      if (e.type === 'invalid_nonce_in_state') {
        console.error('Invalid nonce - clearing storage and retrying');
        sessionStorage.clear();
      }
    });
  }

  async initialize(): Promise<void> {
    this.oauthService.configure({
      issuer: environment.keycloak.issuer,
      redirectUri: environment.keycloak.redirectUri,
      clientId: environment.keycloak.clientId,
      responseType: 'code',
      scope: environment.keycloak.scope,
      showDebugInformation: true,
      postLogoutRedirectUri: environment.keycloak.postLogoutRedirectUri
    });

    this.oauthService.setStorage(sessionStorage);
    this.oauthService.setupAutomaticSilentRefresh();

    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      console.log('OAuth initialized', {
        hasValidToken: this.oauthService.hasValidAccessToken(),
        state: this.oauthService.state
      });

      if (this.oauthService.hasValidAccessToken()) {
        // Load user profile from userinfo endpoint
        await this.oauthService.loadUserProfile();
        console.log('User profile loaded:', this.oauthService.getIdentityClaims());
        this.isAuthenticatedSubject.next(true);
      }
    } catch (err) {
      console.error('OAuth discovery failed:', err);
    }
  }

  login(returnUrl?: string) {
    if (returnUrl) {
      sessionStorage.setItem('auth_return_url', returnUrl);
    }
    this.oauthService.initCodeFlow();
  }

  logout() {
    this.oauthService.logOut();
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.oauthService.getAccessToken();
  }

  isAuthenticated(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  getUserInfo(): any {
    const claims = this.oauthService.getIdentityClaims();
    console.log('User claims:', claims);
    return claims;
  }

  handleAuthCallback() {
    const returnUrl = sessionStorage.getItem('auth_return_url') || '/dashboard';
    sessionStorage.removeItem('auth_return_url');
    this.router.navigate([returnUrl]);
  }
}
