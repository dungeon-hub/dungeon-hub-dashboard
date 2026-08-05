import { describe, expect, it } from 'vitest';
import { TicketPanelModel } from '@dungeon-hub/api-client';
import {
  exportTicketPanel,
  exportTicketPanels,
  findImportConflict,
  hasDuplicatePanelName,
  isTicketPanelExport,
  parseTicketPanelExport,
  parseTicketPanelExports,
  serializeTicketPanel,
  serializeTicketPanels,
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
    openChannelName: '{panel.name}-{ticket.count}',
    claimedChannelName: 'claimed-{ticket.count}',
    closedChannelName: 'closed-{ticket.count}',
    transcriptChannel: { id: 'transcripts' } as any,
    requiresLinking: false,
    closeTranscriptTarget: 'Both',
    deleteTranscriptTarget: 'User',
    ticketMessage: '{"content":"Help"}',
    userTranscriptDm: '["transcript"]',
    formQuestions: [{ type: 'TextInput', data: '{"label":"Question"}' }],
    relatedCarryTier: { id: 'tier-1' } as any,
    relatedCarryDifficulty: { id: 'difficulty-1' } as any,
    supportRoles: [{ id: 'role-1' } as any],
    additionalRoles: [{ id: 'role-2' } as any],
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

  it('round-trips every transferable ticket panel setting without data loss', () => {
    const original = panel();
    const exported = exportTicketPanel(original);
    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.id).toBe(original.id);
    expect(imported.name).toBe(original.name);
    expect(imported.panel).toEqual({
      name: original.name,
      displayName: original.displayName,
      emoji: original.emoji,
      closeable: original.closeable,
      closeConfirmation: original.closeConfirmation,
      claimable: original.claimable,
      openChannelName: original.openChannelName,
      claimedChannelName: original.claimedChannelName,
      closedChannelName: original.closedChannelName,
      transcriptChannel: original.transcriptChannel?.id,
      ticketMessage: original.ticketMessage,
      requiresLinking: original.requiresLinking,
      closeTranscriptTarget: original.closeTranscriptTarget,
      deleteTranscriptTarget: original.deleteTranscriptTarget,
      userTranscriptDm: original.userTranscriptDm,
      formQuestions: original.formQuestions,
      relatedCarryTier: original.relatedCarryTier?.id,
      relatedCarryDifficulty: original.relatedCarryDifficulty?.id,
      supportRoles: ['role-1'],
      additionalRoles: ['role-2'],
      openCategories: original.openCategories,
      closedCategories: original.closedCategories,
      permissions: original.permissions,
    });
  });

  it('exports all panels as a detached backup without mutating source data', () => {
    const first = panel();
    const second = { ...structuredClone(first), id: '2', name: 'billing', displayName: 'Billing' };
    const source = [first, second];
    const snapshot = structuredClone(source);

    const backup = exportTicketPanels(source);
    backup.panels[0].panel.permissions!['Everyone']['Denied'] = '0';

    expect(backup).toMatchObject({
      version: 1,
      panels: [
        { id: '1', name: 'support', panel: { name: 'support' } },
        { id: '2', name: 'billing', panel: { name: 'billing' } },
      ],
    });
    expect(source).toEqual(snapshot);
  });

  it('parses exported backups and raw arrays as multiple detached imports', () => {
    const first = panel();
    const second = { ...structuredClone(first), id: '2', name: 'billing', displayName: 'Billing' };

    const backupImports = parseTicketPanelExports(serializeTicketPanels([first, second]));
    const arrayImports = parseTicketPanelExports(
      JSON.stringify([exportTicketPanel(first), exportTicketPanel(second)]),
    );
    backupImports[0].panel.permissions!['Everyone']['Denied'] = '0';

    expect(backupImports.map((item) => item.panel.name)).toEqual(['support', 'billing']);
    expect(arrayImports.map((item) => item.id)).toEqual(['1', '2']);
    expect(first.permissions['Everyone']['Denied']).toBe('1024');
  });

  it.each([
    ['empty array', '[]'],
    ['empty backup', JSON.stringify({ version: 1, panels: [] })],
    [
      'wrong backup version',
      JSON.stringify({ version: 999, panels: [exportTicketPanel(panel())] }),
    ],
    ['invalid entry in array', JSON.stringify([exportTicketPanel(panel()), { version: 1 }])],
  ])('rejects invalid multi-panel exports: %s', (_label, contents) => {
    expect(() => parseTicketPanelExports(contents)).toThrow('not a supported ticket panel export');
  });

  it('serializes an all-panel backup as reusable pretty JSON', () => {
    const first = panel();
    const second = { ...structuredClone(first), id: '2', name: 'billing', displayName: 'Billing' };
    const serialized = serializeTicketPanels([first, second]);
    const parsed = JSON.parse(serialized);

    expect(serialized).toContain('"panels": [');
    expect(parsed.panels).toHaveLength(2);
    expect(parseTicketPanelExport(JSON.stringify(parsed.panels[0])).panel.name).toBe('support');
    expect(parseTicketPanelExport(JSON.stringify(parsed.panels[1])).panel.name).toBe('billing');
  });

  it('serializes pretty JSON that can be used by file and clipboard import', () => {
    const serialized = serializeTicketPanel(panel());
    expect(serialized).toContain('\n  "version": 1');
    expect(isTicketPanelExport(serialized)).toBe(true);
    expect(parseTicketPanelExport(serialized).panel.ticketMessage).toBe('{"content":"Help"}');
  });

  it.each([
    '',
    'not JSON',
    '{}',
    '{"version":1}',
    '{"version":1,"panel":{}}',
    '{"version":1,"panel":{"name":"support"}}',
    '{"version":1,"panel":{"name":"   ","closeable":false,"closeConfirmation":false,"claimable":false,"requiresLinking":false}}',
    '{"version":1,"panel":{"name":"support","closeable":false,"closeConfirmation":false,"claimable":false,"requiresLinking":false,"supportRoles":"not-an-array"}}',
    '{"version":1,"panel":{"name":"support","closeable":false,"closeConfirmation":false,"claimable":false,"requiresLinking":false,"permissions":[]}}',
    '{"version":1,"panel":{"name":"support","closeable":false,"closeConfirmation":false,"claimable":false,"requiresLinking":false,"permissions":"invalid"}}',
    '{"version":2,"panel":{"name":"support"}}',
  ])('does not enable clipboard import for invalid data: %s', (contents) => {
    expect(isTicketPanelExport(contents)).toBe(false);
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

  it('preserves every supplied setting when building an overwrite update', () => {
    const creation = toTicketPanelCreation(panel());
    const update = toTicketPanelUpdate(creation);

    expect(update).toMatchObject(creation);
    expect(update.resetDisplayName).toBe(false);
    expect(update.resetEmoji).toBe(false);
    expect(update.resetOpenChannelName).toBe(false);
    expect(update.resetClaimedChannelName).toBe(false);
    expect(update.resetClosedChannelName).toBe(false);
    expect(update.resetTranscriptChannel).toBe(false);
    expect(update.resetTicketMessage).toBe(false);
    expect(update.resetUserTranscriptDm).toBe(false);
    expect(update.resetRelatedCarryTier).toBe(false);
    expect(update.resetRelatedCarryDifficulty).toBe(false);
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

  it('drops unknown imported properties from accepted panel data', () => {
    const exported = exportTicketPanel(panel()) as any;
    exported.panel.unknownSetting = 'must not reach the API';

    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.panel).not.toHaveProperty('unknownSetting');
  });

  it.each([
    ['source id', (data: any) => (data.id = 123)],
    ['source name', (data: any) => (data.name = {})],
    ['mismatched source name', (data: any) => (data.name = 'different-panel')],
    ['display name', (data: any) => (data.panel.displayName = 123)],
    ['emoji', (data: any) => (data.panel.emoji = {})],
    ['transcript target', (data: any) => (data.panel.closeTranscriptTarget = 'Unknown')],
    ['role id', (data: any) => (data.panel.supportRoles = ['valid', 123])],
    ['category id', (data: any) => (data.panel.openCategories = [{}])],
    ['form type', (data: any) => (data.panel.formQuestions = [{ type: 'Unknown', data: '{}' }])],
    ['form data', (data: any) => (data.panel.formQuestions = [{ type: 'TextInput', data: 123 }])],
    ['permission group', (data: any) => (data.panel.permissions = { Everyone: [] })],
    ['permission bit set', (data: any) => (data.panel.permissions = { Everyone: { Denied: 1 } })],
  ])('rejects invalid %s values before they can reach the API', (_field, invalidate) => {
    const exported = exportTicketPanel(panel()) as any;
    invalidate(exported);

    expect(() => parseTicketPanelExport(JSON.stringify(exported))).toThrow(
      'not a supported ticket panel export',
    );
  });

  it('accepts every supported transcript target and form question type', () => {
    const transcriptTargets = ['None', 'User', 'TranscriptChannel', 'Both'];
    const formTypes = ['Predefined', 'TextInput', 'StringSelect', 'TextDisplay'];

    for (const target of transcriptTargets) {
      for (const type of formTypes) {
        const exported = exportTicketPanel(panel()) as any;
        exported.panel.closeTranscriptTarget = target;
        exported.panel.deleteTranscriptTarget = target;
        exported.panel.formQuestions = [{ type, data: '{}' }];
        expect(parseTicketPanelExport(JSON.stringify(exported)).panel).toMatchObject({
          closeTranscriptTarget: target,
          deleteTranscriptTarget: target,
          formQuestions: [{ type, data: '{}' }],
        });
      }
    }
  });
});
