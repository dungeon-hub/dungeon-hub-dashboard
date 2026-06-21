import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="mt-auto bg-gray-800 border-t border-gray-700 py-3 px-4">
      <div class="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
        <small class="text-gray-400">© 2026. All rights reserved.</small>
        <div class="flex flex-wrap justify-center gap-4">
          <a
            href="https://dungeon-hub.net/terms-of-service"
            class="text-gray-400 hover:text-white underline transition-colors text-sm"
          >
            Terms
          </a>
          <a
            href="https://dungeon-hub.net/cookies"
            class="text-gray-400 hover:text-white underline transition-colors text-sm"
          >
            Cookies
          </a>
          <a
            href="https://dungeon-hub.net/privacy"
            class="text-gray-400 hover:text-white underline transition-colors text-sm"
          >
            Privacy and Legal Notice
          </a>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {}
