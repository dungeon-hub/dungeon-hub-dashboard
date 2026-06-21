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
  CarryDifficultyUpdateModel,
  CarryDifficultyCreationModel
} from '@dungeon-hub/api-client';
import { INGAME_CARRY_TYPE_LABELS, getIngameCarryTypeLabel } from './ingame-carry-type-labels';

@Component({
  selector: 'app-carry-difficulty-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId, 'carry-type', carryTypeId, 'carry-tier', carryTierId]" class="btn btn-secondary mb-4 inline-block">
          ← Back to {{ carryTier?.displayName || 'Carry Tier' }}
        </a>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-3xl font-bold holographic">
              {{ difficulty?.displayName || 'Loading...' }}
            </h2>
            @if (difficulty) {
              <p class="text-gray-400 mt-2">{{ difficulty.identifier }}</p>
            }
          </div>
          @if (difficulty) {
            <div class="flex gap-2">
              <button
                (click)="showEditModal = true"
                class="btn btn-secondary"
              >
                Edit
              </button>
              <button
                (click)="showDeleteModal = true"
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

      @if (difficulty) {
        <div class="card">
          <h3 class="text-xl font-semibold mb-4">Difficulty Details</h3>
          <div class="space-y-2 text-gray-300">
            <p><strong>Display Name:</strong> {{ difficulty.displayName }}</p>
            <p><strong>Identifier:</strong> {{ difficulty.identifier }}</p>
            <p><strong>Price:</strong> {{ difficulty.price }} Coins</p>
            <p><strong>Score:</strong> {{ difficulty.score }}</p>
            @if (difficulty.bulkAmount != null && difficulty.bulkPrice != null) {
              <p><strong>Bulk Purchase:</strong> {{ difficulty.bulkAmount }}x for {{ difficulty.bulkPrice }} Coins</p>
            } @else {
              <p><strong>Bulk Purchase:</strong> Not configured</p>
            }
            @if (difficulty.priceName) {
              <p>
                <strong class="cursor-help" title="Alternative name that takes priority over the default display name in the static price embed">Alternative Price Name:</strong>
                <span class="cursor-help" title="Alternative name that takes priority over the default display name in the static price embed">
                  {{ difficulty.priceName }}
                </span>
              </p>
            }
            @if (difficulty.thumbnailUrl) {
              <p><strong>Thumbnail: </strong><a [href]="difficulty.thumbnailUrl" target="_blank" rel="noopener noreferrer" class="text-blue-400 break-all">{{ difficulty.thumbnailUrl }}</a></p>
            }
            <p><strong>Ingame Carry Type:</strong> {{ getIngameCarryTypeLabel(difficulty.ingameCarryType) }}</p>
          </div>
        </div>
      }

      <!-- Edit Modal -->
      @if (showEditModal && difficulty) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto"
          (click)="showEditModal = false"
        >
          <div class="card max-w-md w-full mx-4 my-8" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Edit Difficulty</h3>

            <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label class="label">Display Name</label>
                <input
                  [(ngModel)]="editForm.displayName"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ difficulty.displayName }}</small>
              </div>

              <div>
                <label class="label">Price</label>
                <input
                  [(ngModel)]="editForm.price"
                  type="number"
                  class="input"
                  min="0"
                />
                <small class="text-gray-400">Current: {{ difficulty.price }}</small>
              </div>

              <div>
                <label class="label">Score</label>
                <input
                  [(ngModel)]="editForm.score"
                  type="number"
                  class="input"
                  min="0"
                />
                <small class="text-gray-400">Current: {{ difficulty.score }}</small>
              </div>

              <div>
                <label class="label">Bulk Amount</label>
                <input
                  [(ngModel)]="editForm.bulkAmount"
                  type="number"
                  class="input"
                  min="1"
                />
                <small class="text-gray-400">Current: {{ difficulty.bulkAmount || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Bulk Price</label>
                <input
                  [(ngModel)]="editForm.bulkPrice"
                  type="number"
                  class="input"
                  min="0"
                />
                <small class="text-gray-400">Current: {{ difficulty.bulkPrice || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Thumbnail URL</label>
                <input
                  [(ngModel)]="editForm.thumbnailUrl"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ difficulty.thumbnailUrl || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Alternative Price Name</label>
                <input
                  [(ngModel)]="editForm.priceName"
                  type="text"
                  class="input"
                  placeholder="e.g. Master Mode 7"
                />
                <small class="text-gray-400">Alternative name that takes priority over the default display name in the static price embed. Current: {{ difficulty.priceName || 'None' }} (clear to remove)</small>
              </div>

              <div>
                <label class="label">Ingame Carry Type</label>
                <select
                  [(ngModel)]="editForm.ingameCarryType"
                  class="input"
                >
                  <option [ngValue]="null">None</option>
                  @for (option of ingameCarryTypeOptions; track option.value) {
                    <option [ngValue]="option.value">{{ option.label }}</option>
                  }
                </select>
                <small class="text-gray-400">Current: {{ getIngameCarryTypeLabel(difficulty.ingameCarryType) }} (select "None" to remove)</small>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showEditModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="updateDifficulty()" class="btn btn-primary flex-1" [disabled]="isUpdating">
                {{ isUpdating ? 'Updating...' : 'Update' }}
              </button>
            </div>

            @if (updateError) {
              <p class="text-red-400 text-sm mt-4">{{ updateError }}</p>
            }
          </div>
        </div>
      }

      <!-- Delete Modal -->
      @if (showDeleteModal && difficulty) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showDeleteModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4 text-red-400">Delete Difficulty</h3>

            <p class="mb-4">Are you sure you want to delete <strong>{{ difficulty.displayName }}</strong>?</p>

            <div class="flex gap-3 mt-6">
              <button (click)="showDeleteModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="deleteDifficulty()" class="btn btn-primary flex-1 bg-red-600 hover:bg-red-700" [disabled]="isDeleting">
                {{ isDeleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>

            @if (deleteError) {
              <p class="text-red-400 text-sm mt-4">{{ deleteError }}</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CarryDifficultyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carryTypeService = inject(CarryTypeControllerService);
  private carryTierService = inject(CarryTierControllerService);
  private carryDifficultyService = inject(CarryDifficultyControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  carryTypeId!: string;
  carryTierId!: string;
  difficultyId!: string;
  carryType: CarryTypeModel | null = null;
  carryTier: CarryTierModel | null = null;
  difficulty: CarryDifficultyModel | null = null;
  loadError: string | null = null;

  showEditModal = false;
  isUpdating = false;
  updateError: string | null = null;
  editForm = {
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

  getIngameCarryTypeLabel = getIngameCarryTypeLabel;

  showDeleteModal = false;
  isDeleting = false;
  deleteError: string | null = null;

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.carryTypeId = this.route.snapshot.params['carryTypeId'];
    this.carryTierId = this.route.snapshot.params['carryTierId'];
    this.difficultyId = this.route.snapshot.params['difficultyId'];
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
        console.error('CarryDifficultyDetail: Error loading carry type:', err);
        this.cdr.detectChanges();
      }
    });

    this.carryTierService.getAllCarryTiers(this.serverId, this.carryTypeId).subscribe({
      next: (tiers) => {
        this.carryTier = tiers.find(t => t.id.toString() === this.carryTierId.toString()) || null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('CarryDifficultyDetail: Error loading carry tier:', err);
        this.cdr.detectChanges();
      }
    });

    this.carryDifficultyService.getAllCarryDifficulties(this.serverId, this.carryTypeId, this.carryTierId).subscribe({
      next: (difficulties) => {
        this.difficulty = difficulties.find(d => d.id.toString() === this.difficultyId.toString()) || null;
        if (!this.difficulty) {
          this.loadError = 'Difficulty not found.';
          console.error('CarryDifficultyDetail: Difficulty not found. Looking for ID:', this.difficultyId, 'Available difficulties:', difficulties.map(d => d.id));
        } else {
          this.editForm = {
            displayName: this.difficulty.displayName,
            price: this.difficulty.price,
            score: this.difficulty.score,
            bulkAmount: this.difficulty.bulkAmount != null ? this.difficulty.bulkAmount : null,
            bulkPrice: this.difficulty.bulkPrice != null ? this.difficulty.bulkPrice : null,
            thumbnailUrl: this.difficulty.thumbnailUrl || '',
            priceName: this.difficulty.priceName || '',
            ingameCarryType: this.difficulty.ingameCarryType || null
          };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load difficulty.';
        console.error('CarryDifficultyDetail: Error loading difficulty:', err);
        this.cdr.detectChanges();
      }
    });
  }

  wasCleared(currentValue: any, formValue: any): boolean {
    return currentValue != null && (formValue == null || formValue === '');
  }

  updateDifficulty() {
    if (!this.difficulty || this.isUpdating) return;

    this.isUpdating = true;
    this.updateError = null;

    const resetBulkAmount = this.wasCleared(this.difficulty.bulkAmount, this.editForm.bulkAmount);
    const resetBulkPrice = this.wasCleared(this.difficulty.bulkPrice, this.editForm.bulkPrice);
    const resetThumbnailUrl = this.wasCleared(this.difficulty.thumbnailUrl, this.editForm.thumbnailUrl);
    const resetPriceName = this.wasCleared(this.difficulty.priceName, this.editForm.priceName);
    const resetIngameCarryType = this.editForm.ingameCarryType === null && this.difficulty.ingameCarryType !== null;

    const updateModel: CarryDifficultyUpdateModel = {
      displayName: this.editForm.displayName || undefined,
      price: this.editForm.price !== null ? this.editForm.price : undefined,
      score: this.editForm.score !== null ? this.editForm.score : undefined,
      bulkAmount: resetBulkAmount ? undefined : (this.editForm.bulkAmount != null ? this.editForm.bulkAmount : undefined),
      bulkPrice: resetBulkPrice ? undefined : (this.editForm.bulkPrice != null ? this.editForm.bulkPrice : undefined),
      thumbnailUrl: resetThumbnailUrl ? undefined : (this.editForm.thumbnailUrl || undefined),
      priceName: resetPriceName ? undefined : (this.editForm.priceName || undefined),
      ingameCarryType: resetIngameCarryType ? undefined : (this.editForm.ingameCarryType || undefined),
      resetBulkAmount: resetBulkAmount,
      resetBulkPrice: resetBulkPrice,
      resetThumbnailUrl: resetThumbnailUrl,
      resetPriceName: resetPriceName,
      resetIngameCarryType: resetIngameCarryType
    };

    this.carryDifficultyService.updateCarryDifficulty(this.serverId, this.carryTypeId, this.carryTierId, this.difficulty.id, updateModel).subscribe({
      next: () => {
        this.showEditModal = false;
        this.isUpdating = false;
        this.loadData();
      },
      error: (err) => {
        this.updateError = err.error?.message || 'Failed to update difficulty';
        this.isUpdating = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteDifficulty() {
    if (!this.difficulty || this.isDeleting) return;

    this.isDeleting = true;
    this.deleteError = null;

    this.carryDifficultyService.deleteCarryDifficulty(this.serverId, this.carryTypeId, this.carryTierId, this.difficulty.id).subscribe({
      next: () => {
        this.router.navigate(['/server', this.serverId, 'carry-type', this.carryTypeId, 'carry-tier', this.carryTierId]);
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete difficulty';
        this.isDeleting = false;
        this.cdr.detectChanges();
      }
    });
  }
}
