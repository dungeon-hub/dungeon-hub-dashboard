import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-gray-800 border-b border-gray-700">
      <nav class="container mx-auto px-4">
        <div class="flex justify-between items-center py-3">
          <!-- Logo and Branding -->
          <div class="flex items-center gap-3">
            <a href="https://dashboard.dungeon-hub.net/" class="flex items-center">
              <img
                src="https://static.dungeon-hub.net/favicon.gif"
                alt="Dungeon Hub Logo"
                class="rounded-full w-10 h-10"
              />
            </a>
            <a href="https://dashboard.dungeon-hub.net/" class="text-xl font-bold text-white hover:text-gray-300 transition-colors">
              Dungeon Hub
            </a>
          </div>

          <!-- Navigation Links -->
          <ul class="flex items-center gap-1">
            <li>
              <a
                href="https://invite.dungeon-hub.net/"
                class="px-3 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Invite
              </a>
            </li>
            <li>
              <a
                href="https://discord.dungeon-hub.net/"
                class="px-3 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Discord
              </a>
            </li>
            <li>
              <a
                href="https://docs.dungeon-hub.net/"
                class="px-3 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Documentation
              </a>
            </li>
            <li class="relative">
              <details class="dropdown">
                <summary class="px-3 py-2 text-gray-300 hover:text-white transition-colors cursor-pointer list-none">
                  Account
                </summary>
                <ul class="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                  @if (isAuthenticated) {
                    <li class="px-4 py-2 text-gray-400 text-sm border-b border-gray-700">
                      {{ userEmail }}
                    </li>
                    <li>
                      <button
                        (click)="logout()"
                        class="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        Logout
                      </button>
                    </li>
                  } @else {
                    <li>
                      <a
                        href="/auth/login"
                        class="block px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        Login
                      </a>
                    </li>
                  }
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </nav>
      <hr class="border-gray-700 m-0">
    </header>
  `,
  styles: [`
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
  `]
})
export class HeaderComponent {
  private authService = inject(AuthService);

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get userEmail(): string {
    const userInfo = this.authService.getUserInfo();
    return userInfo?.email || 'User';
  }

  logout(): void {
    this.authService.logout();
  }
}
