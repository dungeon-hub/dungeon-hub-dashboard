import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

// Allowed origins for bearer token attachment
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'https://api.dungeon-hub.net'
];

function isAllowedUrl(url: string): boolean {
  try {
    const requestUrl = new URL(url, window.location.origin);
    const requestOrigin = requestUrl.origin;

    // Check if the request origin matches any allowed origin
    if (ALLOWED_ORIGINS.includes(requestOrigin)) {
      return true;
    }

    // Also check if URL starts with the configured API URL
    return url.startsWith(environment.apiUrl);
  } catch (error) {
    // URL parsing failed, don't attach token
    if (!environment.production) {
      console.warn('[Auth Interceptor] Failed to parse URL:', url);
    }
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauthService = inject(OAuthService);
  const token = oauthService.getAccessToken();

  if (token && isAllowedUrl(req.url)) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};
