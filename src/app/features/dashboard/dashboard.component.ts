import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DiscordServerControllerService } from '@dungeon-hub/api-client';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Dungeon Hub Dashboard
        </h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-400">{{ userInfo?.email || 'User' }}</span>
          <button (click)="logout()" class="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading) {
        <div class="card text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p class="mt-4 text-gray-400">Loading servers...</p>
        </div>
      }

      <!-- Error State -->
      @if (error && !loading) {
        <div class="card bg-red-900/20 border-red-500 text-center py-12">
          <p class="text-red-400 text-lg font-semibold mb-2">Error</p>
          <p class="text-gray-300">{{ error }}</p>
          <button (click)="logout()" class="btn btn-secondary mt-4">
            Logout and Try Again
          </button>
        </div>
      }

      <!-- Server Grid -->
      @if (!loading && !error) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (guild of guilds; track guild.id) {
            <a
              [routerLink]="['/server', guild.id]"
              class="card hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group"
            >
              <div class="flex items-center gap-4">
                <div class="relative w-16 h-16 rounded-full overflow-hidden group-hover:scale-110 transition-transform">
                  @if (guild.icon) {
                    <img
                      [src]="getIconUrl(guild)"
                      [alt]="guild.name"
                      class="w-full h-full object-cover"
                    />
                  } @else {
                    <div
                      class="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                      [style.background-color]="getGuildColor(guild)"
                    >
                      {{ guild.name[0].toUpperCase() }}
                    </div>
                  }
                </div>
                <div>
                  <h3 class="text-xl font-semibold group-hover:text-blue-400 transition-colors">
                    {{ guild.name }}
                  </h3>
                  <p class="text-gray-400 text-sm">ID: {{ guild.id }}</p>
                </div>
              </div>
            </a>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading && !error && guilds.length === 0) {
        <div class="card text-center py-12">
          <p class="text-gray-400 text-lg">No servers found.</p>
          <p class="text-gray-500 text-sm mt-2">
            Make sure the bot is added to your Discord servers.
          </p>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private discordServerService = inject(DiscordServerControllerService);
  private cdr = inject(ChangeDetectorRef);

  guilds: DiscordGuild[] = [];
  userInfo: any;
  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.userInfo = this.authService.getUserInfo();
    this.loadGuilds();
  }

  loadGuilds() {
    // Get guilds from user info (from Keycloak token)
    const claims = this.authService.getUserInfo();
    console.log('All token claims:', claims);

    const allGuilds: DiscordGuild[] = claims['discord-guilds']
      || claims['guilds']
      || claims['discord_guilds']
      || [];

    console.log('User guilds from token:', allGuilds);

    // Load servers from API to filter
    this.discordServerService.getAllServers().subscribe({
      next: (servers) => {
        console.log('Servers from API:', servers);
        console.log('Type of servers:', typeof servers);
        console.log('Is array?:', Array.isArray(servers));

        // Handle case where API might return object instead of array
        let serverArray: any[] = [];
        if (Array.isArray(servers)) {
          serverArray = servers;
        } else if (servers && typeof servers === 'object') {
          // If it's an object, it might be wrapped
          console.log('Servers is an object, checking properties:', Object.keys(servers));
          serverArray = (servers as any).content || (servers as any).data || (servers as any).servers || [];
        }

        console.log('Server array:', serverArray);
        console.log('First server object:', serverArray[0]);
        console.log('Server object keys:', serverArray[0] ? Object.keys(serverArray[0]) : 'empty');

        // Filter guilds to only show those that exist in both lists
        const serverIds = new Set(serverArray.map((s: any) => s.id?.toString()));
        console.log('Server IDs from API:', Array.from(serverIds));
        console.log('Guild IDs from token:', allGuilds.map(g => g.id));
        console.log('Sample guild ID type:', typeof allGuilds[0]?.id);
        console.log('Sample server ID type:', typeof serverArray[0]?.id);
        console.log('Sample server ID value:', serverArray[0]?.id);

        this.guilds = allGuilds.filter(guild => {
          const guildId = guild.id?.toString();
          const match = serverIds.has(guildId);
          console.log(`Checking guild ${guildId}: ${match}`);
          return match;
        });

        console.log('Filtered guilds:', this.guilds);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load servers:', err);
        this.error = err.status === 401
          ? 'Unauthorized: Please log out and log in again'
          : `Failed to load servers: ${err.message || err.statusText || 'Unknown error'}`;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getIconUrl(guild: DiscordGuild): string {
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
  }

  getGuildColor(guild: DiscordGuild): string {
    // Generate a consistent color based on guild ID
    const colors = [
      '#5865F2', // Discord Blurple
      '#57F287', // Green
      '#FEE75C', // Yellow
      '#EB459E', // Pink
      '#ED4245', // Red
      '#FF6B6B', // Coral
      '#4ECDC4', // Teal
      '#45B7D1', // Sky Blue
      '#96CEB4', // Sage
      '#DDA15E'  // Orange
    ];

    // Use guild ID to pick a consistent color
    const index = parseInt(guild.id.slice(-2), 16) % colors.length;
    return colors[index];
  }

  logout() {
    this.authService.logout();
  }
}
