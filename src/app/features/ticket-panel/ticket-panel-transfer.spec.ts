import { describe, expect, it } from 'vitest';
import { TicketPanelModel } from '@dungeon-hub/api-client';
import {
  exportTicketPanel,
  findImportConflict,
  hasDuplicatePanelName,
  parseTicketPanelExport,
  toTicketPanelCreation,
  toTicketPanelUpdate,
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

    imported.panel.name = 'imported-support';
    imported.panel.displayName = 'Imported Support';
    imported.panel.openCategories?.push('another-category');

    expect(original).toEqual(snapshot);
    expect(imported.panel.name).toBe('imported-support');
  });

  it('only finds an overwrite conflict when both exported ID and name match', () => {
    const existing = panel();
    expect(findImportConflict([existing], { id: '1', name: 'support' })).toBe(existing);
    expect(findImportConflict([existing], { id: '1', name: 'other' })).toBeUndefined();
    expect(findImportConflict([existing], { id: '1' })).toBeUndefined();
  });

  it('builds a detached overwrite model and resets settings absent from the import', () => {
    const original = panel();
    const imported = toTicketPanelCreation(original);
    delete imported.emoji;
    const update = toTicketPanelUpdate(imported);
    update.permissions!['Everyone']['Denied'] = '0';

    expect(update.resetEmoji).toBe(true);
    expect(original.permissions['Everyone']['Denied']).toBe('1024');
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
