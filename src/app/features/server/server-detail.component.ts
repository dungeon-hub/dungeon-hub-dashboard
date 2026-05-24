import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TicketPanelControllerService, CntRequestControllerService } from '@dungeon-hub/api-client';

@Component({
  selector: 'app-server-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Back Button & Header -->
      <div class="mb-8">
        <a routerLink="/dashboard" class="btn btn-secondary mb-4 inline-block">
          ← Back to Dashboard
        </a>
        <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Server Dashboard
        </h2>
      </div>

      <!-- Ticket Panels Section -->
      <div class="card mb-8">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Ticket Panels</h3>
          <button
            (click)="showCreateModal = true"
            class="btn btn-primary"
          >
            ＋ New Panel
          </button>
        </div>

        @if (ticketPanels.length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (panel of ticketPanels; track panel.id) {
              <a
                [routerLink]="['/server', serverId, 'ticket-panel', panel.id]"
                class="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold group-hover:text-blue-400 transition-colors">
                      {{ panel.displayName || panel.name }}
                    </h4>
                    <p class="text-sm text-gray-400">#{{ panel.id }}</p>
                  </div>
                  <span class="text-gray-400">→</span>
                </div>
              </a>
            }
          </div>
        }

        @if (ticketPanels.length === 0) {
          <p class="text-gray-400 text-center py-8">
            No ticket panels created yet. Click "New Panel" to create one.
          </p>
        }
      </div>

      <!-- CNT Requests Section -->
      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">CNT Requests</h3>
        </div>

        <p class="text-gray-400 mb-4">
          Total requests: {{ totalCntRequests }}
        </p>

        <a
          [routerLink]="['/server', serverId, 'cnt-requests']"
          class="btn btn-primary"
        >
          View All CNT Requests
        </a>
      </div>

      <!-- Create Modal -->
      @if (showCreateModal) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showCreateModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Create New Ticket Panel</h3>

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
                <label class="label">Display Name</label>
                <input
                  [(ngModel)]="newPanel.displayName"
                  type="text"
                  class="input"
                  placeholder="e.g. Support Ticket"
                />
                <small class="text-gray-400">Shown to users on the button</small>
              </div>

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
              <button (click)="createPanel()" class="btn btn-primary flex-1" [disabled]="!newPanel.name || isCreatingPanel">
                {{ isCreatingPanel ? 'Creating...' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ServerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private ticketPanelService = inject(TicketPanelControllerService);
  private cntRequestService = inject(CntRequestControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  ticketPanels: any[] = [];
  totalCntRequests = 0;
  showCreateModal = false;
  isCreatingPanel = false;

  newPanel = {
    name: '',
    displayName: '',
    emoji: ''
  };

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.loadData();
  }

  loadData() {
    // Load ticket panels
    this.ticketPanelService.getAllTicketPanels(this.serverId).subscribe({
      next: (panels) => {
        this.ticketPanels = panels || [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    // Load CNT request count
    this.cntRequestService.getCntRequests(this.serverId, 0, 1).subscribe({
      next: (page) => {
        this.totalCntRequests = Number(page.totalElements || 0);
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  createPanel() {
    if (!this.newPanel.name || this.isCreatingPanel) return;

    this.isCreatingPanel = true;

    const creationModel = {
      name: this.newPanel.name,
      displayName: this.newPanel.displayName || undefined,
      emoji: this.newPanel.emoji || undefined,
      closeable: false,
      closeConfirmation: false,
      claimable: false,
      requiresLinking: false,
      openChannelName: '{panel.name}-{ticket.count}',
      ticketMessage: '{"content":"Welcome, {user.mention}!\\nPlease describe your request below."}',
      userTranscriptDm: '["transcript"]'
    };

    this.ticketPanelService.createNewTicketPanel(this.serverId, creationModel).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newPanel = { name: '', displayName: '', emoji: '' };
        this.isCreatingPanel = false;
        this.loadData();
      },
      error: () => {
        this.isCreatingPanel = false;
      }
    });
  }
}
