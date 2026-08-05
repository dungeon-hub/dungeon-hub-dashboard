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
      transcriptChannel: undefined,
      ticketMessage: original.ticketMessage,
      requiresLinking: original.requiresLinking,
      closeTranscriptTarget: original.closeTranscriptTarget,
      deleteTranscriptTarget: original.deleteTranscriptTarget,
      userTranscriptDm: original.userTranscriptDm,
      formQuestions: original.formQuestions,
      relatedCarryTier: undefined,
      relatedCarryDifficulty: undefined,
      supportRoles: undefined,
      additionalRoles: undefined,
      openCategories: undefined,
      closedCategories: undefined,
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

  it('finds an overwrite conflict by exact ID and name or by an existing name', () => {
    const existing = panel();
    expect(findImportConflict([existing], { id: '1', name: 'support' })).toBe(existing);
    expect(findImportConflict([existing], { id: '4', name: 'support' })).toBe(existing);
    expect(findImportConflict([existing], { name: 'support' })).toBe(existing);
    expect(findImportConflict([existing], { name: ' SUPPORT ' })).toBe(existing);
    expect(findImportConflict([existing], { id: '1', name: 'other' })).toBeUndefined();
    expect(findImportConflict([existing], { id: '1' })).toBeUndefined();
  });

  it('uses the required panel name for imports when legacy metadata omits the name', () => {
    const exported = exportTicketPanel(panel()) as any;
    delete exported.name;

    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.name).toBe('support');
    expect(findImportConflict([panel()], imported)).toEqual(panel());
  });

  it('accepts legacy top-level names that differ only by case or surrounding whitespace', () => {
    const exported = exportTicketPanel(panel()) as any;
    exported.name = ' SUPPORT ';

    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.name).toBe('support');
    expect(findImportConflict([panel()], imported)).toEqual(panel());
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

  it('accepts legacy exports with numeric ids, numeric relations, and numeric permission bits', () => {
    const legacyExport = {
      version: 1,
      id: 4,
      name: 'f4',
      panel: {
        name: 'f4',
        displayName: 'Floor 4: Thorn',
        emoji: '<:thorn:792055545204310046>',
        closeable: true,
        closeConfirmation: true,
        claimable: true,
        openChannelName: 'f4-{user.displayName}-{ticket.id}',
        transcriptChannel: '1036375112619937792',
        ticketMessage: '{"content":"ticket"}',
        requiresLinking: true,
        closeTranscriptTarget: 'User',
        deleteTranscriptTarget: 'TranscriptChannel',
        formQuestions: [
          { type: 'Predefined', data: '"carry-difficulty"' },
          { type: 'Predefined', data: '"carry-amount"' },
        ],
        relatedCarryTier: 28,
        supportRoles: ['1061116185132933240'],
        additionalRoles: ['1036373005720358972'],
        openCategories: ['1026291896336793631'],
        closedCategories: [],
        permissions: {
          Everyone: { Denied: 1024 },
          TicketCreator: { Allowed: 68608 },
        },
      },
    };

    const imported = parseTicketPanelExport(JSON.stringify(legacyExport));

    expect(imported.id).toBe('4');
    expect(imported.panel.name).toBe('f4');
    expect(imported.panel.relatedCarryTier).toBeUndefined();
    expect(imported.panel.supportRoles).toBeUndefined();
    expect(imported.panel.permissions).toEqual({
      Everyone: { Denied: '1024' },
      TicketCreator: { Allowed: '68608' },
    });
    expect(isTicketPanelExport(JSON.stringify(legacyExport))).toBe(true);
  });

  it('rejects unsupported import files', () => {
    expect(() => parseTicketPanelExport('{"version":999,"panel":{"name":"x"}}')).toThrow(
      'not a supported ticket panel export',
    );
  });

  it('ignores server-specific references when parsing an imported panel', () => {
    const exported = exportTicketPanel(panel());

    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.panel.transcriptChannel).toBeUndefined();
    expect(imported.panel.relatedCarryTier).toBeUndefined();
    expect(imported.panel.relatedCarryDifficulty).toBeUndefined();
    expect(imported.panel.supportRoles).toBeUndefined();
    expect(imported.panel.additionalRoles).toBeUndefined();
    expect(imported.panel.openCategories).toBeUndefined();
    expect(imported.panel.closedCategories).toBeUndefined();
  });

  it('accepts null optional strings from exported API data and omits them before API use', () => {
    const exported = exportTicketPanel(panel()) as any;
    exported.panel.displayName = null;
    exported.panel.emoji = null;
    exported.panel.openChannelName = null;
    exported.panel.claimedChannelName = null;
    exported.panel.closedChannelName = null;
    exported.panel.ticketMessage = null;
    exported.panel.closeTranscriptTarget = null;
    exported.panel.deleteTranscriptTarget = null;
    exported.panel.userTranscriptDm = null;

    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.panel.displayName).toBeUndefined();
    expect(imported.panel.emoji).toBeUndefined();
    expect(imported.panel.openChannelName).toBeUndefined();
    expect(imported.panel.claimedChannelName).toBeUndefined();
    expect(imported.panel.closedChannelName).toBeUndefined();
    expect(imported.panel.ticketMessage).toBeUndefined();
    expect(imported.panel.closeTranscriptTarget).toBeUndefined();
    expect(imported.panel.deleteTranscriptTarget).toBeUndefined();
    expect(imported.panel.userTranscriptDm).toBeUndefined();
  });

  it('normalizes accepted null collection values to undefined before API use', () => {
    const exported = exportTicketPanel(panel()) as any;
    exported.panel.formQuestions = null;
    exported.panel.supportRoles = null;
    exported.panel.additionalRoles = null;
    exported.panel.openCategories = null;
    exported.panel.closedCategories = null;
    exported.panel.permissions = null;

    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.panel.formQuestions).toBeUndefined();
    expect(imported.panel.supportRoles).toBeUndefined();
    expect(imported.panel.additionalRoles).toBeUndefined();
    expect(imported.panel.openCategories).toBeUndefined();
    expect(imported.panel.closedCategories).toBeUndefined();
    expect(imported.panel.permissions).toBeUndefined();
  });

  it('drops unknown imported properties from accepted panel data', () => {
    const exported = exportTicketPanel(panel()) as any;
    exported.panel.unknownSetting = 'must not reach the API';

    const imported = parseTicketPanelExport(JSON.stringify(exported));

    expect(imported.panel).not.toHaveProperty('unknownSetting');
  });

  it.each([
    ['source id', (data: any) => (data.id = {})],
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
    ['permission bit set', (data: any) => (data.panel.permissions = { Everyone: { Denied: {} } })],
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
