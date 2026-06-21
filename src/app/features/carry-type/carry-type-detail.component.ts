import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CarryTypeControllerService,
  CarryTierControllerService,
  CarryTypeModel,
  CarryTierModel,
  CarryTierCreationModel,
  CarryTypeUpdateModel
} from '@dungeon-hub/api-client';

@Component({
  selector: 'app-carry-type-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId, 'carry-types']" class="btn btn-secondary mb-4 inline-block">
          ← Back to Carry Types
        </a>
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-3xl font-bold holographic">
              {{ carryType?.displayName || 'Loading...' }}
            </h2>
            @if (carryType) {
              <p class="text-gray-400 mt-2">{{ carryType.identifier }}</p>
            }
          </div>
          @if (carryType) {
            <div class="flex gap-2">
              <button
                (click)="openEditTypeModal()"
                class="btn btn-secondary"
              >
                Edit
              </button>
              <button
                (click)="showDeleteTypeModal = true"
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

      @if (carryType) {
        <div class="card mb-8">
          <h3 class="text-xl font-semibold mb-4">Carry Type Details</h3>
          <div class="space-y-2 text-gray-300">
            <p><strong>Display Name:</strong> {{ carryType.displayName }}</p>
            <p><strong>Identifier:</strong> {{ carryType.identifier }}</p>
            <p><strong>Log Channel:</strong> {{ carryType.logChannel || 'None' }}</p>
            <p><strong>Event Active:</strong> {{ carryType.isEventActive ? 'Yes' : 'No' }}</p>
          </div>
        </div>

        <div class="card">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-semibold">Carry Tiers</h3>
            <button
              (click)="showCreateModal = true"
              class="btn btn-primary"
            >
              ＋ New Tier
            </button>
          </div>

          @if (tiers.length > 0) {
            <div class="space-y-4">
              @for (tier of tiers; track tier.id) {
                <a
                  [routerLink]="['/server', serverId, 'carry-type', carryTypeId, 'carry-tier', tier.id]"
                  class="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
                >
                  <div class="flex justify-between items-center">
                    <div class="flex-1">
                      <div class="flex items-center gap-4">
                        <span class="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                          {{ tier.displayName }}
                        </span>
                        <span class="text-sm text-gray-400">{{ tier.identifier }}</span>
                      </div>
                      @if (tier.descriptiveName) {
                        <p class="text-sm text-gray-400 mt-1">{{ tier.descriptiveName }}</p>
                      }
                      <div class="text-sm text-gray-400 mt-1">
                        @if (tier.category) {
                          <span>Category: {{ tier.category }}</span>
                        }
                        @if (tier.priceTitle) {
                          <span class="ml-4">{{ tier.priceTitle }}</span>
                        }
                      </div>
                    </div>
                    <span class="text-gray-400">→</span>
                  </div>
                </a>
              }
            </div>
          }

          @if (tiers.length === 0 && !loadError) {
            <p class="text-gray-400 text-center py-8">
              No tiers created yet. Click "New Tier" to create one.
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
            <h3 class="text-xl font-semibold mb-4">Create New Carry Tier</h3>

            <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label class="label">Identifier *</label>
                <input
                  [(ngModel)]="newTier.identifier"
                  type="text"
                  class="input"
                  placeholder="e.g. f7"
                  required
                />
                <small class="text-gray-400">Unique identifier (lowercase, underscores)</small>
              </div>

              <div>
                <label class="label">Display Name *</label>
                <input
                  [(ngModel)]="newTier.displayName"
                  type="text"
                  class="input"
                  placeholder="e.g. Floor 7"
                  required
                />
              </div>

              <div>
                <label class="label">Category ID</label>
                <input
                  [(ngModel)]="newTier.category"
                  type="text"
                  class="input"
                  placeholder="Discord category ID"
                />
              </div>

              <div>
                <label class="label">Descriptive Name</label>
                <input
                  [(ngModel)]="newTier.descriptiveName"
                  type="text"
                  class="input"
                />
              </div>

              <div>
                <label class="label">Thumbnail URL</label>
                <input
                  [(ngModel)]="newTier.thumbnailUrl"
                  type="text"
                  class="input"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label class="label">Price Title</label>
                <input
                  [(ngModel)]="newTier.priceTitle"
                  type="text"
                  class="input"
                />
              </div>

              <div>
                <label class="label">Price Description</label>
                <textarea
                  [(ngModel)]="newTier.priceDescription"
                  class="input"
                  rows="3"
                ></textarea>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showCreateModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="createTier()" class="btn btn-primary flex-1" [disabled]="!newTier.identifier || !newTier.displayName || isCreating">
                {{ isCreating ? 'Creating...' : 'Create' }}
              </button>
            </div>

            @if (createError) {
              <p class="text-red-400 text-sm mt-4">{{ createError }}</p>
            }
          </div>
        </div>
      }

      <!-- Edit Carry Type Modal -->
      @if (showEditTypeModal && carryType) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showEditTypeModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Edit Carry Type</h3>

            <div class="space-y-4">
              <div>
                <label class="label">Display Name</label>
                <input
                  [(ngModel)]="editTypeForm.displayName"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ carryType.displayName }}</small>
              </div>

              <div>
                <label class="label">Log Channel ID</label>
                <input
                  [(ngModel)]="editTypeForm.logChannel"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ carryType.logChannel || 'None' }} (clear to remove)</small>
              </div>

              <div class="flex items-center gap-2">
                <input
                  [(ngModel)]="editTypeForm.eventActive"
                  type="checkbox"
                  id="editEventActive"
                  class="w-4 h-4"
                />
                <label for="editEventActive" class="label mb-0">Event Active</label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showEditTypeModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="updateCarryType()" class="btn btn-primary flex-1" [disabled]="isUpdatingType">
                {{ isUpdatingType ? 'Updating...' : 'Update' }}
              </button>
            </div>

            @if (updateTypeError) {
              <p class="text-red-400 text-sm mt-4">{{ updateTypeError }}</p>
            }
          </div>
        </div>
      }

      <!-- Delete Carry Type Modal -->
      @if (showDeleteTypeModal && carryType) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showDeleteTypeModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4 text-red-400">Delete Carry Type</h3>

            <p class="mb-4">Are you sure you want to delete <strong>{{ carryType.displayName }}</strong>?</p>
            <p class="text-sm text-gray-400 mb-4">This will also delete all associated tiers and difficulties.</p>

            <div class="flex gap-3 mt-6">
              <button (click)="showDeleteTypeModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="deleteCarryType()" class="btn btn-primary flex-1 bg-red-600 hover:bg-red-700" [disabled]="isDeletingType">
                {{ isDeletingType ? 'Deleting...' : 'Delete' }}
              </button>
            </div>

            @if (deleteTypeError) {
              <p class="text-red-400 text-sm mt-4">{{ deleteTypeError }}</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class CarryTypeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carryTypeService = inject(CarryTypeControllerService);
  private carryTierService = inject(CarryTierControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  carryTypeId!: string;
  carryType: CarryTypeModel | null = null;
  tiers: CarryTierModel[] = [];
  loadError: string | null = null;

  showCreateModal = false;
  isCreating = false;
  createError: string | null = null;
  newTier = {
    identifier: '',
    displayName: '',
    category: '',
    descriptiveName: '',
    thumbnailUrl: '',
    priceTitle: '',
    priceDescription: ''
  };

  showEditTypeModal = false;
  isUpdatingType = false;
  updateTypeError: string | null = null;
  editTypeForm = {
    displayName: '',
    logChannel: '',
    eventActive: false
  };

  showDeleteTypeModal = false;
  isDeletingType = false;
  deleteTypeError: string | null = null;

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.carryTypeId = this.route.snapshot.params['carryTypeId'];
    this.loadData();
  }

  loadData() {
    this.loadError = null;

    this.carryTypeService.getById6(this.serverId, this.carryTypeId).subscribe({
      next: (type) => {
        this.carryType = type;
        this.loadTiers();
      },
      error: (err) => {
        this.loadError = 'Failed to load carry type. Please try again.';
        console.error('Error loading carry type:', err);
        this.cdr.detectChanges();
      }
    });
  }

  loadTiers() {
    if (!this.carryType) return;

    this.carryTierService.getAllCarryTiers(this.serverId, this.carryType.id).subscribe({
      next: (tiers) => {
        this.tiers = tiers || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load tiers. Please try again.';
        console.error('Error loading tiers:', err);
        this.cdr.detectChanges();
      }
    });
  }

  createTier() {
    if (!this.carryType || !this.newTier.identifier || !this.newTier.displayName || this.isCreating) return;

    this.isCreating = true;
    this.createError = null;

    const creationModel: CarryTierCreationModel = {
      identifier: this.newTier.identifier.trim().toLowerCase().replace(/ /g, '_'),
      displayName: this.newTier.displayName,
      category: this.newTier.category || undefined,
      descriptiveName: this.newTier.descriptiveName || undefined,
      thumbnailUrl: this.newTier.thumbnailUrl || undefined,
      priceTitle: this.newTier.priceTitle || undefined,
      priceDescription: this.newTier.priceDescription || undefined
    };

    this.carryTierService.createCarryTier(this.serverId, this.carryType.id, creationModel).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newTier = { identifier: '', displayName: '', category: '', descriptiveName: '', thumbnailUrl: '', priceTitle: '', priceDescription: '' };
        this.isCreating = false;
        this.loadTiers();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create tier';
        this.isCreating = false;
        this.cdr.detectChanges();
      }
    });
  }

  openEditTypeModal() {
    if (!this.carryType) return;
    this.editTypeForm = {
      displayName: this.carryType.displayName,
      logChannel: this.carryType.logChannel || '',
      eventActive: this.carryType.isEventActive || false
    };
    this.updateTypeError = null;
    this.showEditTypeModal = true;
  }

  wasCleared(currentValue: any, formValue: any): boolean {
    return currentValue != null && (formValue == null || formValue === '');
  }

  updateCarryType() {
    if (!this.carryType || this.isUpdatingType) return;

    this.isUpdatingType = true;
    this.updateTypeError = null;

    const resetLogChannel = this.wasCleared(this.carryType.logChannel, this.editTypeForm.logChannel);

    const updateModel: CarryTypeUpdateModel = {
      displayName: this.editTypeForm.displayName || undefined,
      logChannel: resetLogChannel ? undefined : (this.editTypeForm.logChannel || undefined),
      eventActive: this.editTypeForm.eventActive,
      resetLogChannel: resetLogChannel,
      resetEventActive: false
    };

    this.carryTypeService.updateCarryType(this.serverId, this.carryType.id, updateModel).subscribe({
      next: () => {
        this.showEditTypeModal = false;
        this.isUpdatingType = false;
        this.loadData();
      },
      error: (err) => {
        this.updateTypeError = err.error?.message || 'Failed to update carry type';
        this.isUpdatingType = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteCarryType() {
    if (!this.carryType || this.isDeletingType) return;

    this.isDeletingType = true;
    this.deleteTypeError = null;

    this.carryTypeService.deleteById4(this.serverId, this.carryType.id).subscribe({
      next: () => {
        this.router.navigate(['/server', this.serverId, 'carry-types']);
      },
      error: (err) => {
        this.deleteTypeError = err.error?.message || 'Failed to delete carry type';
        this.isDeletingType = false;
        this.cdr.detectChanges();
      }
    });
  }
}
