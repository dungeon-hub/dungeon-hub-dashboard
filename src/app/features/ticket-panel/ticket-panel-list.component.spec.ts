import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TicketPanelControllerService, TicketPanelModel } from '@dungeon-hub/api-client';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TicketPanelListComponent } from './ticket-panel-list.component';
import { serializeTicketPanel } from './ticket-panel-transfer';

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
  const existing = panel();
  const service = {
    getAllTicketPanels: vi.fn(() => of([existing])),
    createNewTicketPanel: vi.fn(() => of(existing)),
    updateTicketPanel: vi.fn(() => of(existing)),
  };
  const clipboard = { readText: vi.fn(), writeText: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    await TestBed.configureTestingModule({
      imports: [TicketPanelListComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { params: { serverId: 'server-1' } } } },
        { provide: TicketPanelControllerService, useValue: service },
      ],
    }).compileComponents();
  });

  function component() {
    const fixture = TestBed.createComponent(TicketPanelListComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

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

  it('reports clipboard write failures without changing or closing the export', async () => {
    clipboard.writeText.mockRejectedValueOnce(new Error('permission denied'));
    const instance = component();
    instance.openExportModal(existing);
    await instance.copyExportToClipboard();

    expect(instance.transferError).toBe(true);
    expect(instance.transferMessage).toContain('denied');
    expect(instance.showExportModal).toBe(true);
  });

  it('downloads the canonical export and revokes its temporary URL without mutation', () => {
    const snapshot = structuredClone(existing);
    const instance = component();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:panel');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.fn();
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue({ click } as any);
    instance.openExportModal(existing);
    instance.downloadExport();

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:panel');
    expect(instance.showExportModal).toBe(false);
    expect(existing).toEqual(snapshot);
    createElement.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
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
    expect(instance.transferMessage).toContain('JSON');
  });

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
    instance.createNewFromConflict();
    expect(instance.importConflict).toBeNull();
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
