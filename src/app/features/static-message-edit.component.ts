import {ChangeDetectorRef, Component, OnInit, inject} from '@angular/core';
import {forkJoin, of} from 'rxjs';
import {CommonModule} from '@angular/common';
import {AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators} from '@angular/forms';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {
  CarryTierControllerService,
  CarryTypeControllerService,
  DiscordChannelControllerService,
  DiscordChannelModel,
  StaticMessageControllerService,
  StaticMessageModel,
  StaticMessageUpdateModel,
  TicketPanelControllerService
} from '@dungeon-hub/api-client';
import {AutocompleteComponent} from '../shared/components/autocomplete/autocomplete.component';
import {MultiSelectAutocompleteComponent} from '../shared/components/multi-select-autocomplete/multi-select-autocomplete.component';
import {getStaticMessageTypeLabel, StaticMessageType} from './static-message/static-message-labels';
import {
  StaticMessageObjectOption,
  getObjectOptionTypeLabel,
  supportsObjectIds,
  toCarryTierOption,
  toCarryTypeOption,
  toTicketPanelOption
} from './static-message/static-message-object-options';

type StaticMessageWithActive = StaticMessageModel & { active?: boolean };
type StaticMessageUpdateWithActive = StaticMessageUpdateModel & { active?: boolean };

function jsonValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value || !value.trim()) return null;

  try {
    JSON.parse(value);
    return null;
  } catch {
    return {invalidJson: true};
  }
}

@Component({
  selector: 'app-static-message-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AutocompleteComponent, MultiSelectAutocompleteComponent],
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
                <p class="px-3 py-2 bg-gray-800 rounded text-gray-200">{{ message ? getTypeLabel(message.staticMessageType) : 'Unknown' }}</p>
              </div>
              <div>
                <label class="label">Message ID</label>
                <p class="px-3 py-2 bg-gray-800 rounded text-gray-200 break-all">{{ message?.messageId || 'Not sent yet' }}</p>
                @if (message?.messageId) {
                  <a [href]="getDiscordMessageUrl()" target="_blank" rel="noopener noreferrer" class="btn btn-secondary mt-3 inline-block">Jump to Message</a>
                }
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
            @if (form.get('embedOverride')?.hasError('invalidJson') && form.get('embedOverride')?.touched) {
              <small class="text-red-400">Invalid JSON format</small>
            }
            <small class="text-gray-400 block mt-2">Leave empty to reset the embed override.</small>
          </div>

          @if (message && shouldShowObjectIds(message.staticMessageType)) {
            <div class="card">
              <h3 class="text-xl font-semibold mb-4">{{ getObjectOptionLabel(message.staticMessageType) }}</h3>
              <app-multi-select-autocomplete
                [items]="objectOptions"
                [selectedItems]="selectedObjectOptions"
                (selectedItemsChange)="onObjectOptionsSelected($event)"
                displayKey="name"
                valueKey="id"
                placeholder="Search objects..."
                nullLabel="No objects selected"
              ></app-multi-select-autocomplete>
            </div>
          }

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
  private ticketPanelService = inject(TicketPanelControllerService);
  private carryTypeService = inject(CarryTypeControllerService);
  private carryTierService = inject(CarryTierControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  staticMessageId!: string;
  message: StaticMessageWithActive | null = null;
  discordChannels: DiscordChannelModel[] = [];
  objectOptions: StaticMessageObjectOption[] = [];
  selectedChannel: DiscordChannelModel | null = null;
  selectedObjectOptions: StaticMessageObjectOption[] = [];
  loading = true;
  saving = false;
  loadError: string | null = null;
  saveError: string | null = null;
  saveSuccess = false;

  form = this.fb.group({
    channelId: ['', Validators.required],
    active: [true],
    embedOverride: ['', jsonValidator]
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

  getTypeLabel(type: StaticMessageType): string {
    return getStaticMessageTypeLabel(type);
  }

  shouldShowObjectIds(type: StaticMessageType): boolean {
    return supportsObjectIds(type);
  }

  getObjectOptionLabel(type: StaticMessageType): string {
    return getObjectOptionTypeLabel(type) || 'Object';
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
          active: (message as StaticMessageWithActive).active ?? true,
          embedOverride: message.embedOverride || ''
        });
        this.selectedChannel = this.discordChannels.find(channel => channel.id === message.channelId) || null;
        this.loadObjectOptions(message.staticMessageType, message.objectIds || [], () => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: err => {
        this.loadError = 'Failed to load static message. Please try again.';
        console.error('Error loading static message:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadObjectOptions(type: StaticMessageType, selectedIds: string[] = [], onComplete?: () => void): void {
    this.objectOptions = [];
    this.selectedObjectOptions = [];
    if (type === 'TicketPanel') {
      this.ticketPanelService.getAllTicketPanels(this.serverId).subscribe({
        next: panels => { this.setObjectOptions((panels || []).map(toTicketPanelOption), selectedIds); onComplete?.(); },
        error: err => { console.error('Failed to load ticket panels:', err); onComplete?.(); }
      });
    } else if (type === 'ScoreLeaderboard') {
      this.carryTypeService.getAllCarryTypes(this.serverId).subscribe({
        next: carryTypes => { this.setObjectOptions((carryTypes || []).map(toCarryTypeOption), selectedIds); onComplete?.(); },
        error: err => { console.error('Failed to load carry types:', err); onComplete?.(); }
      });
    } else if (type === 'PriceMessage') {
      this.carryTypeService.getAllCarryTypes(this.serverId).subscribe({
        next: carryTypes => {
          const tierRequests = (carryTypes || []).map(carryType => this.carryTierService.getAllCarryTiers(this.serverId, carryType.id));
          (tierRequests.length ? forkJoin(tierRequests) : of([])).subscribe({
            next: carryTierGroups => { this.setObjectOptions(carryTierGroups.flat().map(toCarryTierOption), selectedIds); onComplete?.(); },
            error: err => { console.error('Failed to load carry tiers:', err); onComplete?.(); }
          });
        },
        error: err => { console.error('Failed to load carry types:', err); onComplete?.(); }
      });
    } else {
      onComplete?.();
    }
  }

  setObjectOptions(options: StaticMessageObjectOption[], selectedIds: string[]): void {
    this.objectOptions = options;
    this.selectedObjectOptions = options.filter(option => selectedIds.includes(option.id));
    this.cdr.detectChanges();
  }

  getDiscordMessageUrl(): string {
    return `https://discord.com/channels/${this.serverId}/${this.message?.channelId}/${this.message?.messageId}`;
  }

  onChannelSelected(channel: DiscordChannelModel | null): void {
    this.selectedChannel = channel;
    this.form.patchValue({channelId: channel?.id || ''});
  }

  onObjectOptionsSelected(options: StaticMessageObjectOption[]): void {
    this.selectedObjectOptions = options;
  }

  save(): void {
    if (this.form.invalid || this.saving || !this.message) return;
    this.saving = true;
    this.saveError = null;
    this.saveSuccess = false;

    const value = this.form.value;
    const embedOverride = (value.embedOverride || '').trim();
    const updateModel: StaticMessageUpdateWithActive = {
      channelId: this.selectedChannel?.id || value.channelId || undefined,
      active: value.active ?? true,
      embedOverride: embedOverride || undefined,
      resetEmbedOverride: !embedOverride,
      objectIds: supportsObjectIds(this.message.staticMessageType) ? this.selectedObjectOptions.map(option => option.id) : []
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
