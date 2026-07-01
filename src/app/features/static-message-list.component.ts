import {ChangeDetectorRef, Component, OnInit, inject} from '@angular/core';
import {forkJoin, of} from 'rxjs';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {
  CarryTierControllerService,
  CarryTypeControllerService,
  DiscordChannelControllerService,
  DiscordChannelModel,
  StaticMessageControllerService,
  StaticMessageCreationModel,
  StaticMessageModel,
  TicketPanelControllerService
} from '@dungeon-hub/api-client';
import {AutocompleteComponent} from '../shared/components/autocomplete/autocomplete.component';
import {MultiSelectAutocompleteComponent} from '../shared/components/multi-select-autocomplete/multi-select-autocomplete.component';
import {getStaticMessageTypeLabel, STATIC_MESSAGE_TYPES, StaticMessageType} from './static-message/static-message-labels';
import {
  StaticMessageObjectOption,
  getObjectOptionTypeLabel,
  supportsObjectIds,
  toCarryTierOption,
  toCarryTypeOption,
  toTicketPanelOption
} from './static-message/static-message-object-options';

type StaticMessageWithActive = StaticMessageModel & { active?: boolean };
type StaticMessageCreationWithActive = StaticMessageCreationModel & { active?: boolean };

@Component({
  selector: 'app-static-message-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AutocompleteComponent, MultiSelectAutocompleteComponent],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId]" class="btn btn-secondary mb-4 inline-block">← Back to Server</a>
        <h2 class="text-3xl font-bold holographic">Static Messages</h2>
      </div>

      @if (loadError) {
        <div class="card bg-red-900/20 border-red-500 mb-8">
          <div class="flex justify-between items-center">
            <p class="text-red-400">{{ loadError }}</p>
            <button (click)="loadStaticMessages()" class="btn btn-secondary">Retry</button>
          </div>
        </div>
      }

      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Static Messages</h3>
          <button (click)="openCreateModal()" class="btn btn-primary">＋ New Static Message</button>
        </div>

        @if (loading) {
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p class="mt-4 text-gray-400">Loading...</p>
          </div>
        }

        @if (!loading && staticMessages.length > 0) {
          <div class="space-y-4">
            @for (message of staticMessages; track message.id) {
              <div class="p-4 bg-gray-700 rounded-lg transition-colors group">
                <div class="flex justify-between items-start gap-4">
                  <div class="flex-1">
                    <div class="flex flex-wrap items-center gap-3">
                      <span class="text-lg font-semibold">{{ getTypeLabel(message.staticMessageType) }}</span>
                      <span class="text-sm text-gray-400">#{{ message.id }}</span>
                      <span class="text-xs px-2 py-1 rounded" [class.bg-green-900]="message.active !== false" [class.text-green-300]="message.active !== false" [class.bg-red-900]="message.active === false" [class.text-red-300]="message.active === false">
                        {{ message.active === false ? 'Inactive' : 'Active' }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">Channel: {{ getChannelName(message.channelId) }}</p>
                    @if (message.messageId) {
                      <p class="text-sm text-gray-400">Message ID: {{ message.messageId }}</p>
                    }
                    @if (getObjectNames(message).length > 0) {
                      <p class="text-sm text-gray-400">{{ getObjectOptionLabel(message.staticMessageType) }}: {{ getObjectNames(message).join(', ') }}</p>
                    }
                  </div>
                  <div class="flex flex-col sm:flex-row gap-2">
                    @if (message.messageId) {
                      <a [href]="getDiscordMessageUrl(message)" target="_blank" rel="noopener noreferrer" class="btn btn-secondary whitespace-nowrap">Jump to Message</a>
                    }
                    <a [routerLink]="['/server', serverId, 'static-message', message.id]" class="btn btn-primary whitespace-nowrap">Edit</a>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        @if (!loading && staticMessages.length === 0 && !loadError) {
          <p class="text-gray-400 text-center py-8">No static messages created yet.</p>
        }
      </div>

      @if (showCreateModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" (click)="closeCreateModal()">
          <div class="card max-w-2xl w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Create Static Message</h3>
            <div class="space-y-4">
              <div>
                <label class="label">Type *</label>
                <select [(ngModel)]="newMessage.staticMessageType" (ngModelChange)="onCreateTypeChange($event)" class="input">
                  @for (type of staticMessageTypes; track type) {
                    <option [value]="type">{{ getTypeLabel(type) }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label">Channel *</label>
                <app-autocomplete [items]="discordChannels" displayKey="name" valueKey="id" placeholder="Search channels..." [selectedItem]="selectedCreateChannel" (selectedItemChange)="onCreateChannelSelected($event)" nullLabel="Select a channel" groupByKey="category.id" groupDisplayKey="category.name"></app-autocomplete>
              </div>
              @if (shouldShowObjectIds(newMessage.staticMessageType)) {
                <div>
                  <label class="label">Object IDs</label>
                  <app-multi-select-autocomplete [items]="objectOptions" [selectedItems]="selectedCreateObjectOptions" (selectedItemsChange)="onCreateObjectOptionsSelected($event)" displayKey="name" valueKey="id" placeholder="Search objects..." nullLabel="No objects selected"></app-multi-select-autocomplete>
                </div>
              }
              <div>
                <label class="label">Embed Override</label>
                <textarea [(ngModel)]="newMessage.embedOverride" (ngModelChange)="validateCreateEmbedOverride()" rows="6" class="input font-mono text-sm"></textarea>
                @if (createEmbedOverrideError) {
                  <small class="text-red-400">{{ createEmbedOverrideError }}</small>
                }
              </div>
              <label class="flex items-center cursor-pointer">
                <input [(ngModel)]="newMessage.active" type="checkbox" class="mr-2" />
                <span class="text-gray-300">Active</span>
              </label>
            </div>
            <div class="flex gap-3 mt-6">
              <button (click)="closeCreateModal()" class="btn btn-secondary flex-1">Cancel</button>
              <button (click)="createStaticMessage()" class="btn btn-primary flex-1" [disabled]="!newMessage.channelId || isCreating || !!createEmbedOverrideError">{{ isCreating ? 'Creating...' : 'Create' }}</button>
            </div>
            @if (createError) {
              <p class="text-red-400 text-sm mt-4">{{ createError }}</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class StaticMessageListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private staticMessageService = inject(StaticMessageControllerService);
  private discordChannelService = inject(DiscordChannelControllerService);
  private ticketPanelService = inject(TicketPanelControllerService);
  private carryTypeService = inject(CarryTypeControllerService);
  private carryTierService = inject(CarryTierControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  staticMessages: StaticMessageWithActive[] = [];
  discordChannels: DiscordChannelModel[] = [];
  objectOptions: StaticMessageObjectOption[] = [];
  private ticketPanelNameById = new Map<string, string>();
  private carryTypeNameById = new Map<string, string>();
  private carryTierNameById = new Map<string, string>();
  loading = true;
  loadError: string | null = null;
  showCreateModal = false;
  isCreating = false;
  createError: string | null = null;
  createEmbedOverrideError: string | null = null;
  selectedCreateChannel: DiscordChannelModel | null = null;
  selectedCreateObjectOptions: StaticMessageObjectOption[] = [];
  staticMessageTypes = STATIC_MESSAGE_TYPES;
  newMessage = {
    channelId: '',
    staticMessageType: 'ScoreLeaderboard' as StaticMessageType,
    objectIds: [] as string[],
    embedOverride: '',
    active: true
  };

  ngOnInit(): void {
    this.serverId = this.route.snapshot.params['serverId'];
    this.loadChannels();
    this.loadObjectNameMaps();
    this.loadStaticMessages();
  }

  getTypeLabel(type: StaticMessageType): string {
    return getStaticMessageTypeLabel(type);
  }

  loadStaticMessages(): void {
    this.loading = true;
    this.loadError = null;
    this.staticMessageService.findStaticMessages(this.serverId).subscribe({
      next: messages => {
        this.staticMessages = messages || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadError = 'Failed to load static messages. Please try again.';
        console.error('Error loading static messages:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadChannels(): void {
    this.discordChannelService.getAllChannels(this.serverId, false).subscribe({
      next: channels => {
        this.discordChannels = channels || [];
        this.cdr.detectChanges();
      },
      error: err => console.error('Failed to load Discord channels:', err)
    });
  }

  getChannelName(channelId: string): string {
    return this.discordChannels.find(channel => channel.id === channelId)?.name || 'Unknown channel';
  }

  getObjectOptionLabel(type: StaticMessageType): string {
    return getObjectOptionTypeLabel(type) || 'Object';
  }

  getObjectNames(message: StaticMessageModel): string[] {
    if (!supportsObjectIds(message.staticMessageType)) return [];

    const nameMap = message.staticMessageType === 'TicketPanel'
      ? this.ticketPanelNameById
      : message.staticMessageType === 'ScoreLeaderboard'
        ? this.carryTypeNameById
        : this.carryTierNameById;

    return (message.objectIds || []).map(id => nameMap.get(id) || id);
  }

  loadObjectNameMaps(): void {
    this.ticketPanelService.getAllTicketPanels(this.serverId).subscribe({
      next: panels => {
        this.ticketPanelNameById = new Map((panels || []).map(panel => [panel.id, toTicketPanelOption(panel).name]));
        this.cdr.detectChanges();
      }
    });

    this.carryTypeService.getAllCarryTypes(this.serverId).subscribe({
      next: carryTypes => {
        const carryTypeOptions = (carryTypes || []).map(toCarryTypeOption);
        this.carryTypeNameById = new Map(carryTypeOptions.map(option => [option.id, option.name]));
        this.cdr.detectChanges();

        const tierRequests = (carryTypes || []).map(carryType => this.carryTierService.getAllCarryTiers(this.serverId, carryType.id));
        (tierRequests.length ? forkJoin(tierRequests) : of([])).subscribe({
          next: carryTierGroups => {
            const carryTierOptions = carryTierGroups.flat().map(toCarryTierOption);
            this.carryTierNameById = new Map(carryTierOptions.map(option => [option.id, option.name]));
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  getDiscordMessageUrl(message: StaticMessageModel): string {
    return `https://discord.com/channels/${this.serverId}/${message.channelId}/${message.messageId}`;
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.loadObjectOptions(this.newMessage.staticMessageType);
  }

  onCreateTypeChange(type: StaticMessageType): void {
    this.selectedCreateObjectOptions = [];
    this.newMessage.objectIds = [];
    this.loadObjectOptions(type);
  }

  shouldShowObjectIds(type: StaticMessageType): boolean {
    return supportsObjectIds(type);
  }

  loadObjectOptions(type: StaticMessageType): void {
    this.objectOptions = [];
    if (type === 'TicketPanel') {
      this.ticketPanelService.getAllTicketPanels(this.serverId).subscribe({next: panels => this.objectOptions = (panels || []).map(toTicketPanelOption)});
    } else if (type === 'ScoreLeaderboard') {
      this.carryTypeService.getAllCarryTypes(this.serverId).subscribe({next: carryTypes => this.objectOptions = (carryTypes || []).map(toCarryTypeOption)});
    } else if (type === 'PriceMessage') {
      this.carryTypeService.getAllCarryTypes(this.serverId).subscribe({
        next: carryTypes => {
          const tierRequests = (carryTypes || []).map(carryType => this.carryTierService.getAllCarryTiers(this.serverId, carryType.id));
          (tierRequests.length ? forkJoin(tierRequests) : of([])).subscribe({
            next: carryTierGroups => this.objectOptions = carryTierGroups.flat().map(toCarryTierOption)
          });
        }
      });
    }
  }

  onCreateChannelSelected(channel: DiscordChannelModel | null): void {
    this.selectedCreateChannel = channel;
    this.newMessage.channelId = channel?.id || '';
  }

  onCreateObjectOptionsSelected(options: StaticMessageObjectOption[]): void {
    this.selectedCreateObjectOptions = options;
    this.newMessage.objectIds = options.map(option => option.id);
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createError = null;
    this.createEmbedOverrideError = null;
    this.selectedCreateChannel = null;
    this.selectedCreateObjectOptions = [];
    this.newMessage = {channelId: '', staticMessageType: 'ScoreLeaderboard', objectIds: [], embedOverride: '', active: true};
  }

  validateCreateEmbedOverride(): void {
    this.createEmbedOverrideError = this.getJsonValidationError(this.newMessage.embedOverride);
  }

  private getJsonValidationError(value: string): string | null {
    if (!value.trim()) return null;
    try {
      JSON.parse(value);
      return null;
    } catch {
      return 'Invalid JSON format';
    }
  }

  createStaticMessage(): void {
    this.validateCreateEmbedOverride();
    if (!this.newMessage.channelId || this.isCreating || this.createEmbedOverrideError) return;
    this.isCreating = true;
    this.createError = null;

    const embedOverride = this.newMessage.embedOverride.trim();
    const creationModel: StaticMessageCreationWithActive = {
      channelId: this.newMessage.channelId,
      staticMessageType: this.newMessage.staticMessageType,
      objectIds: supportsObjectIds(this.newMessage.staticMessageType) ? this.newMessage.objectIds : [],
      embedOverride: embedOverride || undefined,
      active: this.newMessage.active
    };

    this.staticMessageService.createStaticMessage(this.serverId, creationModel).subscribe({
      next: () => {
        this.isCreating = false;
        this.showCreateModal = false;
        this.selectedCreateChannel = null;
        this.selectedCreateObjectOptions = [];
        this.newMessage = {channelId: '', staticMessageType: 'ScoreLeaderboard', objectIds: [], embedOverride: '', active: true};
        this.loadStaticMessages();
      },
      error: err => {
        this.createError = 'Failed to create static message. Please try again.';
        console.error('Error creating static message:', err);
        this.isCreating = false;
        this.cdr.detectChanges();
      }
    });
  }
}
