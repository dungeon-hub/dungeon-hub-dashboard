import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TicketPanelControllerService, TicketPanelUpdateModel, CarryDifficultyControllerService, CarryTierModel, CarryDifficultyModel, DiscordServerControllerService } from '@dungeon-hub/api-client';

@Component({
  selector: 'app-ticket-panel-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-6xl">
      <!-- Header -->
      <div class="mb-8">
        <a [routerLink]="['/server', serverId]" class="btn btn-secondary mb-4 inline-block">
          ← Back to Server
        </a>
        <h2
          class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"
        >
          Edit Ticket Panel: {{ panel?.displayName || panel?.name }} #{{ panel?.id }}
        </h2>
      </div>

      <!-- Loading State -->
      @if (loading) {
        <div class="card text-center py-12">
          <div
            class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
          ></div>
          <p class="mt-4 text-gray-400">Loading...</p>
        </div>
      }

      <!-- Form -->
      @if (!loading && form) {
        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-6">
        <!-- General Settings -->
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">General Settings</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="label">Internal Name *</label>
              <input formControlName="name" type="text" class="input" />
            </div>
            <div>
              <label class="label">Display Name</label>
              <input
            formControlName="displayName"
                type="text"
                class="input"
                placeholder="Visible on button"
              />
            </div>
            <div>
              <label class="label">Button Emoji</label>
              <input formControlName="emoji" type="text" class="input" />
            </div>
            <div class="flex items-center">
              <label class="flex items-center cursor-pointer">
                <input formControlName="requiresLinking" type="checkbox" class="mr-2" />
                <span class="text-gray-300">Require Linked Account</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Ticket Logic -->
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">Ticket Logic</h3>
          <div class="space-y-3">
            <label class="flex items-center cursor-pointer">
              <input formControlName="claimable" type="checkbox" class="mr-2" />
              <span class="text-gray-300">Enable claiming tickets</span>
            </label>
            <label class="flex items-center cursor-pointer">
              <input formControlName="closeable" type="checkbox" class="mr-2" />
              <span class="text-gray-300">Enable closing tickets</span>
            </label>
            <small class="text-gray-400 block ml-6"
              >Tickets are instantly deleted if user tries to close</small
            >
            <label class="flex items-center cursor-pointer">
              <input formControlName="closeConfirmation" type="checkbox" class="mr-2" />
              <span class="text-gray-300">Ask for close confirmation</span>
            </label>
          </div>

          <div class="mt-6 space-y-4">
            <div>
              <label class="label">Ticket Message Content</label>
              <textarea formControlName="ticketMessageContent" rows="3" class="input"></textarea>
              <small class="text-gray-400">Message sent when ticket is created</small>
            </div>
            <div>
              <label class="label">Ticket Message Embeds (JSON)</label>
              <textarea
                formControlName="ticketMessageEmbeds"
                rows="4"
                class="input font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label class="label">Additional Buttons (JSON)</label>
              <textarea
                formControlName="ticketMessageButtons"
                rows="4"
                class="input font-mono text-sm"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Channel Naming -->
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">Channel Naming</h3>
          <div class="space-y-4">
            <div>
              <label class="label">Open Channel Pattern</label>
              <input formControlName="openChannelName" type="text" class="input" />
            </div>
            <div>
              <label class="label">Claimed Channel Pattern</label>
              <input formControlName="claimedChannelName" type="text" class="input" />
            </div>
            <div>
              <label class="label">Closed Channel Pattern</label>
              <input formControlName="closedChannelName" type="text" class="input" />
            </div>
          </div>
        </div>

        <!-- Transcripts -->
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">Transcripts</h3>
          <div class="space-y-4">
            <div>
              <label class="label">Transcript Channel ID</label>
              <input formControlName="transcriptChannel" type="text" class="input" />
              <small class="text-gray-400"
                >If left blank, the property TRANSCRIPTS_CHANNEL from /config will be used</small
              >
            </div>
            <div>
              <label class="label">DM Transcript Embed (JSON)</label>
              <textarea
                formControlName="userTranscriptDm"
                rows="4"
                class="input font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label class="label">Close Transcript Target</label>
              <select formControlName="closeTranscriptTarget" class="input">
                <option value="None">None</option>
                <option value="User">User</option>
                <option value="TranscriptChannel">TranscriptChannel</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label class="label">Delete Transcript Target</label>
              <select formControlName="deleteTranscriptTarget" class="input">
                <option value="None">None</option>
                <option value="User">User</option>
                <option value="TranscriptChannel">TranscriptChannel</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Roles & Categories -->
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">Roles & Categories</h3>
          <div class="space-y-4">
            <div>
              <label class="label">Support Roles (Comma-separated IDs)</label>
              <input formControlName="supportRoles" type="text" class="input" />
            </div>
            <div>
              <label class="label">Additional Roles (Comma-separated IDs)</label>
              <input formControlName="additionalRoles" type="text" class="input" />
            </div>
            <div>
              <label class="label">Open Categories (Comma-separated IDs)</label>
              <input formControlName="openCategories" type="text" class="input" />
            </div>
            <div>
              <label class="label">Closed Categories (Comma-separated IDs)</label>
              <input formControlName="closedCategories" type="text" class="input" />
            </div>
          </div>
        </div>

        <!-- Carry Integration -->
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">Carry Integration</h3>
          <div class="space-y-4">
            <div>
              <label class="label">Related Carry Tier</label>
              <select
                formControlName="relatedCarryTier"
                class="input"
                (change)="onCarryTierChange()"
              >
                <option [ngValue]="null">None</option>
                @for (tier of carryTiers; track tier.id) {
                  <option [value]="tier.id">
                    {{ tier.carryType.displayName || tier.carryType.identifier }} -
                    {{ tier.displayName || tier.identifier }}
                  </option>
                }
              </select>
            </div>
            @if (form.get('relatedCarryTier')?.value) {
              <div>
                <label class="label">Related Carry Difficulty</label>
                <select formControlName="relatedCarryDifficulty" class="input">
                  <option [ngValue]="null">None</option>
                  @for (difficulty of carryDifficulties; track difficulty.id) {
                    <option [value]="difficulty.id">
                      {{ difficulty.displayName || difficulty.identifier }}
                    </option>
                  }
                </select>
              </div>
            }
          </div>
        </div>

        <!-- Ticket Form -->
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">Ticket Form</h3>
          <div>
            <label class="label">Form Questions (JSON)</label>
            <textarea
              formControlName="formQuestions"
              rows="10"
              class="input font-mono text-sm"
            ></textarea>
          </div>
        </div>

        <!-- Sticky Save Button -->
        <div class="sticky bottom-4 right-4 flex justify-end">
          <button
            type="submit"
            [disabled]="!form.valid || saving"
            class="btn btn-primary shadow-lg"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
        </form>
      }
    </div>
  `,
})
export class TicketPanelEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ticketPanelService = inject(TicketPanelControllerService);
  private discordServerService = inject(DiscordServerControllerService);
  private carryDifficultyService = inject(CarryDifficultyControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  panelId!: string;
  panel: any;
  form!: FormGroup;
  loading = true;
  saving = false;

  carryTiers: CarryTierModel[] = [];
  carryDifficulties: CarryDifficultyModel[] = [];

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.panelId = this.route.snapshot.params['panelId'];

    this.initForm();
    this.loadAllCarryTiers();
    this.loadPanel();
  }

  initForm() {
    this.form = this.fb.group({
      name: [''],
      displayName: [''],
      emoji: [''],
      requiresLinking: [false],
      claimable: [false],
      closeable: [false],
      closeConfirmation: [false],
      ticketMessageContent: [''],
      ticketMessageEmbeds: [''],
      ticketMessageButtons: [''],
      openChannelName: [''],
      claimedChannelName: [''],
      closedChannelName: [''],
      transcriptChannel: [''],
      userTranscriptDm: [''],
      closeTranscriptTarget: ['None'],
      deleteTranscriptTarget: ['None'],
      supportRoles: [''],
      additionalRoles: [''],
      openCategories: [''],
      closedCategories: [''],
      relatedCarryTier: [null],
      relatedCarryDifficulty: [null],
      formQuestions: [''],
    });
  }

  loadPanel() {
    this.ticketPanelService.getById1(this.serverId, this.panelId).subscribe({
      next: (panel) => {
        this.panel = panel;
        this.populateForm(panel);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  populateForm(panel: any) {
    // Parse ticket message JSON
    let ticketMessage: any = {};
    try {
      ticketMessage = JSON.parse(panel.ticketMessage || '{}');
    } catch (e) {}

    this.form.patchValue({
      name: panel.name,
      displayName: panel.displayName || '',
      emoji: panel.emoji || '',
      requiresLinking: panel.requiresLinking || false,
      claimable: panel.claimable || false,
      closeable: panel.closeable || false,
      closeConfirmation: panel.closeConfirmation || false,
      ticketMessageContent: ticketMessage.content || '',
      ticketMessageEmbeds: ticketMessage.embeds
        ? JSON.stringify(ticketMessage.embeds, null, 2)
        : '',
      ticketMessageButtons: ticketMessage['additional-buttons']
        ? JSON.stringify(ticketMessage['additional-buttons'], null, 2)
        : '',
      openChannelName: panel.openChannelName || '',
      claimedChannelName: panel.claimedChannelName || '',
      closedChannelName: panel.closedChannelName || '',
      transcriptChannel: panel.transcriptChannel?.id?.toString() || '',
      userTranscriptDm: panel.userTranscriptDm || '',
      closeTranscriptTarget: panel.closeTranscriptTarget || 'None',
      deleteTranscriptTarget: panel.deleteTranscriptTarget || 'None',
      supportRoles: panel.supportRoles?.map((r: any) => r.id?.toString()).join(', ') || '',
      additionalRoles: panel.additionalRoles?.map((r: any) => r.id?.toString()).join(', ') || '',
      openCategories: panel.openCategories?.map((id: any) => id?.toString()).join(', ') || '',
      closedCategories: panel.closedCategories?.map((id: any) => id?.toString()).join(', ') || '',
      relatedCarryTier: panel.relatedCarryTier?.id || null,
      relatedCarryDifficulty: panel.relatedCarryDifficulty?.id || null,
      formQuestions: panel.formQuestions ? JSON.stringify(panel.formQuestions, null, 2) : '',
    });

    // Load carry difficulties if carry tier is selected
    if (panel.relatedCarryTier) {
      this.loadCarryDifficulties(
        panel.relatedCarryTier.carryType.id,
        panel.relatedCarryTier.id,
      );
    }
  }

  loadAllCarryTiers() {
    this.discordServerService.getAllCarryTiers1(this.serverId).subscribe({
      next: (tiers) => {
        this.carryTiers = tiers.flat().filter((t) => t !== undefined) as CarryTierModel[];
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  onCarryTierChange() {
    const tierId = this.form.get('relatedCarryTier')?.value;
    this.form.patchValue({ relatedCarryDifficulty: null });
    this.carryDifficulties = [];

    if (tierId) {
      const tier = this.carryTiers.find((t) => t.id.toString() === tierId);
      if (tier) {
        this.loadCarryDifficulties(tier.carryType.id, tier.id);
      }
    }
    this.cdr.detectChanges();
  }

  loadCarryDifficulties(carryTypeId: string, carryTierId: string) {
    this.carryDifficultyService
      .getAllCarryDifficulties(this.serverId, carryTypeId, carryTierId)
      .subscribe({
        next: (difficulties) => {
          this.carryDifficulties = difficulties;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        },
      });
  }

  save() {
    if (!this.form.valid || this.saving) return;

    this.saving = true;
    const formValue = this.form.value;

    // Build ticket message JSON
    const ticketMessage: any = {
      content: formValue.ticketMessageContent || null,
    };

    try {
      if (formValue.ticketMessageEmbeds) {
        ticketMessage.embeds = JSON.parse(formValue.ticketMessageEmbeds);
      }
    } catch (e) {
      this.form.get('ticketMessageEmbeds')?.setErrors({ invalidJson: 'Invalid JSON format' });
      this.saving = false;
      return;
    }

    try {
      if (formValue.ticketMessageButtons) {
        ticketMessage['additional-buttons'] = JSON.parse(formValue.ticketMessageButtons);
      }
    } catch (e) {
      this.form.get('ticketMessageButtons')?.setErrors({ invalidJson: 'Invalid JSON format' });
      this.saving = false;
      return;
    }

    // Parse form questions
    let formQuestions: any = undefined;
    try {
      if (formValue.formQuestions) {
        formQuestions = JSON.parse(formValue.formQuestions);
      }
    } catch (e) {
      this.form.get('formQuestions')?.setErrors({ invalidJson: 'Invalid JSON format' });
      this.saving = false;
      return;
    }

    // Helper to check if a field was cleared (had value before, now empty)
    const wasCleared = (currentValue: any, formValue: any) => {
      return currentValue != null && (formValue == null || formValue === '');
    };

    const updateModel: TicketPanelUpdateModel = {
      name: formValue.name ?? null,
      displayName: formValue.displayName || null,
      resetDisplayName: wasCleared(this.panel.displayName, formValue.displayName),
      emoji: formValue.emoji || null,
      resetEmoji: wasCleared(this.panel.emoji, formValue.emoji),
      requiresLinking: formValue.requiresLinking ?? null,
      claimable: formValue.claimable ?? null,
      closeable: formValue.closeable ?? null,
      closeConfirmation: formValue.closeConfirmation ?? null,
      ticketMessage: JSON.stringify(ticketMessage),
      resetTicketMessage: false,
      openChannelName: formValue.openChannelName || null,
      resetOpenChannelName: wasCleared(this.panel.openChannelName, formValue.openChannelName),
      claimedChannelName: formValue.claimedChannelName || null,
      resetClaimedChannelName: wasCleared(this.panel.claimedChannelName, formValue.claimedChannelName),
      closedChannelName: formValue.closedChannelName || null,
      resetClosedChannelName: wasCleared(this.panel.closedChannelName, formValue.closedChannelName),
      transcriptChannel: formValue.transcriptChannel || null,
      resetTranscriptChannel: wasCleared(this.panel.transcriptChannel?.id?.toString(), formValue.transcriptChannel),
      userTranscriptDm: formValue.userTranscriptDm || null,
      resetUserTranscriptDm: wasCleared(this.panel.userTranscriptDm, formValue.userTranscriptDm),
      closeTranscriptTarget: formValue.closeTranscriptTarget ?? null,
      deleteTranscriptTarget: formValue.deleteTranscriptTarget ?? null,
      supportRoles: this.parseIdListOrEmpty(formValue.supportRoles, this.panel.supportRoles),
      additionalRoles: this.parseIdListOrEmpty(formValue.additionalRoles, this.panel.additionalRoles),
      openCategories: this.parseIdListOrEmpty(formValue.openCategories, this.panel.openCategories),
      closedCategories: this.parseIdListOrEmpty(formValue.closedCategories, this.panel.closedCategories),
      relatedCarryTier: formValue.relatedCarryTier || null,
      resetRelatedCarryTier: wasCleared(this.panel.relatedCarryTier?.id, formValue.relatedCarryTier),
      relatedCarryDifficulty: formValue.relatedCarryDifficulty || null,
      resetRelatedCarryDifficulty: wasCleared(this.panel.relatedCarryDifficulty?.id, formValue.relatedCarryDifficulty),
      formQuestions: formQuestions ?? null,
      permissions: undefined,
    };

    this.ticketPanelService.updateTicketPanel(this.serverId, this.panelId, updateModel).subscribe({
      next: (updated) => {
        this.panel = updated;
        this.saving = false;
        this.cdr.detectChanges();
        this.router.navigate(['/server', this.serverId]);
      },
      error: () => {
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  private parseIdList(value: string): string[] | null {
    if (!value?.trim()) return null;
    return value
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id);
  }

  private parseIdListOrEmpty(value: string, originalValue: any[]): string[] | undefined {
    const parsed = this.parseIdList(value);
    // If field is empty and there were original values, send empty array to clear
    if (parsed === null && originalValue && originalValue.length > 0) {
      return [];
    }
    // If there's a value, send it; if both are empty, send undefined (no change)
    return parsed ?? undefined;
  }
}
