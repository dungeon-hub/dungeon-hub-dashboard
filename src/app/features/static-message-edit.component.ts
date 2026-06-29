import {ChangeDetectorRef, Component, OnInit, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {
  DiscordChannelControllerService,
  DiscordChannelModel,
  StaticMessageControllerService,
  StaticMessageModel,
  StaticMessageUpdateModel
} from '@dungeon-hub/api-client';
import {AutocompleteComponent} from '../shared/components/autocomplete/autocomplete.component';

type StaticMessageWithActive = StaticMessageModel & { active?: boolean };
type StaticMessageUpdateWithActive = StaticMessageUpdateModel & { active?: boolean };

@Component({
  selector: 'app-static-message-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AutocompleteComponent],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-5xl">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId, 'static-messages']" class="btn btn-secondary mb-4 inline-block">
          ← Back to Static Messages
        </a>
        <h2 class="text-3xl font-bold holographic">Edit Static Message #{{ staticMessageId }}</h2>
      </div>

      @if (loadError) {
        <div class="card bg-red-900/20 border-red-500 mb-8">
          <p class="text-red-400">{{ loadError }}</p>
        </div>
      }

      @if (saveSuccess) {
        <div class="card bg-green-900/20 border-green-500 mb-8">
          <p class="text-green-400">Static message saved successfully.</p>
        </div>
      }

      @if (loading) {
        <div class="card text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p class="mt-4 text-gray-400">Loading...</p>
        </div>
      }

      @if (!loading && form) {
        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-6">
          <div class="card">
            <h3 class="text-xl font-semibold mb-4">Static Message Settings</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="label">Type</label>
                <input [value]="message?.staticMessageType" class="input" disabled />
              </div>
              <div>
                <label class="label">Message ID</label>
                <input formControlName="messageId" type="text" class="input" />
              </div>
              <div class="md:col-span-2">
                <label class="label">Channel</label>
                <app-autocomplete
                  [items]="discordChannels"
                  displayKey="name"
                  valueKey="id"
                  placeholder="Search channels..."
                  [selectedItem]="selectedChannel"
                  (selectedItemChange)="onChannelSelected($event)"
                  nullLabel="Select a channel"
                  groupByKey="category.id"
                  groupDisplayKey="category.name"
                ></app-autocomplete>
                @if (!selectedChannel && form.get('channelId')?.touched) {
                  <small class="text-red-400">Channel is required</small>
                }
              </div>
              <div class="md:col-span-2">
                <label class="label">Channel ID</label>
                <input formControlName="channelId" type="text" class="input" />
                <small class="text-gray-400">The API client exposes this as <code>channelId</code>.</small>
              </div>
              <div class="flex items-center">
                <label class="flex items-center cursor-pointer">
                  <input formControlName="active" type="checkbox" class="mr-2" />
                  <span class="text-gray-300">Active</span>
                </label>
              </div>
            </div>
          </div>

          <div class="card">
            <h3 class="text-xl font-semibold mb-4">Embed Override</h3>
            <textarea formControlName="embedOverride" rows="12" class="input font-mono text-sm"></textarea>
            <div class="mt-3 flex items-center">
              <label class="flex items-center cursor-pointer">
                <input formControlName="resetEmbedOverride" type="checkbox" class="mr-2" />
                <span class="text-gray-300">Reset embed override</span>
              </label>
            </div>
          </div>

          <div class="card">
            <h3 class="text-xl font-semibold mb-4">Object IDs</h3>
            <textarea formControlName="objectIds" rows="4" class="input font-mono text-sm"></textarea>
            <small class="text-gray-400">One object ID per line.</small>
          </div>

          <div class="flex gap-4">
            <button type="submit" class="btn btn-primary" [disabled]="saving || form.invalid">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
            <a [routerLink]="['/server', serverId, 'static-messages']" class="btn btn-secondary">Cancel</a>
          </div>

          @if (saveError) {
            <p class="text-red-400">{{ saveError }}</p>
          }
        </form>
      }
    </div>
  `
})
export class StaticMessageEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private staticMessageService = inject(StaticMessageControllerService);
  private discordChannelService = inject(DiscordChannelControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  staticMessageId!: string;
  message: StaticMessageWithActive | null = null;
  discordChannels: DiscordChannelModel[] = [];
  selectedChannel: DiscordChannelModel | null = null;
  loading = true;
  saving = false;
  loadError: string | null = null;
  saveError: string | null = null;
  saveSuccess = false;

  form = this.fb.group({
    channelId: ['', Validators.required],
    messageId: [''],
    active: [true],
    embedOverride: [''],
    resetEmbedOverride: [false],
    objectIds: ['']
  });

  ngOnInit(): void {
    this.serverId = this.route.snapshot.params['serverId'];
    this.staticMessageId = this.route.snapshot.params['staticMessageId'];
    this.form.get('channelId')?.valueChanges.subscribe(channelId => {
      this.selectedChannel = this.discordChannels.find(channel => channel.id === channelId) || null;
    });
    this.loadChannels();
    this.loadMessage();
  }

  loadChannels(): void {
    this.discordChannelService.getAllChannels(this.serverId, false).subscribe({
      next: channels => {
        this.discordChannels = channels || [];
        this.selectedChannel = this.discordChannels.find(channel => channel.id === this.form.value.channelId) || null;
        this.cdr.detectChanges();
      },
      error: err => console.error('Failed to load Discord channels:', err)
    });
  }

  loadMessage(): void {
    this.loading = true;
    this.loadError = null;
    this.staticMessageService.getById2(this.serverId, this.staticMessageId).subscribe({
      next: message => {
        this.message = message;
        this.form.patchValue({
          channelId: message.channelId,
          messageId: message.messageId || '',
          active: (message as StaticMessageWithActive).active ?? true,
          embedOverride: message.embedOverride || '',
          resetEmbedOverride: false,
          objectIds: (message.objectIds || []).join('\n')
        });
        this.selectedChannel = this.discordChannels.find(channel => channel.id === message.channelId) || null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.loadError = 'Failed to load static message. Please try again.';
        console.error('Error loading static message:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onChannelSelected(channel: DiscordChannelModel | null): void {
    this.selectedChannel = channel;
    this.form.patchValue({channelId: channel?.id || ''});
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.saveError = null;
    this.saveSuccess = false;

    const value = this.form.value;
    const updateModel: StaticMessageUpdateWithActive = {
      channelId: this.selectedChannel?.id || value.channelId || undefined,
      messageId: value.messageId || undefined,
      active: value.active ?? true,
      embedOverride: value.embedOverride || undefined,
      resetEmbedOverride: value.resetEmbedOverride ?? false,
      objectIds: (value.objectIds || '').split('\n').map(id => id.trim()).filter(Boolean)
    };

    this.staticMessageService.updateStaticMessage(this.serverId, this.staticMessageId, updateModel).subscribe({
      next: message => {
        this.message = message;
        this.saving = false;
        this.saveSuccess = true;
        this.cdr.detectChanges();
      },
      error: err => {
        this.saveError = 'Failed to save static message. Please try again.';
        console.error('Error saving static message:', err);
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}
