import { describe, expect, it } from 'vitest';
import { TicketPanelModel } from '@dungeon-hub/api-client';
import {
  exportTicketPanel,
  hasDuplicatePanelName,
  parseTicketPanelExport,
  toTicketPanelCreation,
} from './ticket-panel-transfer';

function panel(): TicketPanelModel {
  return {
    id: '1',
    name: 'support',
    displayName: 'Support',
    emoji: '🎫',
    discordServer: { id: 'server' } as any,
    closeable: true,
    closeConfirmation: true,
    claimable: true,
    requiresLinking: false,
    closeTranscriptTarget: 'Both',
    deleteTranscriptTarget: 'User',
    ticketMessage: '{"content":"Help"}',
    userTranscriptDm: '["transcript"]',
    formQuestions: [{ id: 'question' } as any],
    supportRoles: [{ id: 'role-1' } as any],
    additionalRoles: [],
    openCategories: ['open'],
    closedCategories: ['closed'],
    permissions: { Everyone: { Denied: '1024' } },
  };
}

describe('ticket panel transfer', () => {
  it('clones all settings without modifying the previous panel', () => {
    const original = panel();
    const snapshot = structuredClone(original);
    const clone = toTicketPanelCreation(original);

    clone.name = 'new-support';
    clone.formQuestions?.push({ id: 'new-question' } as any);
    clone.permissions!['Everyone']['Denied'] = '0';

    expect(original).toEqual(snapshot);
    expect(clone.name).toBe('new-support');
  });

  it('exports and imports a detached panel without modifying the previous panel', () => {
    const original = panel();
    const snapshot = structuredClone(original);
    const imported = parseTicketPanelExport(JSON.stringify(exportTicketPanel(original)));

    imported.name = 'imported-support';
    imported.displayName = 'Imported Support';
    imported.openCategories?.push('another-category');

    expect(original).toEqual(snapshot);
    expect(imported.name).toBe('imported-support');
  });

  it('rejects duplicate internal or display names case-insensitively', () => {
    const panels = [panel()];
    expect(hasDuplicatePanelName(panels, ' SUPPORT ', 'Different')).toBe(true);
    expect(hasDuplicatePanelName(panels, 'different', ' support ')).toBe(true);
    expect(hasDuplicatePanelName(panels, 'different', 'Different')).toBe(false);
  });

  it('rejects unsupported import files', () => {
    expect(() => parseTicketPanelExport('{"version":999,"panel":{"name":"x"}}')).toThrow(
      'not a supported ticket panel export',
    );
  });
});
