import {ChangeDetectorRef, Component, OnInit, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {
  DiscordChannelControllerService,
  DiscordChannelModel,
  StaticMessageControllerService,
  StaticMessageCreationModel,
  StaticMessageModel
} from '@dungeon-hub/api-client';
import {AutocompleteComponent} from '../shared/components/autocomplete/autocomplete.component';

type StaticMessageWithActive = StaticMessageModel & { active?: boolean };
type StaticMessageType = StaticMessageCreationModel.StaticMessageTypeEnum;
type StaticMessageCreationWithActive = StaticMessageCreationModel & { active?: boolean };

@Component({
  selector: 'app-static-message-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AutocompleteComponent],
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
          <button (click)="showCreateModal = true" class="btn btn-primary">＋ New Static Message</button>
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
              <a [routerLink]="['/server', serverId, 'static-message', message.id]" class="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group">
                <div class="flex justify-between items-center gap-4">
                  <div class="flex-1">
                    <div class="flex flex-wrap items-center gap-3">
                      <span class="text-lg font-semibold group-hover:text-blue-400 transition-colors">{{ message.staticMessageType }}</span>
                      <span class="text-sm text-gray-400">#{{ message.id }}</span>
                      <span class="text-xs px-2 py-1 rounded" [class.bg-green-900]="message.active !== false" [class.text-green-300]="message.active !== false" [class.bg-red-900]="message.active === false" [class.text-red-300]="message.active === false">
                        {{ message.active === false ? 'Inactive' : 'Active' }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-400 mt-1">Channel: {{ getChannelName(message.channelId) }} ({{ message.channelId }})</p>
                    @if (message.messageId) {
                      <p class="text-sm text-gray-400">Message: {{ message.messageId }}</p>
                    }
                  </div>
                  <span class="text-gray-400">→</span>
                </div>
              </a>
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
                <select [(ngModel)]="newMessage.staticMessageType" class="input">
                  @for (type of staticMessageTypes; track type) {
                    <option [value]="type">{{ type }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label">Channel *</label>
                <app-autocomplete [items]="discordChannels" displayKey="name" valueKey="id" placeholder="Search channels..." [selectedItem]="selectedCreateChannel" (selectedItemChange)="onCreateChannelSelected($event)" nullLabel="Select a channel" groupByKey="category.id" groupDisplayKey="category.name"></app-autocomplete>
              </div>
              <div>
                <label class="label">Message ID</label>
                <input [(ngModel)]="newMessage.messageId" type="text" class="input" />
              </div>
              <div>
                <label class="label">Object IDs</label>
                <textarea [(ngModel)]="newMessage.objectIds" rows="3" class="input font-mono text-sm"></textarea>
                <small class="text-gray-400">One object ID per line.</small>
              </div>
              <div>
                <label class="label">Embed Override</label>
                <textarea [(ngModel)]="newMessage.embedOverride" rows="6" class="input font-mono text-sm"></textarea>
              </div>
              <label class="flex items-center cursor-pointer">
                <input [(ngModel)]="newMessage.active" type="checkbox" class="mr-2" />
                <span class="text-gray-300">Active</span>
              </label>
            </div>
            <div class="flex gap-3 mt-6">
              <button (click)="closeCreateModal()" class="btn btn-secondary flex-1">Cancel</button>
              <button (click)="createStaticMessage()" class="btn btn-primary flex-1" [disabled]="!newMessage.channelId || isCreating">{{ isCreating ? 'Creating...' : 'Create' }}</button>
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
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  staticMessages: StaticMessageWithActive[] = [];
  discordChannels: DiscordChannelModel[] = [];
  loading = true;
  loadError: string | null = null;
  showCreateModal = false;
  isCreating = false;
  createError: string | null = null;
  selectedCreateChannel: DiscordChannelModel | null = null;
  staticMessageTypes: StaticMessageType[] = ['ScoreLeaderboard', 'TotalLeaderboard', 'ReputationLeaderboard', 'TicketPanel', 'PriceMessage'];
  newMessage = {
    channelId: '',
    messageId: '',
    staticMessageType: 'ScoreLeaderboard' as StaticMessageType,
    objectIds: '',
    embedOverride: '',
    active: true
  };

  ngOnInit(): void {
    this.serverId = this.route.snapshot.params['serverId'];
    this.loadChannels();
    this.loadStaticMessages();
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

  onCreateChannelSelected(channel: DiscordChannelModel | null): void {
    this.selectedCreateChannel = channel;
    this.newMessage.channelId = channel?.id || '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createError = null;
  }

  createStaticMessage(): void {
    if (!this.newMessage.channelId || this.isCreating) return;
    this.isCreating = true;
    this.createError = null;

    const creationModel: StaticMessageCreationWithActive = {
      channelId: this.newMessage.channelId,
      messageId: this.newMessage.messageId || undefined,
      staticMessageType: this.newMessage.staticMessageType,
      objectIds: this.newMessage.objectIds.split('\n').map(id => id.trim()).filter(Boolean),
      embedOverride: this.newMessage.embedOverride || undefined,
      active: this.newMessage.active
    };

    this.staticMessageService.createStaticMessage(this.serverId, creationModel).subscribe({
      next: () => {
        this.isCreating = false;
        this.showCreateModal = false;
        this.selectedCreateChannel = null;
        this.newMessage = {channelId: '', messageId: '', staticMessageType: 'ScoreLeaderboard', objectIds: '', embedOverride: '', active: true};
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
