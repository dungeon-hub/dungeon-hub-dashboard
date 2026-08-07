import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { AuthService } from "../../../core/services/auth.service";

@Component({
	selector: "app-header",
	standalone: true,
	imports: [CommonModule],
	template: `
    <header class="bg-gray-800 border-b border-gray-700">
      <nav class="container mx-auto px-4" aria-label="Main navigation">
        <div class="flex items-center justify-between gap-3 py-3">
          <!-- Logo and Branding -->
          <div class="flex min-w-0 items-center gap-3">
            <a
              href="https://dashboard.dungeon-hub.net/"
              class="flex shrink-0 items-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
              aria-label="Dungeon Hub dashboard home"
            >
              <img
                src="https://static.dungeon-hub.net/favicon.gif"
                alt=""
                aria-hidden="true"
                class="h-10 w-10 rounded-full"
              />
            </a>
            <a
              href="https://dashboard.dungeon-hub.net/"
              class="truncate text-xl font-bold text-white transition-colors hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              Dungeon Hub
            </a>
          </div>

          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md p-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 md:hidden"
            [attr.aria-expanded]="isMobileMenuOpen"
            aria-controls="mobile-navigation"
            [attr.aria-label]="isMobileMenuOpen ? 'Close main menu' : 'Open main menu'"
            (click)="toggleMobileMenu()"
          >
            <svg
              class="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              @if (isMobileMenuOpen) {
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              } @else {
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              }
            </svg>
          </button>

          <!-- Desktop Navigation Links -->
          <ul class="hidden items-center gap-1 md:flex">
            <li><a href="https://invite.dungeon-hub.net/" class="nav-link">Invite</a></li>
            <li><a href="https://discord.dungeon-hub.net/" class="nav-link">Discord</a></li>
            <li><a href="https://docs.dungeon-hub.net/" class="nav-link">Documentation</a></li>
            <li class="relative">
              <details class="dropdown">
                <summary class="nav-link cursor-pointer list-none">Account</summary>
                <ul class="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
                  @if (isAuthenticated) {
                    <li class="border-b border-gray-700 px-4 py-2 text-sm text-gray-400">{{ userEmail }}</li>
                    <li>
                      <button type="button" data-testid="desktop-manage-account" (click)="manageAccount()" class="w-full px-4 py-2 text-left text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none">Manage account</button>
                    </li>
                    <li>
                      <button type="button" (click)="logout()" class="w-full px-4 py-2 text-left text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none">Logout</button>
                    </li>
                  } @else {
                    <li><button type="button" data-testid="desktop-login" (click)="login()" class="w-full px-4 py-2 text-left text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white focus:outline-none">Login</button></li>
                  }
                </ul>
              </details>
            </li>
          </ul>
        </div>

        <!-- Mobile Navigation Links -->
        <div id="mobile-navigation" class="md:hidden" [hidden]="!isMobileMenuOpen">
          <ul class="space-y-1 pb-4" aria-label="Mobile main navigation">
            <li><a href="https://invite.dungeon-hub.net/" class="mobile-nav-link" (click)="closeMobileMenu()">Invite</a></li>
            <li><a href="https://discord.dungeon-hub.net/" class="mobile-nav-link" (click)="closeMobileMenu()">Discord</a></li>
            <li><a href="https://docs.dungeon-hub.net/" class="mobile-nav-link" (click)="closeMobileMenu()">Documentation</a></li>
            @if (isAuthenticated) {
              <li class="px-3 py-2 text-sm text-gray-400">Signed in as {{ userEmail }}</li>
              <li>
                <button type="button" data-testid="mobile-manage-account" class="mobile-nav-link w-full text-left" (click)="manageAccount()">Manage account</button>
              </li>
              <li>
                <button type="button" data-testid="mobile-logout" class="mobile-nav-link w-full text-left" (click)="logout()">Logout</button>
              </li>
            } @else {
              <li><button type="button" data-testid="mobile-login" class="mobile-nav-link w-full text-left" (click)="login()">Login</button></li>
            }
          </ul>
        </div>
      </nav>
      <hr class="m-0 border-gray-700">
    </header>
  `,
	styles: [
		`
    .nav-link {
      @apply rounded-md px-3 py-2 text-gray-300 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800;
    }

    .mobile-nav-link {
      @apply block rounded-md px-3 py-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800;
    }

    details.dropdown summary::-webkit-details-marker {
      display: none;
    }

    details.dropdown summary::marker {
      display: none;
    }

    details.dropdown[open] ul {
      display: block;
    }

    details.dropdown:not([open]) ul {
      display: none;
    }
  `,
	],
})
export class HeaderComponent {
	private authService = inject(AuthService);
	isMobileMenuOpen = false;

	get isAuthenticated(): boolean {
		return this.authService.isAuthenticated();
	}

	get userEmail(): string {
		const userInfo = this.authService.getUserInfo();
		return userInfo?.email || "User";
	}

	toggleMobileMenu(): void {
		this.isMobileMenuOpen = !this.isMobileMenuOpen;
	}

	closeMobileMenu(): void {
		this.isMobileMenuOpen = false;
	}

	login(): void {
		this.closeMobileMenu();
		this.authService.login();
	}

	manageAccount(): void {
		this.closeMobileMenu();
		this.authService.manageAccount();
	}

	logout(): void {
		this.closeMobileMenu();
		this.authService.logout();
	}
}
