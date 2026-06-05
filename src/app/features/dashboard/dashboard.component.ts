import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DiscordServerControllerService } from '@dungeon-hub/api-client';
import emojies from 'unicode-emoji-json';

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
      <div class="mb-8">
        <h1 class="text-3xl font-bold holographic">
          Dungeon Hub Dashboard
        </h1>
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

      <!-- Your Servers -->
      @if (!loading && !error && guilds.length > 0) {
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Your Servers</h2>
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
                  <div class="flex-1 min-w-0">
                    <h3 class="text-xl font-semibold group-hover:text-blue-400 transition-colors truncate">
                      {{ getDisplayName(guild) }}
                    </h3>
                    <p class="text-gray-400 text-sm truncate">ID: {{ guild.id }}</p>
                  </div>
                </div>
              </a>
            }
          </div>
        </div>
      }

      <!-- Servers Needing Bot Invite -->
      @if (!loading && !error && guildsNeedingInvite.length > 0) {
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Servers Needing Bot Invite</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (guild of guildsNeedingInvite; track guild.id) {
              <div class="card">
                <div class="flex items-center gap-4">
                  <div class="relative w-16 h-16 rounded-full overflow-hidden">
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
                  <div class="flex-1 min-w-0">
                    <h3 class="text-xl font-semibold truncate">
                      {{ getDisplayName(guild) }}
                    </h3>
                    <p class="text-gray-400 text-sm truncate">ID: {{ guild.id }}</p>
                  </div>
                  <a
                    [href]="'https://invite.dungeon-hub.net/&guild_id=' + guild.id"
                    target="_blank"
                    class="btn btn-primary whitespace-nowrap"
                  >
                    Invite
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading && !error && guilds.length === 0 && guildsNeedingInvite.length === 0) {
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
  guildsNeedingInvite: DiscordGuild[] = [];
  userInfo: any;
  loading = true;
  error: string | null = null;

  // Build reverse emoji lookup map (name -> emoji character)
  private emojiNameMap: Map<string, string> = new Map(
    Object.entries(emojies).map(([emoji, data]) => [data.slug, emoji])
  );

  ngOnInit() {
    this.userInfo = this.authService.getUserInfo();
    this.loadGuilds();
  }

  loadGuilds() {
    // Get guilds and permissions from user info (from Keycloak token)
    const claims = this.authService.getUserInfo() ?? {};

    const allGuilds: DiscordGuild[] = claims['discord-guilds']
      || claims['guilds']
      || claims['discord_guilds']
      || [];

    // Get permissions claim and extract server IDs where user has admin permissions
    const permissions: string[] = claims['permissions'] || [];
    const adminServerIds = new Set(
      permissions
        .filter(p => p.startsWith('server_'))
        .map(p => p.substring('server_'.length)) // Remove 'server_' prefix
    );

    // Load servers from API
    this.discordServerService.getAllServers().subscribe({
      next: (servers) => {
        // Handle case where API might return object instead of array
        let serverArray: any[] = [];
        if (Array.isArray(servers)) {
          serverArray = servers;
        } else if (servers && typeof servers === 'object') {
          serverArray = (servers as any).content || (servers as any).data || (servers as any).servers || [];
        }

        // Get server IDs where bot has access
        const serverIds = new Set(serverArray.map((s: any) => s.id?.toString()));

        // Your Servers: Use servers from API and match with guild info
        this.guilds = allGuilds.filter(guild => {
          const guildId = guild.id?.toString();
          return serverIds.has(guildId);
        });

        // Servers Needing Invite: Admin servers where bot doesn't have access
        this.guildsNeedingInvite = allGuilds.filter(guild => {
          const guildId = guild.id?.toString();
          return adminServerIds.has(guildId) && !serverIds.has(guildId);
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.status === 401
          ? 'Unauthorized: Please log out and log in again'
          : `Failed to load servers: ${err.message || err.statusText || 'Unknown error'}`;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getIconUrl(guild: DiscordGuild): string {
    // We're using webp here, since the gif extension doesn't seem to work with some animated server icons
    let extension = guild.icon?.startsWith("a_") ? "webp?animated=true" : "png"

    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}`;
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

  getDisplayName(guild: DiscordGuild): string {
    let displayName = guild.name;

    // Convert emoji shortcodes to Unicode emojis, or remove them if not found
    displayName = displayName.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {

      // Some emojies are named differently on discord... There's no better way other than replacing those.
      if (name === "steam_locomotive") name = "locomotive"
      if (name === "tm") name = "trade_mark"
      if (name === "ear_of_rice") name = "sheaf_of_rice"

      // Try exact match
      const emoji = this.emojiNameMap.get(name) || this.emojiNameMap.get(name.replace(/_/g, '-'));

      if (!emoji) console.log(`emoji ${name} not found, ignoring it.`)

      // Return emoji if found, otherwise remove the shortcode
      return emoji || '☐';
    });

    // Remove Discord custom emoji format <:name:id> or <a:name:id>
    displayName = displayName.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '');

    // Clean up multiple spaces and trim
    displayName = displayName.replace(/\s+/g, ' ').trim();

    return displayName;
  }

  logout() {
    this.authService.logout();
  }
}
