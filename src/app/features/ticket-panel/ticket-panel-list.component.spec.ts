import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TicketPanelControllerService, TicketPanelModel } from '@dungeon-hub/api-client';
import { of } from 'rxjs';
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
});
