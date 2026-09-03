import { provideHttpClient, withInterceptors } from "@angular/common/http";
import {
	type ApplicationConfig,
	inject,
	provideAppInitializer,
	provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter } from "@angular/router";
import { BASE_PATH, Configuration } from "@dungeon-hub/api-client";
import { OAuthStorage, provideOAuthClient } from "angular-oauth2-oidc";
import { environment } from "../environments/environment";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { jsonReviverInterceptor } from "./core/interceptors/json-reviver.interceptor";
import { AuthService } from "./core/services/auth.service";

export function storageFactory(): OAuthStorage {
	return localStorage;
}

function createApiConfiguration(): Configuration {
	const config = new Configuration({ basePath: environment.apiUrl });

	// Override selectHeaderAccept to always prefer JSON
	const originalSelectHeaderAccept = config.selectHeaderAccept.bind(config);
	config.selectHeaderAccept = (accepts: string[]): string | undefined => {
		// If the "accepts" list contains */* or any wildcard, return application/json
		if (accepts.includes("*/*") || accepts.includes("*")) {
			return "application/json";
		}
		// Otherwise use the original logic
		return originalSelectHeaderAccept(accepts);
	};

	return config;
}

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideRouter(routes),
		provideHttpClient(
			withInterceptors([jsonReviverInterceptor, authInterceptor]),
		),
		provideOAuthClient({
			resourceServer: {
				allowedUrls: ["http://localhost:8080", "https://api.dungeon-hub.net"],
				sendAccessToken: true,
			},
		}),
		{ provide: OAuthStorage, useFactory: storageFactory },
		{
			provide: Configuration,
			useFactory: createApiConfiguration,
		},
		{
			provide: BASE_PATH,
			useFactory: (config: Configuration) => config.basePath,
			deps: [Configuration],
		},
		provideAppInitializer(() => {
			const authService = inject(AuthService);
			return authService.initialize();
		}),
	],
};
