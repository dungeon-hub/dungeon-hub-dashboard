import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../../../core/services/auth.service";
import { HeaderComponent } from "./header.component";

describe("HeaderComponent", () => {
	let fixture: ComponentFixture<HeaderComponent>;
	let authService: {
		getUserInfo: ReturnType<typeof vi.fn>;
		isAuthenticated: ReturnType<typeof vi.fn>;
		login: ReturnType<typeof vi.fn>;
		manageAccount: ReturnType<typeof vi.fn>;
		logout: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		authService = {
			getUserInfo: vi.fn(() => ({ email: "hero@dungeon-hub.net" })),
			isAuthenticated: vi.fn(() => true),
			login: vi.fn(),
			manageAccount: vi.fn(),
			logout: vi.fn(),
		};

		await TestBed.configureTestingModule({
			imports: [HeaderComponent],
			providers: [{ provide: AuthService, useValue: authService }],
		}).compileComponents();

		fixture = TestBed.createComponent(HeaderComponent);
		fixture.detectChanges();
	});

	it("starts login for logged-out users from the account menu", () => {
		authService.isAuthenticated.mockReturnValue(false);
		fixture.detectChanges();

		const loginButton: HTMLButtonElement | null =
			fixture.nativeElement.querySelector('button[data-testid="desktop-login"]');

		expect(loginButton).not.toBeNull();
		expect(loginButton?.textContent?.trim()).toBe("Login");
		expect(loginButton?.type).toBe("button");

		loginButton?.click();

		expect(authService.login).toHaveBeenCalledOnce();
	});

	it("starts login and closes the open mobile menu", () => {
		authService.isAuthenticated.mockReturnValue(false);
		fixture.detectChanges();

		const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
			"button[aria-controls='mobile-navigation']",
		);
		menuButton.click();
		fixture.detectChanges();

		const mobileLoginButton: HTMLButtonElement | null =
			fixture.nativeElement.querySelector(
				'#mobile-navigation button[data-testid="mobile-login"]',
			);
		expect(mobileLoginButton).not.toBeNull();

		mobileLoginButton?.click();
		fixture.detectChanges();

		expect(authService.login).toHaveBeenCalledOnce();
		expect(menuButton.getAttribute("aria-expanded")).toBe("false");
		expect(
			fixture.nativeElement
				.querySelector("#mobile-navigation")
				.hasAttribute("hidden"),
		).toBe(true);
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

	it("opens account management from the desktop account menu", () => {
		const manageAccountButton: HTMLButtonElement | null =
			fixture.nativeElement.querySelector(
				'button[data-testid="desktop-manage-account"]',
			);

		expect(manageAccountButton).not.toBeNull();
		expect(manageAccountButton?.textContent?.trim()).toBe("Manage account");

		manageAccountButton?.click();

		expect(authService.manageAccount).toHaveBeenCalledOnce();
	});

	it("opens account management and closes the mobile menu", () => {
		const menuButton: HTMLButtonElement = fixture.nativeElement.querySelector(
			"button[aria-controls='mobile-navigation']",
		);
		menuButton.click();
		fixture.detectChanges();

		const manageAccountButton: HTMLButtonElement | null =
			fixture.nativeElement.querySelector(
				'#mobile-navigation button[data-testid="mobile-manage-account"]',
			);
		expect(manageAccountButton).not.toBeNull();

		manageAccountButton?.click();
		fixture.detectChanges();

		expect(authService.manageAccount).toHaveBeenCalledOnce();
		expect(menuButton.getAttribute("aria-expanded")).toBe("false");
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
		fixture.detectChanges();

		expect(authService.logout).toHaveBeenCalledOnce();
		expect(menuButton.getAttribute("aria-expanded")).toBe("false");
	});
});
