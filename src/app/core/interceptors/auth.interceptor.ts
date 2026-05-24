import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauthService = inject(OAuthService);
  const token = oauthService.getAccessToken();

  if (token && (req.url.includes('api.dungeon-hub.net') || req.url.includes('localhost:8080'))) {
    console.log('Adding auth token to request:', req.url);
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    console.log('No token or not API request:', req.url, 'Has token:', !!token);
  }

  return next(req);
};
