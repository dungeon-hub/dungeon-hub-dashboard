import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DiscordGuildService } from '../../core/services/discord-guild.service';
import {
  TicketPanelControllerService,
  CntRequestControllerService,
  CarryTypeControllerService,
  CarryTypeModel
} from '@dungeon-hub/api-client';

@Component({
  selector: 'app-server-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Back Button & Header -->
      <div class="mb-8">
        <a routerLink="/dashboard" class="btn btn-secondary mb-4 inline-block">
          ← Back to Dashboard
        </a>
        <h2 class="text-3xl font-bold holographic">
          {{ serverName ? getDisplayName(serverName) : 'Server Dashboard' }}
        </h2>
      </div>

      <!-- Error Message -->
      @if (loadError) {
        <div class="card bg-red-900/20 border-red-500 mb-8">
          <div class="flex justify-between items-center">
            <p class="text-red-400">{{ loadError }}</p>
            <button (click)="loadData()" class="btn btn-secondary">
              Retry
            </button>
          </div>
        </div>
      }

      <!-- Ticket Panels Section -->
      <div class="card mb-8">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Ticket Panels</h3>
          <a
            [routerLink]="['/server', serverId, 'ticket-panels']"
            class="btn btn-primary"
          >
            View All
          </a>
        </div>

        @if (ticketPanels.length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (panel of getCurrentTicketPanelPage(); track panel.id) {
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
          @if (ticketPanels.length > MAX_TICKET_PANELS_DISPLAY) {
            <div class="flex justify-center items-center gap-4 mt-4">
              <button
                (click)="previousTicketPanelPage()"
                [disabled]="currentTicketPanelPage === 0"
                class="btn btn-secondary"
                [class.opacity-50]="currentTicketPanelPage === 0"
                [class.cursor-not-allowed]="currentTicketPanelPage === 0"
              >
                ← Previous
              </button>
              <p class="text-gray-400 text-sm">
                Showing {{ getTicketPanelRangeStart() }}-{{ getTicketPanelRangeEnd() }} of {{ ticketPanels.length }} ticket panels
              </p>
              <button
                (click)="nextTicketPanelPage()"
                [disabled]="currentTicketPanelPage >= getTotalTicketPanelPages() - 1"
                class="btn btn-secondary"
                [class.opacity-50]="currentTicketPanelPage >= getTotalTicketPanelPages() - 1"
                [class.cursor-not-allowed]="currentTicketPanelPage >= getTotalTicketPanelPages() - 1"
              >
                Next →
              </button>
            </div>
          }
        }

        @if (ticketPanels.length === 0) {
          <p class="text-gray-400 text-center py-8">
            No ticket panels created yet. Click "View All" to create panels.
          </p>
        }
      </div>

      <!-- Carry Types Section -->
      <div class="card mb-8">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Carry Types</h3>
          <a
            [routerLink]="['/server', serverId, 'carry-types']"
            class="btn btn-primary"
          >
            View All
          </a>
        </div>

        @if (carryTypes.length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (carryType of getCurrentCarryTypePage(); track carryType.id) {
              <a
                [routerLink]="['/server', serverId, 'carry-type', carryType.id]"
                class="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold group-hover:text-blue-400 transition-colors">
                      {{ carryType.displayName }}
                    </h4>
                    <p class="text-sm text-gray-400">{{ carryType.identifier }}</p>
                  </div>
                  <span class="text-gray-400">→</span>
                </div>
              </a>
            }
          </div>
          @if (carryTypes.length > MAX_CARRY_TYPES_DISPLAY) {
            <div class="flex justify-center items-center gap-4 mt-4">
              <button
                (click)="previousCarryTypePage()"
                [disabled]="currentCarryTypePage === 0"
                class="btn btn-secondary"
                [class.opacity-50]="currentCarryTypePage === 0"
                [class.cursor-not-allowed]="currentCarryTypePage === 0"
              >
                ← Previous
              </button>
              <p class="text-gray-400 text-sm">
                Showing {{ getCarryTypeRangeStart() }}-{{ getCarryTypeRangeEnd() }} of {{ carryTypes.length }} carry types
              </p>
              <button
                (click)="nextCarryTypePage()"
                [disabled]="currentCarryTypePage >= getTotalCarryTypePages() - 1"
                class="btn btn-secondary"
                [class.opacity-50]="currentCarryTypePage >= getTotalCarryTypePages() - 1"
                [class.cursor-not-allowed]="currentCarryTypePage >= getTotalCarryTypePages() - 1"
              >
                Next →
              </button>
            </div>
          }
        }

        @if (carryTypes.length === 0) {
          <p class="text-gray-400 text-center py-8">
            No carry types created yet.
          </p>
        }
      </div>


      <!-- Static Messages Section -->
      <div class="card mb-8">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Static Messages</h3>
        </div>

        <p class="text-gray-400 mb-4">
          Edit static message channels, embed overrides, and active state.
        </p>

        <a
          [routerLink]="['/server', serverId, 'static-messages']"
          class="btn btn-primary"
        >
          Manage Static Messages
        </a>
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
    </div>
  `
})
export class ServerDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private discordGuildService = inject(DiscordGuildService);
  private ticketPanelService = inject(TicketPanelControllerService);
  private cntRequestService = inject(CntRequestControllerService);
  private carryTypeService = inject(CarryTypeControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  serverName: string = '';
  ticketPanels: any[] = [];
  carryTypes: CarryTypeModel[] = [];
  totalCntRequests = 0;
  loadError: string | null = null;

  // Limits for dashboard display
  readonly MAX_TICKET_PANELS_DISPLAY = 9;
  readonly MAX_CARRY_TYPES_DISPLAY = 9;

  // Pagination state
  currentTicketPanelPage = 0;
  currentCarryTypePage = 0;

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];

    // Load server name from guild info
    const guild = this.discordGuildService.getGuildById(this.serverId);
    if (guild) {
      this.serverName = guild.name;
    }

    this.loadData();
  }

  getDisplayName(guildName: string): string {
    return this.discordGuildService.getDisplayName(guildName);
  }

  loadData() {
    this.loadError = null;

    // Load ticket panels
    this.ticketPanelService.getAllTicketPanels(this.serverId).subscribe({
      next: (panels) => {
        this.ticketPanels = panels || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load ticket panels. Please try again.';
        this.cdr.detectChanges();
      }
    });

    // Load carry types
    this.carryTypeService.getAllCarryTypes(this.serverId).subscribe({
      next: (types) => {
        this.carryTypes = types || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load carry types:', err);
        this.cdr.detectChanges();
      }
    });

    // Load CNT request count
    this.cntRequestService.getCntRequests(this.serverId, 0, 1).subscribe({
      next: (page) => {
        this.totalCntRequests = Number(page.totalElements || 0);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load CNT requests. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  // Ticket Panel Pagination Methods
  getCurrentTicketPanelPage(): any[] {
    const start = this.currentTicketPanelPage * this.MAX_TICKET_PANELS_DISPLAY;
    const end = start + this.MAX_TICKET_PANELS_DISPLAY;
    return this.ticketPanels.slice(start, end);
  }

  getTotalTicketPanelPages(): number {
    return Math.ceil(this.ticketPanels.length / this.MAX_TICKET_PANELS_DISPLAY);
  }

  getTicketPanelRangeStart(): number {
    return this.currentTicketPanelPage * this.MAX_TICKET_PANELS_DISPLAY + 1;
  }

  getTicketPanelRangeEnd(): number {
    const end = (this.currentTicketPanelPage + 1) * this.MAX_TICKET_PANELS_DISPLAY;
    return Math.min(end, this.ticketPanels.length);
  }

  nextTicketPanelPage(): void {
    if (this.currentTicketPanelPage < this.getTotalTicketPanelPages() - 1) {
      this.currentTicketPanelPage++;
    }
  }

  previousTicketPanelPage(): void {
    if (this.currentTicketPanelPage > 0) {
      this.currentTicketPanelPage--;
    }
  }

  // Carry Type Pagination Methods
  getCurrentCarryTypePage(): CarryTypeModel[] {
    const start = this.currentCarryTypePage * this.MAX_CARRY_TYPES_DISPLAY;
    const end = start + this.MAX_CARRY_TYPES_DISPLAY;
    return this.carryTypes.slice(start, end);
  }

  getTotalCarryTypePages(): number {
    return Math.ceil(this.carryTypes.length / this.MAX_CARRY_TYPES_DISPLAY);
  }

  getCarryTypeRangeStart(): number {
    return this.currentCarryTypePage * this.MAX_CARRY_TYPES_DISPLAY + 1;
  }

  getCarryTypeRangeEnd(): number {
    const end = (this.currentCarryTypePage + 1) * this.MAX_CARRY_TYPES_DISPLAY;
    return Math.min(end, this.carryTypes.length);
  }

  nextCarryTypePage(): void {
    if (this.currentCarryTypePage < this.getTotalCarryTypePages() - 1) {
      this.currentCarryTypePage++;
    }
  }

  previousCarryTypePage(): void {
    if (this.currentCarryTypePage > 0) {
      this.currentCarryTypePage--;
    }
  }
}
