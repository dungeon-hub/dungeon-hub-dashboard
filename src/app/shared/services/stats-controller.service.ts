import { InjectionToken, Injector, inject } from '@angular/core';
import * as ApiClient from '@dungeon-hub/api-client';
import { Observable } from 'rxjs';

export interface StatsControllerServiceLike {
  getGlobalStats(): Observable<unknown>;
  getServerStats(server: string, user?: string): Observable<unknown>;
}

export const STATS_CONTROLLER_SERVICE = new InjectionToken<StatsControllerServiceLike>(
  'StatsControllerService',
);

export function injectStatsControllerService(): StatsControllerServiceLike | null {
  const override = inject(STATS_CONTROLLER_SERVICE, { optional: true });
  if (override) return override;

  const statsControllerService = (ApiClient as Record<string, unknown>)['StatsControllerService'];
  if (!statsControllerService) return null;

  return inject(Injector).get(statsControllerService as never) as StatsControllerServiceLike;
}
