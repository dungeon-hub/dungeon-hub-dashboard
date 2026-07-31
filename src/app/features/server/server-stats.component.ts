import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
        {{ serverName() }} Stats
      </h2>
    </div>
  `
})
export class ServerStatsComponent {
  private route = inject(ActivatedRoute);
  private discordGuildService = inject(DiscordGuildService);
  private paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap
  });

  protected readonly serverId = computed(() => this.paramMap().get('serverId') ?? '');
  protected readonly serverName = computed(() => {
    const guild = this.discordGuildService.getGuildById(this.serverId());
    return guild ? this.discordGuildService.getDisplayName(guild) : 'Server';
  });
}
