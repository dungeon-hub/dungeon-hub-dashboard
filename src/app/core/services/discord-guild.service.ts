import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import emojies from 'unicode-emoji-json';

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class DiscordGuildService {
  private authService = inject(AuthService);

  // Build reverse emoji lookup map (name -> emoji character)
  private emojiNameMap: Map<string, string> = new Map(
    Object.entries(emojies).map(([emoji, data]) => [data.slug, emoji])
  );

  /**
   * Get all guilds from the authenticated user's token claims
   */
  getAllGuilds(): DiscordGuild[] {
    const claims = this.authService.getUserInfo() ?? {};
    return claims['discord-guilds']
      || claims['guilds']
      || claims['discord_guilds']
      || [];
  }

  /**
   * Get a specific guild by ID
   */
  getGuildById(guildId: string): DiscordGuild | undefined {
    return this.getAllGuilds().find(guild => guild.id === guildId);
  }

  /**
   * Get the display name for a guild (with emoji parsing)
   */
  getDisplayName(guild: DiscordGuild | string): string {
    const guildName = typeof guild === 'string' ? guild : guild.name;
    let displayName = guildName;

    // Remove Discord custom emoji format <:name:id> or <a:name:id>
    displayName = displayName.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, '');

    // Convert emoji shortcodes to Unicode emojis, or remove them if not found
    displayName = displayName.replace(/:([a-zA-Z0-9_+-]+):/g, (match, name) => {
      // Some emojies are named differently on discord... There's no better way other than replacing those.
      if (name === "steam_locomotive") name = "locomotive"
      if (name === "tm") name = "trade_mark"
      if (name === "ear_of_rice") name = "sheaf_of_rice"

      // Try exact match
      const emoji = this.emojiNameMap.get(name) || this.emojiNameMap.get(name.replace(/_/g, '-'));

      if (!emoji) console.log(`emoji ${name} not found, ignoring it.`)

      // Return emoji if found, otherwise return placeholder
      return emoji || '☐';
    });

    // Clean up multiple spaces and trim
    displayName = displayName.replace(/\s+/g, ' ').trim();

    return displayName;
  }

  /**
   * Get the icon URL for a guild
   */
  getIconUrl(guild: DiscordGuild): string {
    // We're using webp here, since the gif extension doesn't seem to work with some animated server icons
    let extension = guild.icon?.startsWith("a_") ? "webp?animated=true" : "png"
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}`;
  }

  /**
   * Get a consistent color for a guild based on its ID
   */
  getGuildColor(guild: DiscordGuild): string {
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
}
