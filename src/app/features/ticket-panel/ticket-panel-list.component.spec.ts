import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TicketPanelControllerService, TicketPanelModel } from '@dungeon-hub/api-client';
import { DiscordGuildService } from '../../core/services/discord-guild.service';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketPanelListComponent } from './ticket-panel-list.component';
import {
  serializeTicketPanel,
  serializeTicketPanels,
  toTicketPanelCreation,
} from './ticket-panel-transfer';

function panel(): TicketPanelModel {
  return {
    id: 'panel-1',
    name: 'support',
    displayName: 'Support',
    discordServer: { id: 'server-1' } as any,
    closeable: true,
    closeConfirmation: false,
    claimable: true,
    requiresLinking: false,
    closeTranscriptTarget: 'Both',
    deleteTranscriptTarget: 'User',
    ticketMessage: '{"content":"help"}',
    formQuestions: [],
    supportRoles: [],
    additionalRoles: [],
    openCategories: ['open'],
    closedCategories: ['closed'],
    permissions: { Everyone: { Denied: '1' } },
  };
}

describe('TicketPanelListComponent transfers', () => {
  let existing: TicketPanelModel;
  const service = {
    getAllTicketPanels: vi.fn(),
    createNewTicketPanel: vi.fn(),
    updateTicketPanel: vi.fn(),
  };
  const clipboard = { readText: vi.fn(), writeText: vi.fn() };
  const guildService = {
    getGuildById: vi.fn(),
    getDisplayName: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    existing = panel();
    service.getAllTicketPanels.mockImplementation(() => of([existing]));
    service.createNewTicketPanel.mockImplementation(() => of(existing));
    service.updateTicketPanel.mockImplementation(() => of(existing));
    guildService.getGuildById.mockReturnValue({ id: 'server-1', name: 'Dungeon Server' });
    guildService.getDisplayName.mockImplementation((guild) => guild.name);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    await TestBed.configureTestingModule({
      imports: [TicketPanelListComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { params: { serverId: 'server-1' } } } },
        { provide: TicketPanelControllerService, useValue: service },
        { provide: DiscordGuildService, useValue: guildService },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function component() {
    const fixture = TestBed.createComponent(TicketPanelListComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('shows the current server name in the holographic header', () => {
    const instance = component();

    expect(instance.serverName).toBe('Dungeon Server');
    expect(guildService.getGuildById).toHaveBeenCalledWith('server-1');
  });

  it('only highlights clipboard import when clipboard contains a valid panel export', async () => {
    clipboard.readText.mockResolvedValueOnce('{"ordinary":"json"}');
    const instance = component();
    await instance.openImportSourceModal();
    expect(instance.clipboardHasValidPanel).toBe(false);

    clipboard.readText.mockResolvedValueOnce(serializeTicketPanel(existing));
    await instance.openImportSourceModal();
    expect(instance.clipboardHasValidPanel).toBe(true);
  });

  it('copies exactly the same JSON representation used for downloaded exports', async () => {
    clipboard.writeText.mockResolvedValueOnce(undefined);
    const instance = component();
    instance.openExportModal(existing);
    await instance.copyExportToClipboard();

    expect(clipboard.writeText).toHaveBeenCalledWith(serializeTicketPanel(existing));
    expect(instance.transferError).toBe(false);
  });

  it('does not mutate any current panel data while exporting to the clipboard', async () => {
    const snapshot = structuredClone(existing);
    clipboard.writeText.mockResolvedValueOnce(undefined);
    const instance = component();
    instance.openExportModal(existing);
    await instance.copyExportToClipboard();

    expect(existing).toEqual(snapshot);
    expect(instance.ticketPanels[0]).toEqual(snapshot);
  });

  it('recognizes an export-all backup copied from the clipboard as importable', async () => {
    const second = {
      ...structuredClone(existing),
      id: 'panel-2',
      name: 'billing',
      displayName: 'Billing',
    };
    const instance = component();
    instance.ticketPanels = [existing, second];
    clipboard.writeText.mockResolvedValueOnce(undefined);

    instance.openExportAllModal();
    await instance.copyExportToClipboard();
    const backup = clipboard.writeText.mock.calls[0][0];
    clipboard.readText.mockResolvedValueOnce(backup);
    await instance.openImportSourceModal();

    expect(instance.clipboardHasValidPanel).toBe(true);
    instance.importFromClipboard();
    await Promise.resolve();
    expect(instance.showImportSelectionModal).toBe(true);
    expect(instance.importCandidates.map((candidate) => candidate.imported.panel.name)).toEqual([
      'support',
      'billing',
    ]);
  });

  it('copies an all-panel backup to the clipboard without mutating current panels', async () => {
    const second = {
      ...structuredClone(existing),
      id: 'panel-2',
      name: 'billing',
      displayName: 'Billing',
    };
    const snapshot = structuredClone([existing, second]);
    clipboard.writeText.mockResolvedValueOnce(undefined);
    const instance = component();
    instance.ticketPanels = [existing, second];

    instance.openExportAllModal();
    await instance.copyExportToClipboard();

    expect(clipboard.writeText).toHaveBeenCalledWith(serializeTicketPanels([existing, second]));
    expect(instance.transferMessage).toBe('Ticket panel backup copied to the clipboard.');
    expect([existing, second]).toEqual(snapshot);
    expect(instance.ticketPanels).toEqual(snapshot);
  });

  it('downloads an all-panel backup file and defers URL revocation', async () => {
    const instance = component();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:panels');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const link = { click: vi.fn(), href: '', download: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(link as any);

    instance.openExportAllModal();
    instance.downloadExport();

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(link.download).toBe('ticket-panels.backup.json');
    expect(link.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:panels');
    expect(instance.showExportModal).toBe(false);
  });

  it('does not open an all-panel export when there are no panels to back up', () => {
    const instance = component();
    instance.ticketPanels = [];

    instance.openExportAllModal();

    expect(instance.showExportModal).toBe(false);
  });

  it('reports clipboard write failures without changing or closing the export', async () => {
    clipboard.writeText.mockRejectedValueOnce(new Error('permission denied'));
    const instance = component();
    instance.openExportModal(existing);
    await instance.copyExportToClipboard();

    expect(instance.transferError).toBe(true);
    expect(instance.transferMessage).toContain('denied');
    expect(instance.showExportModal).toBe(true);
  });

  it('downloads the canonical export and later revokes its temporary URL without mutation', async () => {
    const snapshot = structuredClone(existing);
    const instance = component();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:panel');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click } as any);
    instance.openExportModal(existing);
    instance.downloadExport();

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:panel');
    expect(instance.showExportModal).toBe(false);
    expect(existing).toEqual(snapshot);
  });

  it('reports download failures and still revokes an allocated URL', async () => {
    const instance = component();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:panel');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: () => {
        throw new Error('download blocked');
      },
    } as any);
    instance.openExportModal(existing);

    instance.downloadExport();

    expect(instance.showExportModal).toBe(true);
    expect(instance.transferError).toBe(true);
    expect(instance.transferMessage).toBe(
      'Could not download the ticket panel export. Please try again.',
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:panel');
  });

  it('does nothing when export actions have no selected panel', async () => {
    const instance = component();
    await instance.copyExportToClipboard();
    instance.downloadExport();
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('routes matching clipboard imports to overwrite confirmation without changing the source', async () => {
    const snapshot = structuredClone(existing);
    clipboard.readText.mockResolvedValueOnce(serializeTicketPanel(existing));
    const instance = component();
    await instance.openImportSourceModal();
    instance.importFromClipboard();
    await Promise.resolve();

    expect(instance.importConflict).toBe(existing);
    expect(instance.showCreateModal).toBe(false);
    expect(existing).toEqual(snapshot);
  });

  it('offers overwrite when an import has the same internal name but a different source ID', async () => {
    const imported = structuredClone(existing);
    imported.id = 'panel-from-another-server';
    const instance = component();

    await instance.onFileDrop({
      preventDefault: vi.fn(),
      dataTransfer: { files: [{ text: () => Promise.resolve(serializeTicketPanel(imported)) }] },
    } as any);

    expect(instance.importConflict).toBe(existing);
    expect(instance.showCreateModal).toBe(false);
  });

  it('routes dropped non-conflicting exports to the unique-name prompt', async () => {
    const imported = structuredClone(existing);
    imported.id = 'panel-2';
    imported.name = 'sales';
    imported.displayName = 'Sales';
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [{ text: () => Promise.resolve(serializeTicketPanel(imported)) }] },
    } as unknown as DragEvent;
    const instance = component();
    await instance.onFileDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(instance.importConflict).toBeNull();
    expect(instance.showCreateModal).toBe(true);
    expect(instance.modalTitle).toBe('Import Ticket Panel');
  });

  it('lets users select which panels from a backup should enter the import flow', async () => {
    const selected = {
      ...structuredClone(existing),
      id: 'panel-2',
      name: 'billing',
      displayName: 'Billing',
    };
    const skipped = {
      ...structuredClone(existing),
      id: 'panel-3',
      name: 'sales',
      displayName: 'Sales',
    };
    const instance = component();

    await instance.onFileDrop({
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [{ text: () => Promise.resolve(serializeTicketPanels([selected, skipped])) }],
      },
    } as any);
    instance.importCandidates[1].selected = false;
    instance.confirmSelectedImports();

    expect(instance.showImportSelectionModal).toBe(false);
    expect(instance.showCreateModal).toBe(true);
    expect(instance.pendingPanel?.name).toBe('billing');
    expect(instance.pendingImportQueue).toEqual([]);
  });

  it('continues selected backup imports through per-panel conflict checks', async () => {
    const second = {
      ...structuredClone(existing),
      id: 'panel-2',
      name: 'billing',
      displayName: 'Billing',
    };
    const instance = component();

    await instance.onFileDrop({
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [{ text: () => Promise.resolve(serializeTicketPanels([existing, second])) }],
      },
    } as any);
    instance.confirmSelectedImports();

    expect(instance.importConflict).toBe(existing);
    instance.overwriteImport();

    expect(service.updateTicketPanel).toHaveBeenCalledWith(
      'server-1',
      'panel-1',
      expect.objectContaining({ name: 'support' }),
    );
    expect(instance.showCreateModal).toBe(true);
    expect(instance.pendingPanel?.name).toBe('billing');
  });

  it('requires at least one selected panel before continuing a backup import', async () => {
    const second = {
      ...structuredClone(existing),
      id: 'panel-2',
      name: 'billing',
      displayName: 'Billing',
    };
    const instance = component();

    await instance.onFileDrop({
      preventDefault: vi.fn(),
      dataTransfer: {
        files: [{ text: () => Promise.resolve(serializeTicketPanels([existing, second])) }],
      },
    } as any);
    instance.importCandidates.forEach((candidate) => (candidate.selected = false));
    instance.confirmSelectedImports();

    expect(instance.showImportSelectionModal).toBe(true);
    expect(instance.createError).toBe('Select at least one ticket panel to import.');
    expect(service.createNewTicketPanel).not.toHaveBeenCalled();
    expect(service.updateTicketPanel).not.toHaveBeenCalled();
  });

  it('updates drag highlighting and prevents browser drop behavior', () => {
    const instance = component();
    const over = { preventDefault: vi.fn() } as unknown as DragEvent;
    const leave = { preventDefault: vi.fn() } as unknown as DragEvent;
    instance.onDragOver(over);
    expect(instance.isDragging).toBe(true);
    instance.onDragLeave(leave);
    expect(instance.isDragging).toBe(false);
    expect(over.preventDefault).toHaveBeenCalledOnce();
    expect(leave.preventDefault).toHaveBeenCalledOnce();
  });

  it('keeps the import dialog open and shows an error for an invalid dropped file', async () => {
    const event = {
      preventDefault: vi.fn(),
      dataTransfer: { files: [{ text: () => Promise.resolve('invalid') }] },
    } as unknown as DragEvent;
    const instance = component();
    instance.showImportSourceModal = true;
    await instance.onFileDrop(event);
    expect(instance.showImportSourceModal).toBe(true);
    expect(instance.transferMessage).toBe(
      'Could not read ticket panel export. Choose a valid ticket panel JSON file.',
    );
  });

  it.each([
    [
      'selected',
      (instance: TicketPanelListComponent, file: any) =>
        instance.importPanel({ target: { files: [file], value: 'selected' } } as any),
    ],
    [
      'dropped',
      (instance: TicketPanelListComponent, file: any) =>
        instance.onFileDrop({ preventDefault: vi.fn(), dataTransfer: { files: [file] } } as any),
    ],
  ])(
    'reports a %s file read failure without changing existing panels',
    async (_source, importFile) => {
      const snapshot = structuredClone(existing);
      const instance = component();
      instance.showImportSourceModal = true;

      await importFile(instance, { text: () => Promise.reject(new Error('read failed')) });

      expect(instance.transferMessage).toBe(
        'Could not read ticket panel export. Choose a valid ticket panel JSON file.',
      );
      expect(instance.showImportSourceModal).toBe(true);
      expect(instance.pendingPanel).toBeNull();
      expect(existing).toEqual(snapshot);
    },
  );

  it('leaves file import unchanged when no file was selected', async () => {
    const instance = component();
    await instance.importPanel({ target: { files: [], value: 'old' } } as any);
    expect(instance.pendingPanel).toBeNull();
  });

  it('handles denied clipboard read access by keeping clipboard import disabled', async () => {
    clipboard.readText.mockRejectedValueOnce(new Error('denied'));
    const instance = component();
    await instance.openImportSourceModal();
    expect(instance.showImportSourceModal).toBe(true);
    expect(instance.clipboardHasValidPanel).toBe(false);
    expect(instance.clipboardAccessDenied).toBe(true);
  });

  it('does not process clipboard text if validation has not enabled it', () => {
    const instance = component();
    instance.clipboardContents = serializeTicketPanel(existing);
    instance.clipboardHasValidPanel = false;
    instance.importFromClipboard();
    expect(instance.pendingPanel).toBeNull();
  });

  it('overwrites the matching ID with detached imported settings', async () => {
    clipboard.readText.mockResolvedValueOnce(serializeTicketPanel(existing));
    const instance = component();
    await instance.openImportSourceModal();
    instance.importFromClipboard();
    await Promise.resolve();
    instance.overwriteImport();

    expect(service.updateTicketPanel).toHaveBeenCalledWith(
      'server-1',
      'panel-1',
      expect.objectContaining({ name: 'support', closeable: true }),
    );
    expect(service.createNewTicketPanel).not.toHaveBeenCalled();
  });

  it('reports overwrite failures and retains conflict data for retry', () => {
    service.updateTicketPanel.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'No access' } })) as any,
    );
    const instance = component();
    instance.importConflict = existing;
    instance.pendingPanel = structuredClone({
      name: existing.name,
      closeable: true,
      closeConfirmation: false,
      claimable: true,
      requiresLinking: false,
    });
    instance.overwriteImport();
    expect(instance.createError).toBe('No access');
    expect(instance.importConflict).toBe(existing);
    expect(instance.isCreating).toBe(false);
  });

  it('does not issue an overwrite without both a conflict and pending settings', () => {
    const instance = component();
    instance.overwriteImport();
    expect(service.updateTicketPanel).not.toHaveBeenCalled();
  });

  it('allows conflict imports to continue through the new unique-name flow', () => {
    const instance = component();
    instance.importConflict = existing;
    instance.pendingPanel = structuredClone({
      name: existing.name,
      closeable: true,
      closeConfirmation: false,
      claimable: true,
      requiresLinking: false,
    });
    instance.createError = 'old overwrite error';
    instance.createNewFromConflict();
    expect(instance.importConflict).toBeNull();
    expect(instance.createError).toBeNull();
    expect(instance.showCreateModal).toBe(true);
    expect(instance.newPanel.name).toBe('');
  });

  it('cancels imports and clears all retained transfer state', () => {
    const instance = component();
    instance.importConflict = existing;
    instance.pendingPanel = {} as any;
    instance.createError = 'error';
    instance.cancelImport();
    expect(instance.importConflict).toBeNull();
    expect(instance.pendingPanel).toBeNull();
    expect(instance.createError).toBeNull();
  });

  it('clones detached settings and rejects duplicate names case-insensitively', () => {
    const snapshot = structuredClone(existing);
    const instance = component();
    instance.openCopyModal(existing);
    instance.pendingPanel!.permissions!['Everyone']['Denied'] = 'changed';
    instance.newPanel = { name: ' SUPPORT ', displayName: 'Different', emoji: '' };
    expect(instance.canCreate).toBe(false);
    expect(existing).toEqual(snapshot);
  });

  it('creates a renamed clone and leaves the original panel unchanged', () => {
    const snapshot = structuredClone(existing);
    const instance = component();
    instance.openCopyModal(existing);
    instance.newPanel = { name: 'support-copy', displayName: 'Support Copy', emoji: '🎫' };
    instance.createPanel();
    expect(service.createNewTicketPanel).toHaveBeenCalledWith(
      'server-1',
      expect.objectContaining({ name: 'support-copy', displayName: 'Support Copy' }),
    );
    expect(existing).toEqual(snapshot);
    expect(instance.pendingPanel).toBeNull();
  });

  it('rejects invalid creation locally without calling the API', () => {
    const instance = component();
    instance.newPanel = { name: 'support', displayName: 'Support', emoji: '' };
    instance.createPanel();
    expect(service.createNewTicketPanel).not.toHaveBeenCalled();
    expect(instance.createError).toContain('unique');
  });

  it.each([
    ['cloned', (instance: TicketPanelListComponent) => instance.openCopyModal(existing)],
    [
      'imported',
      (instance: TicketPanelListComponent) => {
        instance.pendingPanel = toTicketPanelCreation(existing);
        instance.modalTitle = 'Import Ticket Panel';
      },
    ],
  ])('requires a display name for %s panel creation', (_flow, prepare) => {
    const instance = component();
    prepare(instance);
    instance.newPanel = { name: 'new-panel', displayName: '   ', emoji: '' };

    instance.createPanel();

    expect(service.createNewTicketPanel).not.toHaveBeenCalled();
    expect(instance.createError).toBe(
      'A display name is required for cloned and imported ticket panels.',
    );
  });

  it('does not replace an existing error or call the API while creation is in flight', () => {
    const instance = component();
    instance.newPanel = { name: 'new-panel', displayName: 'New Panel', emoji: '' };
    instance.createError = 'existing request state';
    instance.isCreating = true;

    instance.createPanel();

    expect(service.createNewTicketPanel).not.toHaveBeenCalled();
    expect(instance.createError).toBe('existing request state');
  });

  it('reports create API failures and permits retry', () => {
    service.createNewTicketPanel.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Rejected' } })) as any,
    );
    const instance = component();
    instance.openCreateModal();
    instance.newPanel.name = 'new-panel';
    instance.createPanel();
    expect(instance.createError).toBe('Rejected');
    expect(instance.isCreating).toBe(false);
  });

  it('reports panel loading failures', () => {
    service.getAllTicketPanels.mockReturnValueOnce(throwError(() => new Error('offline')) as any);
    const instance = component();
    expect(instance.loadError).toContain('Failed to load');
  });
});
