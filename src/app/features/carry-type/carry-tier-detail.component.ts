import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CarryTypeControllerService,
  CarryTierControllerService,
  CarryDifficultyControllerService,
  CarryTypeModel,
  CarryTierModel,
  CarryDifficultyModel,
  CarryDifficultyCreationModel,
  CarryTierUpdateModel
} from '@dungeon-hub/api-client';
import { INGAME_CARRY_TYPE_LABELS, getIngameCarryTypeLabel } from './ingame-carry-type-labels';

@Component({
  selector: 'app-carry-tier-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId, 'carry-type', carryTypeId]" class="btn btn-secondary mb-4 inline-block">
          ← Back to {{ carryType?.displayName || 'Carry Type' }}
        </a>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-3xl font-bold holographic">
              {{ carryTier?.displayName || 'Loading...' }}
            </h2>
            @if (carryTier) {
              <p class="text-gray-400 mt-2">{{ carryTier.identifier }}</p>
            }
          </div>
          @if (carryTier) {
            <div class="flex gap-2">
              <button
                (click)="openEditTierModal()"
                class="btn btn-secondary"
              >
                Edit
              </button>
              <button
                (click)="showDeleteTierModal = true"
                class="btn btn-secondary text-red-400 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          }
        </div>
      </div>

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

      @if (carryTier) {
        <div class="card mb-8">
          <h3 class="text-xl font-semibold mb-4">Carry Tier Details</h3>
          <div class="space-y-2 text-gray-300">
            <p><strong>Display Name:</strong> {{ carryTier.displayName }}</p>
            <p><strong>Identifier:</strong> {{ carryTier.identifier }}</p>
            <p><strong>Category:</strong> {{ carryTier.category || 'None' }}</p>
            @if (carryTier.descriptiveName) {
              <p><strong>Descriptive Name:</strong> {{ carryTier.descriptiveName }}</p>
            }
            @if (carryTier.priceTitle) {
              <p><strong>Price Title:</strong> {{ carryTier.priceTitle }}</p>
            }
            @if (carryTier.priceDescription) {
              <p><strong>Price Description:</strong> {{ carryTier.priceDescription }}</p>
            }
            @if (carryTier.thumbnailUrl) {
              <p><strong>Thumbnail: </strong><a [href]="carryTier.thumbnailUrl" target="_blank" class="text-blue-400 break-all">{{ carryTier.thumbnailUrl }}</a></p>
            }
          </div>
        </div>

        <div class="card">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-semibold">Carry Difficulties</h3>
            <button
              (click)="showCreateModal = true"
              class="btn btn-primary"
            >
              ＋ New Difficulty
            </button>
          </div>

          @if (difficulties.length > 0) {
            <div class="space-y-4">
              @for (difficulty of difficulties; track difficulty.id) {
                <a
                  [routerLink]="['/server', serverId, 'carry-type', carryTypeId, 'carry-tier', carryTierId, 'difficulty', difficulty.id]"
                  class="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
                >
                  <div class="flex justify-between items-center">
                    <div class="flex-1">
                      <div class="flex items-center gap-4">
                        <span class="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                          {{ difficulty.displayName }}
                        </span>
                        <span class="text-sm text-gray-400">{{ difficulty.identifier }}</span>
                      </div>
                      <div class="text-sm text-gray-400 mt-2 space-y-1">
                        <p><strong>Price:</strong> {{ difficulty.price }} Coins</p>
                        <p><strong>Score:</strong> {{ difficulty.score }}</p>
                        @if (difficulty.bulkPrice != null && difficulty.bulkAmount != null) {
                          <p><strong>Bulk:</strong> {{ difficulty.bulkAmount }}x for {{ difficulty.bulkPrice }} Coins</p>
                        }
                        @if (difficulty.priceName) {
                          <p><strong>Alt. Price Name:</strong> {{ difficulty.priceName }}</p>
                        }
                        @if (difficulty.ingameCarryType) {
                          <p><strong>Ingame Type:</strong> {{ getIngameCarryTypeLabel(difficulty.ingameCarryType) }}</p>
                        }
                      </div>
                    </div>
                    <span class="text-gray-400">→</span>
                  </div>
                </a>
              }
            </div>
          }

          @if (difficulties.length === 0 && !loadError) {
            <p class="text-gray-400 text-center py-8">
              No difficulties created yet. Click "New Difficulty" to create one.
            </p>
          }
        </div>
      }

      <!-- Create Modal -->
      @if (showCreateModal) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
          (click)="showCreateModal = false"
        >
          <div class="card max-w-md w-full mx-4 my-8" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Create New Difficulty</h3>

            <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label class="label">Identifier *</label>
                <input
                  [(ngModel)]="newDifficulty.identifier"
                  type="text"
                  class="input"
                  placeholder="e.g. normal"
                  required
                />
                <small class="text-gray-400">Unique identifier (lowercase, underscores)</small>
              </div>

              <div>
                <label class="label">Display Name *</label>
                <input
                  [(ngModel)]="newDifficulty.displayName"
                  type="text"
                  class="input"
                  placeholder="e.g. Normal"
                  required
                />
              </div>

              <div>
                <label class="label">Price *</label>
                <input
                  [(ngModel)]="newDifficulty.price"
                  type="number"
                  class="input"
                  min="0"
                  required
                />
              </div>

              <div>
                <label class="label">Score *</label>
                <input
                  [(ngModel)]="newDifficulty.score"
                  type="number"
                  class="input"
                  min="0"
                  required
                />
              </div>

              <div>
                <label class="label">Bulk Amount</label>
                <input
                  [(ngModel)]="newDifficulty.bulkAmount"
                  type="number"
                  class="input"
                  min="1"
                />
              </div>

              <div>
                <label class="label">Bulk Price</label>
                <input
                  [(ngModel)]="newDifficulty.bulkPrice"
                  type="number"
                  class="input"
                  min="0"
                />
              </div>

              <div>
                <label class="label">Thumbnail URL</label>
                <input
                  [(ngModel)]="newDifficulty.thumbnailUrl"
                  type="text"
                  class="input"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label class="label">Alternative Price Name</label>
                <input
                  [(ngModel)]="newDifficulty.priceName"
                  type="text"
                  class="input"
                  placeholder="e.g. Master Mode 7"
                />
                <small class="text-gray-400">Alternative name that takes priority over the default display name in the static price embed</small>
              </div>

              <div>
                <label class="label">Ingame Carry Type</label>
                <select
                  [(ngModel)]="newDifficulty.ingameCarryType"
                  class="input"
                >
                  <option [ngValue]="null">None</option>
                  @for (option of ingameCarryTypeOptions; track option.value) {
                    <option [ngValue]="option.value">{{ option.label }}</option>
                  }
                </select>
                <small class="text-gray-400">Optional: Select the in-game carry type for Discord bot integration</small>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showCreateModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="createDifficulty()" class="btn btn-primary flex-1" [disabled]="!newDifficulty.identifier || !newDifficulty.displayName || newDifficulty.price === null || newDifficulty.score === null || isCreating">
                {{ isCreating ? 'Creating...' : 'Create' }}
              </button>
            </div>

            @if (createError) {
              <p class="text-red-400 text-sm mt-4">{{ createError }}</p>
            }
          </div>
        </div>
      }

      <!-- Edit Tier Modal -->
      @if (showEditTierModal && carryTier) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
          (click)="showEditTierModal = false"
        >
          <div class="card max-w-md w-full mx-4 my-8" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Edit Carry Tier</h3>

            <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label class="label">Display Name</label>
                <input
                  [(ngModel)]="editTierForm.displayName"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ carryTier.displayName }}</small>
              </div>

              <div>
                <label class="label">Category ID</label>
                <input
                  [(ngModel)]="editTierForm.category"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ carryTier.category || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Descriptive Name</label>
                <input
                  [(ngModel)]="editTierForm.descriptiveName"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ carryTier.descriptiveName || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Thumbnail URL</label>
                <input
                  [(ngModel)]="editTierForm.thumbnailUrl"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ carryTier.thumbnailUrl || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Price Title</label>
                <input
                  [(ngModel)]="editTierForm.priceTitle"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ carryTier.priceTitle || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Price Description</label>
                <textarea
                  [(ngModel)]="editTierForm.priceDescription"
                  class="input"
                  rows="3"
                ></textarea>
                <small class="text-gray-400">Current: {{ carryTier.priceDescription || 'None' }} (clear to remove)</small>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showEditTierModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="updateTier()" class="btn btn-primary flex-1" [disabled]="isUpdatingTier">
                {{ isUpdatingTier ? 'Updating...' : 'Update' }}
              </button>
            </div>

            @if (updateTierError) {
              <p class="text-red-400 text-sm mt-4">{{ updateTierError }}</p>
            }
          </div>
        </div>
      }

      <!-- Delete Tier Modal -->
      @if (showDeleteTierModal && carryTier) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showDeleteTierModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4 text-red-400">Delete Carry Tier</h3>

            <p class="mb-4">Are you sure you want to delete <strong>{{ carryTier.displayName }}</strong>?</p>
            <p class="text-sm text-gray-400 mb-4">This will also delete all associated difficulties.</p>

            <div class="flex gap-3 mt-6">
              <button (click)="showDeleteTierModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="deleteTier()" class="btn btn-primary flex-1 bg-red-600 hover:bg-red-700" [disabled]="isDeletingTier">
                {{ isDeletingTier ? 'Deleting...' : 'Delete' }}
              </button>
            </div>

            @if (deleteTierError) {
              <p class="text-red-400 text-sm mt-4">{{ deleteTierError }}</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CarryTierDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carryTypeService = inject(CarryTypeControllerService);
  private carryTierService = inject(CarryTierControllerService);
  private carryDifficultyService = inject(CarryDifficultyControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  carryTypeId!: string;
  carryTierId!: string;
  carryType: CarryTypeModel | null = null;
  carryTier: CarryTierModel | null = null;
  difficulties: CarryDifficultyModel[] = [];
  loadError: string | null = null;

  showCreateModal = false;
  isCreating = false;
  createError: string | null = null;
  newDifficulty = {
    identifier: '',
    displayName: '',
    price: null as number | null,
    score: null as number | null,
    bulkAmount: null as number | null,
    bulkPrice: null as number | null,
    thumbnailUrl: '',
    priceName: '',
    ingameCarryType: null as CarryDifficultyCreationModel.IngameCarryTypeEnum | null
  };

  get ingameCarryTypeOptions() {
    return Object.entries(INGAME_CARRY_TYPE_LABELS)
      .map(([value, label]) => ({
        value: value as CarryDifficultyCreationModel.IngameCarryTypeEnum,
        label
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  showEditTierModal = false;
  isUpdatingTier = false;
  updateTierError: string | null = null;
  editTierForm = {
    displayName: '',
    category: '',
    descriptiveName: '',
    thumbnailUrl: '',
    priceTitle: '',
    priceDescription: ''
  };

  showDeleteTierModal = false;
  isDeletingTier = false;
  deleteTierError: string | null = null;

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.carryTypeId = this.route.snapshot.params['carryTypeId'];
    this.carryTierId = this.route.snapshot.params['carryTierId'];
    this.loadData();
  }

  loadData() {
    this.loadError = null;

    this.carryTypeService.getById6(this.serverId, this.carryTypeId).subscribe({
      next: (type) => {
        this.carryType = type;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load carry type.';
        console.error('Error loading carry type:', err);
        this.cdr.detectChanges();
      }
    });

    this.carryTierService.getAllCarryTiers(this.serverId, this.carryTypeId).subscribe({
      next: (tiers) => {
        this.carryTier = tiers.find(t => t.id.toString() === this.carryTierId.toString()) || null;
        if (!this.carryTier) {
          this.loadError = 'Carry tier not found.';
          console.error('Carry tier not found. Looking for ID:', this.carryTierId, 'Available tiers:', tiers.map(t => t.id));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load carry tier.';
        console.error('Error loading carry tier:', err);
        this.cdr.detectChanges();
      }
    });

    this.loadDifficulties();
  }

  loadDifficulties() {
    this.carryDifficultyService.getAllCarryDifficulties(this.serverId, this.carryTypeId, this.carryTierId).subscribe({
      next: (difficulties) => {
        this.difficulties = difficulties || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load difficulties.';
        console.error('Error loading difficulties:', err);
        this.cdr.detectChanges();
      }
    });
  }

  createDifficulty() {
    if (!this.newDifficulty.identifier || !this.newDifficulty.displayName ||
      this.newDifficulty.price === null || this.newDifficulty.score === null || this.isCreating) return;

    this.isCreating = true;
    this.createError = null;

    const creationModel: CarryDifficultyCreationModel = {
      identifier: this.newDifficulty.identifier.trim().toLowerCase().replace(/ /g, '_'),
      displayName: this.newDifficulty.displayName,
      price: this.newDifficulty.price,
      score: this.newDifficulty.score,
      bulkAmount: this.newDifficulty.bulkAmount || undefined,
      bulkPrice: this.newDifficulty.bulkPrice || undefined,
      thumbnailUrl: this.newDifficulty.thumbnailUrl || undefined,
      priceName: this.newDifficulty.priceName || undefined,
      ingameCarryType: this.newDifficulty.ingameCarryType || undefined
    };

    this.carryDifficultyService.createCarryDifficulty(this.serverId, this.carryTypeId, this.carryTierId, creationModel).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newDifficulty = { identifier: '', displayName: '', price: null, score: null, bulkAmount: null, bulkPrice: null, thumbnailUrl: '', priceName: '', ingameCarryType: null };
        this.isCreating = false;
        this.loadDifficulties();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create difficulty';
        this.isCreating = false;
        this.cdr.detectChanges();
      }
    });
  }

  wasCleared(currentValue: any, formValue: any): boolean {
    return currentValue != null && (formValue == null || formValue === '');
  }

  openEditTierModal() {
    if (!this.carryTier) return;
    this.editTierForm = {
      displayName: this.carryTier.displayName,
      category: this.carryTier.category || '',
      descriptiveName: this.carryTier.descriptiveName || '',
      thumbnailUrl: this.carryTier.thumbnailUrl || '',
      priceTitle: this.carryTier.priceTitle || '',
      priceDescription: this.carryTier.priceDescription || ''
    };
    this.updateTierError = null;
    this.showEditTierModal = true;
  }

  updateTier() {
    if (!this.carryTier || this.isUpdatingTier) return;

    this.isUpdatingTier = true;
    this.updateTierError = null;

    const resetCategory = this.wasCleared(this.carryTier.category, this.editTierForm.category);
    const resetDescriptiveName = this.wasCleared(this.carryTier.descriptiveName, this.editTierForm.descriptiveName);
    const resetThumbnailUrl = this.wasCleared(this.carryTier.thumbnailUrl, this.editTierForm.thumbnailUrl);
    const resetPriceTitle = this.wasCleared(this.carryTier.priceTitle, this.editTierForm.priceTitle);
    const resetPriceDescription = this.wasCleared(this.carryTier.priceDescription, this.editTierForm.priceDescription);

    const updateModel: CarryTierUpdateModel = {
      displayName: this.editTierForm.displayName || undefined,
      category: resetCategory ? undefined : (this.editTierForm.category || undefined),
      descriptiveName: resetDescriptiveName ? undefined : (this.editTierForm.descriptiveName || undefined),
      thumbnailUrl: resetThumbnailUrl ? undefined : (this.editTierForm.thumbnailUrl || undefined),
      priceTitle: resetPriceTitle ? undefined : (this.editTierForm.priceTitle || undefined),
      priceDescription: resetPriceDescription ? undefined : (this.editTierForm.priceDescription || undefined),
      resetCategory: resetCategory,
      resetDescriptiveName: resetDescriptiveName,
      resetThumbnailUrl: resetThumbnailUrl,
      resetPriceTitle: resetPriceTitle,
      resetPriceDescription: resetPriceDescription
    };

    this.carryTierService.updateCarryTier(this.serverId, this.carryTypeId, this.carryTier.id, updateModel).subscribe({
      next: () => {
        this.showEditTierModal = false;
        this.isUpdatingTier = false;
        this.loadData();
      },
      error: (err) => {
        this.updateTierError = err.error?.message || 'Failed to update tier';
        this.isUpdatingTier = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteTier() {
    if (!this.carryTier || this.isDeletingTier) return;

    this.isDeletingTier = true;
    this.deleteTierError = null;

    this.carryTierService.deleteCarryTier(this.serverId, this.carryTypeId, this.carryTier.id).subscribe({
      next: () => {
        this.router.navigate(['/server', this.serverId, 'carry-type', this.carryTypeId]);
      },
      error: (err) => {
        this.deleteTierError = err.error?.message || 'Failed to delete tier';
        this.isDeletingTier = false;
        this.cdr.detectChanges();
      }
    });
  }

  protected readonly getIngameCarryTypeLabel = getIngameCarryTypeLabel;
}
