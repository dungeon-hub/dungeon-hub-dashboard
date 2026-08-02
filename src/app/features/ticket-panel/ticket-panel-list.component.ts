import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  TicketPanelControllerService,
  TicketPanelCreationModel,
  TicketPanelModel,
} from '@dungeon-hub/api-client';
import {
  exportTicketPanel,
  hasDuplicatePanelName,
  parseTicketPanelExport,
  toTicketPanelCreation,
} from './ticket-panel-transfer';

@Component({
  selector: 'app-ticket-panel-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId]" class="btn btn-secondary mb-4 inline-block">
          ← Back to Server
        </a>
        <h2 class="text-3xl font-bold holographic">Ticket Panels</h2>
      </div>

      @if (loadError) {
        <div class="card bg-red-900/20 border-red-500 mb-8">
          <div class="flex justify-between items-center">
            <p class="text-red-400">{{ loadError }}</p>
            <button (click)="loadTicketPanels()" class="btn btn-secondary">Retry</button>
          </div>
        </div>
      }

      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Ticket Panels</h3>
          <div class="flex gap-2">
            <button (click)="importInput.click()" class="btn btn-secondary">⇧ Import</button>
            <input
              #importInput
              type="file"
              accept="application/json,.json"
              class="hidden"
              (change)="importPanel($event)"
            />
            <button (click)="openCreateModal()" class="btn btn-primary">＋ New Panel</button>
          </div>
        </div>

        @if (ticketPanels.length > 0) {
          <div class="space-y-4">
            @for (panel of ticketPanels; track panel.id) {
              <div
                class="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group flex justify-between items-center"
              >
                <a [routerLink]="['/server', serverId, 'ticket-panel', panel.id]" class="flex-1">
                  <div class="flex justify-between items-center">
                    <div class="flex-1">
                      <div class="flex items-center gap-4">
                        <span
                          class="text-lg font-semibold group-hover:text-blue-400 transition-colors"
                        >
                          {{ panel.displayName || panel.name }}
                        </span>
                        <span class="text-sm text-gray-400">#{{ panel.id }}</span>
                      </div>
                    </div>
                  </div>
                </a>
                <div class="flex gap-2 ml-4">
                  <button
                    (click)="exportPanel(panel)"
                    class="btn btn-secondary"
                    title="Export panel"
                  >
                    ⇩ Export
                  </button>
                  <button
                    (click)="openCopyModal(panel)"
                    class="btn btn-secondary"
                    title="Clone panel"
                  >
                    ⧉ Clone
                  </button>
                  <a
                    [routerLink]="['/server', serverId, 'ticket-panel', panel.id]"
                    class="text-gray-400 p-2"
                    >→</a
                  >
                </div>
              </div>
            }
          </div>
        }

        @if (ticketPanels.length === 0 && !loadError) {
          <p class="text-gray-400 text-center py-8">
            No ticket panels created yet. Click "New Panel" to create one.
          </p>
        }
      </div>

      @if (showCreateModal) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showCreateModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">
              {{ pendingPanel ? modalTitle : 'Create New Ticket Panel' }}
            </h3>
            @if (pendingPanel) {
              <p class="text-gray-400 mb-4">
                Choose a new, unique internal and display name. The original panel will not be
                changed.
              </p>
            }

            <div class="space-y-4">
              <div>
                <label class="label">Internal Name *</label>
                <input
                  [(ngModel)]="newPanel.name"
                  type="text"
                  class="input"
                  placeholder="e.g. support_ticket"
                  required
                />
                <small class="text-gray-400">Unique identifier for the system</small>
              </div>

              <div>
                <label class="label">Display Name {{ pendingPanel ? '*' : '' }}</label>
                <input
                  [(ngModel)]="newPanel.displayName"
                  type="text"
                  class="input"
                  placeholder="e.g. Support Ticket"
                />
                <small class="text-gray-400">Shown to users on the button</small>
              </div>

              @if (newPanel.name.trim() && newPanel.displayName.trim() && !canCreate) {
                <p class="text-red-400 text-sm">
                  That internal name or display name is already in use.
                </p>
              }

              <div>
                <label class="label">Emoji</label>
                <input
                  [(ngModel)]="newPanel.emoji"
                  type="text"
                  class="input"
                  placeholder="🎫 or <:name:id>"
                />
                <small class="text-gray-400">Unicode emoji or custom Discord emoji</small>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showCreateModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                (click)="createPanel()"
                class="btn btn-primary flex-1"
                [disabled]="!canCreate || isCreating"
              >
                {{ isCreating ? 'Creating...' : pendingPanel ? 'Create Copy' : 'Create' }}
              </button>
            </div>

            @if (createError) {
              <p class="text-red-400 text-sm mt-4">{{ createError }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class TicketPanelListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ticketPanelService = inject(TicketPanelControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  ticketPanels: TicketPanelModel[] = [];
  loadError: string | null = null;

  showCreateModal = false;
  isCreating = false;
  createError: string | null = null;
  newPanel = {
    name: '',
    displayName: '',
    emoji: '',
  };
  pendingPanel: TicketPanelCreationModel | null = null;
  modalTitle = '';

  get canCreate(): boolean {
    const name = this.newPanel.name.trim();
    const displayName = this.newPanel.displayName.trim();
    return (
      !!name &&
      (!this.pendingPanel || !!displayName) &&
      !hasDuplicatePanelName(this.ticketPanels, name, displayName)
    );
  }

  openCreateModal() {
    this.pendingPanel = null;
    this.newPanel = { name: '', displayName: '', emoji: '' };
    this.createError = null;
    this.showCreateModal = true;
  }

  openCopyModal(panel: TicketPanelModel) {
    this.pendingPanel = toTicketPanelCreation(panel);
    this.modalTitle = 'Clone Ticket Panel';
    this.newPanel = { name: '', displayName: '', emoji: panel.emoji || '' };
    this.createError = null;
    this.showCreateModal = true;
  }

  async importPanel(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.pendingPanel = parseTicketPanelExport(await file.text());
      this.modalTitle = 'Import Ticket Panel';
      this.newPanel = { name: '', displayName: '', emoji: this.pendingPanel.emoji || '' };
      this.createError = null;
      this.showCreateModal = true;
    } catch (error) {
      this.loadError =
        error instanceof Error ? error.message : 'Could not read ticket panel export.';
    }
  }

  exportPanel(panel: TicketPanelModel) {
    const blob = new Blob([JSON.stringify(exportTicketPanel(panel), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${panel.name}.ticket-panel.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.loadTicketPanels();
  }

  loadTicketPanels() {
    this.loadError = null;
    this.ticketPanelService.getAllTicketPanels(this.serverId).subscribe({
      next: (panels) => {
        this.ticketPanels = panels || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load ticket panels. Please try again.';
        console.error('Error loading ticket panels:', err);
        this.cdr.detectChanges();
      },
    });
  }

  createPanel() {
    const trimmedName = this.newPanel.name.trim();
    if (!this.canCreate || this.isCreating) {
      this.createError = 'Internal and display names must be unique.';
      return;
    }

    this.isCreating = true;
    this.createError = null;

    const defaults: TicketPanelCreationModel = {
      name: trimmedName,
      displayName: this.newPanel.displayName || undefined,
      emoji: this.newPanel.emoji || undefined,
      closeable: false,
      closeConfirmation: false,
      claimable: false,
      requiresLinking: false,
      openChannelName: '{panel.name}-{ticket.count}',
      ticketMessage:
        '{"content":"Welcome, {user.mention}!\\nPlease describe your {panel.name} request below further."}',
      userTranscriptDm: '["transcript"]',
      permissions: {
        SupportTeam: {
          Allowed: '68608',
        },
        AdditionalRoles: {
          Allowed: '68608',
        },
        TicketCreator: {
          Allowed: '68608',
        },
        TicketClaimer: {
          Allowed: '68608',
        },
        Everyone: {
          Denied: '1024',
        },
      },
    };
    const creationModel: TicketPanelCreationModel = structuredClone(this.pendingPanel || defaults);
    creationModel.name = trimmedName;
    creationModel.displayName = this.newPanel.displayName.trim() || undefined;
    creationModel.emoji = this.newPanel.emoji.trim() || undefined;

    this.ticketPanelService.createNewTicketPanel(this.serverId, creationModel).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newPanel = { name: '', displayName: '', emoji: '' };
        this.pendingPanel = null;
        this.isCreating = false;
        this.loadTicketPanels();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create ticket panel';
        this.isCreating = false;
        this.cdr.detectChanges();
      },
    });
  }
}
