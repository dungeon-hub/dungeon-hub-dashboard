import { Injectable, inject } from "@angular/core";
import { Router } from "@angular/router";
import { type OAuthEvent, OAuthService } from "angular-oauth2-oidc";
import { BehaviorSubject } from "rxjs";
import { environment } from "../../../environments/environment";

export interface AuthUserInfo {
	email?: string;
	permissions?: string[];
	"discord-guilds"?: Array<{ id: string; name: string; icon: string | null }>;
	guilds?: Array<{ id: string; name: string; icon: string | null }>;
	discord_guilds?: Array<{ id: string; name: string; icon: string | null }>;
}

@Injectable({
	providedIn: "root",
})
export class AuthService {
	private oauthService = inject(OAuthService);
	private router = inject(Router);
	private readonly debugOAuth = !environment.production;
	private initialized = false;

	private getBrowserOrigin(): string | null {
		if (typeof window === "undefined" || !window.location?.origin) {
			return null;
		}

		return window.location.origin;
	}

	private resolveRedirectUri(configuredRedirectUri: string): string {
		const browserOrigin = this.getBrowserOrigin();
		if (!browserOrigin) {
			return configuredRedirectUri;
		}

		const configuredPath = new URL(configuredRedirectUri).pathname;
		return `${browserOrigin}${configuredPath}`;
	}

	private resolvePostLogoutRedirectUri(
		configuredPostLogoutRedirectUri: string,
	): string {
		const browserOrigin = this.getBrowserOrigin();
		if (!browserOrigin) {
			return configuredPostLogoutRedirectUri;
		}

		const configuredPath = new URL(configuredPostLogoutRedirectUri).pathname;
		return configuredPath && configuredPath !== "/"
			? `${browserOrigin}${configuredPath}`
			: browserOrigin;
	}

	private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
	public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

	constructor() {
		this.oauthService.events.subscribe((e: OAuthEvent) => {
			if (this.debugOAuth) {
				console.log("[OAuth Event]", e.type);
			}

			if (e.type === "token_received") {
				this.isAuthenticatedSubject.next(true);
			}

			if (e.type === "invalid_nonce_in_state") {
				if (this.debugOAuth) {
					console.warn("[OAuth] Invalid nonce - clearing storage");
				}
				this.clearOAuthStorage();
			} else if (
				e.type === "token_expires" ||
				e.type === "session_terminated"
			) {
				if (this.debugOAuth) {
					console.warn("[OAuth] Session expired or terminated");
				}
				this.isAuthenticatedSubject.next(false);
			}
		});
	}

	async initialize(): Promise<void> {
		this.oauthService.configure({
			issuer: environment.keycloak.issuer,
			redirectUri: this.resolveRedirectUri(environment.keycloak.redirectUri),
			clientId: environment.keycloak.clientId,
			responseType: "code",
			scope: environment.keycloak.scope,
			showDebugInformation: this.debugOAuth,
			postLogoutRedirectUri: this.resolvePostLogoutRedirectUri(
				environment.keycloak.postLogoutRedirectUri,
			),
		});

		this.oauthService.setupAutomaticSilentRefresh();

		try {
			await this.oauthService.loadDiscoveryDocumentAndTryLogin();
			await this.refreshAuthenticatedState();

			if (this.debugOAuth && this.oauthService.hasValidAccessToken()) {
				console.log("[OAuth] Initialized successfully");
			}
		} catch (err) {
			if (this.debugOAuth) {
				console.error("[OAuth] Initialization failed:", err);
			}
			this.initialized = false;
			return;
		}

		this.initialized = true;
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
				console.warn("[OAuth] Failed to load user profile after login:", err);
			}
		}

		return true;
	}

	login(returnUrl?: string) {
		if (
			returnUrl &&
			returnUrl !== "/login" &&
			!returnUrl.startsWith("/auth/callback")
		) {
			localStorage.setItem("auth_return_url", returnUrl);
		} else {
			localStorage.removeItem("auth_return_url");
		}
		this.oauthService.initCodeFlow();
	}

	private clearOAuthStorage() {
		this.oauthService.logOut(true);
	}

	logout() {
		this.oauthService.logOut();
		this.isAuthenticatedSubject.next(false);
		this.router.navigate(["/login"]);
	}

	getAccessToken(): string | null {
		return this.oauthService.getAccessToken();
	}

	getIdToken(): string | null {
		return this.oauthService.getIdToken();
	}

	isAuthenticated(): boolean {
		return this.oauthService.hasValidAccessToken();
	}

	getUserInfo(): AuthUserInfo | null {
		return this.oauthService.getIdentityClaims() as AuthUserInfo | null;
	}

	handleAuthCallback() {
		const returnUrl = localStorage.getItem("auth_return_url") || "/dashboard";
		localStorage.removeItem("auth_return_url");
		this.router.navigateByUrl(returnUrl);
	}

	handleExpiredSession() {
		if (this.debugOAuth) {
			console.warn("[OAuth] Handling expired session");
		}
		this.isAuthenticatedSubject.next(false);
		this.clearOAuthStorage();
		this.router.navigate(["/login"]);
	}
}
