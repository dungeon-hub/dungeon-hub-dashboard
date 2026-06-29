import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private oauthService = inject(OAuthService);
  private router = inject(Router);
  private readonly debugOAuth = !environment.production;
  private initialized = false;

  private getBrowserOrigin(): string | null {
    if (typeof window === 'undefined' || !window.location?.origin) {
      return null;
    }

    return window.location.origin;
  }

  private resolveRedirectUri(configuredRedirectUri: string): string {
    const browserOrigin = this.getBrowserOrigin();
    if (!browserOrigin) {
      return configuredRedirectUri;
    }

    return `${browserOrigin}/auth/callback`;
  }

  private resolvePostLogoutRedirectUri(configuredPostLogoutRedirectUri: string): string {
    return this.getBrowserOrigin() || configuredPostLogoutRedirectUri;
  }

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.oauthService.events.subscribe((e: OAuthEvent) => {
      if (this.debugOAuth) {
        console.log('[OAuth Event]', e.type);
      }

      if (e.type === 'token_received') {
        this.isAuthenticatedSubject.next(true);
      }

      if (e.type === 'invalid_nonce_in_state') {
        if (this.debugOAuth) {
          console.warn('[OAuth] Invalid nonce - clearing storage');
        }
        sessionStorage.clear();
      }
    });
  }

  async initialize(): Promise<void> {
    this.oauthService.configure({
      issuer: environment.keycloak.issuer,
      redirectUri: this.resolveRedirectUri(environment.keycloak.redirectUri),
      clientId: environment.keycloak.clientId,
      responseType: 'code',
      scope: environment.keycloak.scope,
      showDebugInformation: this.debugOAuth,
      postLogoutRedirectUri: this.resolvePostLogoutRedirectUri(environment.keycloak.postLogoutRedirectUri)
    });

    this.oauthService.setStorage(sessionStorage);
    this.oauthService.setupAutomaticSilentRefresh();

    try {
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      await this.refreshAuthenticatedState();

      if (this.debugOAuth && this.oauthService.hasValidAccessToken()) {
        console.log('[OAuth] Initialized successfully');
      }
    } catch (err) {
      if (this.debugOAuth) {
        console.error('[OAuth] Initialization failed:', err);
      }
    } finally {
      this.initialized = true;
    }
  }

  async completeLogin(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    } else if (!this.oauthService.hasValidAccessToken()) {
      await this.oauthService.tryLoginCodeFlow();
    }

    return this.refreshAuthenticatedState();
  }

  private async refreshAuthenticatedState(): Promise<boolean> {
    const hasValidToken = this.oauthService.hasValidAccessToken();
    this.isAuthenticatedSubject.next(hasValidToken);

    if (!hasValidToken) {
      return false;
    }

    try {
      await this.oauthService.loadUserProfile();
    } catch (err) {
      if (this.debugOAuth) {
        console.warn('[OAuth] Failed to load user profile after login:', err);
      }
    }

    return true;
  }

  login(returnUrl?: string) {
    if (returnUrl && returnUrl !== '/login' && !returnUrl.startsWith('/auth/callback')) {
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
    return this.oauthService.getIdentityClaims();
  }

  handleAuthCallback() {
    const returnUrl = sessionStorage.getItem('auth_return_url') || '/dashboard';
    sessionStorage.removeItem('auth_return_url');
    this.router.navigateByUrl(returnUrl);
  }
}
