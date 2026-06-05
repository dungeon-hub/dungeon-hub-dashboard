import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  {
    path: '',
    canActivate: [() => {
      const authService = inject(AuthService);
      const router = inject(Router);

      if (authService.isAuthenticated()) {
        return router.createUrlTree(['/dashboard']);
      }
      return router.createUrlTree(['/login']);
    }],
    children: []
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./features/auth/auth-callback.component').then(m => m.AuthCallbackComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'server/:serverId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/server/server-detail.component').then(m => m.ServerDetailComponent)
  },
  {
    path: 'server/:serverId/ticket-panel/:panelId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/ticket-panel/ticket-panel-edit.component').then(m => m.TicketPanelEditComponent)
  },
  {
    path: 'server/:serverId/cnt-requests',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cnt-request/cnt-request-list.component').then(m => m.CntRequestListComponent)
  },
  {
    path: 'server/:serverId/cnt-request/:requestId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cnt-request/cnt-request-edit.component').then(m => m.CntRequestEditComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
