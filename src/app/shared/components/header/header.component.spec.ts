import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../../../core/services/auth.service";
import { HeaderComponent } from "./header.component";

describe("HeaderComponent", () => {
	let fixture: ComponentFixture<HeaderComponent>;
	let authService: {
		getUserInfo: ReturnType<typeof vi.fn>;
		isAuthenticated: ReturnType<typeof vi.fn>;
		logout: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		authService = {
			getUserInfo: vi.fn(() => ({ email: "hero@dungeon-hub.net" })),
			isAuthenticated: vi.fn(() => true),
			logout: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [HeaderComponent],
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: authService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(HeaderComponent);
		fixture.detectChanges();
	});

	it("routes logged-out users to the login page from the account menu", () => {
		authService.isAuthenticated.mockReturnValue(false);
		fixture.detectChanges();

		const loginLink: HTMLAnchorElement | null =
			fixture.nativeElement.querySelector('a[routerLink="/login"]');

		expect(loginLink).not.toBeNull();
		expect(loginLink?.textContent?.trim()).toBe("Login");
		expect(loginLink?.getAttribute("href")).toBe("/login");
	});

	it("exposes a deterministic mobile menu toggle with accessible state", () => {
		const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
			"button[aria-controls='mobile-navigation']",
		);
		const mobileNavigation: HTMLElement =
			fixture.nativeElement.querySelector("#mobile-navigation");

		expect(menuButton).toBeTruthy();
		expect(menuButton.getAttribute("aria-label")).toBe("Open main menu");
		expect(menuButton.getAttribute("aria-expanded")).toBe("false");
		expect(mobileNavigation.hasAttribute("hidden")).toBe(true);

		menuButton.click();
		fixture.detectChanges();

		expect(menuButton.getAttribute("aria-label")).toBe("Close main menu");
		expect(menuButton.getAttribute("aria-expanded")).toBe("true");
		expect(mobileNavigation.hasAttribute("hidden")).toBe(false);
	});

	it("makes logout reachable from the mobile menu", () => {
		const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
			"button[aria-controls='mobile-navigation']",
		);

		menuButton.click();
		fixture.detectChanges();

		const mobileLogoutButton: HTMLButtonElement =
			fixture.nativeElement.querySelector(
				"#mobile-navigation button[data-testid='mobile-logout']",
			);

		expect(mobileLogoutButton).toBeTruthy();
		expect(mobileLogoutButton.textContent).toContain("Logout");

		mobileLogoutButton.click();

		expect(authService.logout).toHaveBeenCalledOnce();
	});
});
