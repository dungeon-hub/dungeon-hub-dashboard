import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DiscordGuildService } from '../../core/services/discord-guild.service';

@Component({
  selector: 'app-server-stats',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8">
      <a routerLink="/dashboard" class="btn btn-secondary mb-4 inline-block">
        ← Back to Dashboard
      </a>
      <h2 class="text-3xl font-bold holographic">
        {{ serverName }} Stats
      </h2>
    </div>
  `
})
export class ServerStatsComponent {
  private route = inject(ActivatedRoute);
  private discordGuildService = inject(DiscordGuildService);

  protected readonly serverId = this.route.snapshot.paramMap.get('serverId') ?? '';
  protected readonly serverName = this.discordGuildService.getGuildById(this.serverId)
    ? this.discordGuildService.getDisplayName(this.discordGuildService.getGuildById(this.serverId)!)
    : 'Server';
}
