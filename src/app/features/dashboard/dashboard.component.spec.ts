import { describe, expect, it } from 'vitest';
import { DiscordGuild } from '../../core/services/discord-guild.service';
import { categorizeGuilds } from './dashboard.component';

describe('categorizeGuilds', () => {
  it('separates editable, inviteable, and view-only guilds', () => {
    const guilds: DiscordGuild[] = [
      { id: 'editable', name: 'Editable', icon: null },
      { id: 'invite', name: 'Invite', icon: null },
      { id: 'view', name: 'View', icon: null },
      { id: 'unavailable', name: 'Unavailable', icon: null }
    ];

    const result = categorizeGuilds(
      guilds,
      new Set(['editable', 'invite']),
      new Set(['editable', 'view'])
    );

    expect(result.editable.map(guild => guild.id)).toEqual(['editable']);
    expect(result.needingInvite.map(guild => guild.id)).toEqual(['invite']);
    expect(result.viewOnly.map(guild => guild.id)).toEqual(['view']);
  });
});
