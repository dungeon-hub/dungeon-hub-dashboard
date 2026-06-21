import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  CarryTypeControllerService,
  CarryTypeModel,
  CarryTypeCreationModel
} from '@dungeon-hub/api-client';

@Component({
  selector: 'app-carry-type-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId]" class="btn btn-secondary mb-4 inline-block">
          ← Back to Server
        </a>
        <h2 class="text-3xl font-bold holographic">
          Carry Types
        </h2>
      </div>

      @if (loadError) {
        <div class="card bg-red-900/20 border-red-500 mb-8">
          <div class="flex justify-between items-center">
            <p class="text-red-400">{{ loadError }}</p>
            <button (click)="loadCarryTypes()" class="btn btn-secondary">
              Retry
            </button>
          </div>
        </div>
      }

      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Carry Types</h3>
          <button
            (click)="showCreateModal = true"
            class="btn btn-primary"
          >
            ＋ New Carry Type
          </button>
        </div>

        @if (carryTypes.length > 0) {
          <div class="space-y-4">
            @for (carryType of carryTypes; track carryType.id) {
              <a
                [routerLink]="['/server', serverId, 'carry-type', carryType.id]"
                class="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
              >
                <div class="flex justify-between items-center">
                  <div class="flex-1">
                    <div class="flex items-center gap-4">
                      <span class="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                        {{ carryType.displayName }}
                      </span>
                      <span class="text-sm text-gray-400">{{ carryType.identifier }}</span>
                      @if (carryType.isEventActive) {
                        <span class="px-2 py-1 bg-green-600 text-xs rounded">Event Active</span>
                      }
                    </div>
                    @if (carryType.logChannel) {
                      <p class="text-sm text-gray-400 mt-1">Log Channel: {{ carryType.logChannel }}</p>
                    }
                  </div>
                  <span class="text-gray-400">→</span>
                </div>
              </a>
            }
          </div>
        }

        @if (carryTypes.length === 0 && !loadError) {
          <p class="text-gray-400 text-center py-8">
            No carry types created yet. Click "New Carry Type" to create one.
          </p>
        }
      </div>

      @if (showCreateModal) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showCreateModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Create New Carry Type</h3>

            <div class="space-y-4">
              <div>
                <label class="label">Identifier *</label>
                <input
                  [(ngModel)]="newCarryType.identifier"
                  type="text"
                  class="input"
                  placeholder="e.g. master_mode"
                  required
                />
                <small class="text-gray-400">Unique identifier (lowercase, underscores)</small>
              </div>

              <div>
                <label class="label">Display Name *</label>
                <input
                  [(ngModel)]="newCarryType.displayName"
                  type="text"
                  class="input"
                  placeholder="e.g. Master Mode"
                  required
                />
              </div>

              <div>
                <label class="label">Log Channel ID</label>
                <input
                  [(ngModel)]="newCarryType.logChannel"
                  type="text"
                  class="input"
                  placeholder="Discord channel ID"
                />
              </div>

              <div class="flex items-center gap-2">
                <input
                  [(ngModel)]="newCarryType.eventActive"
                  type="checkbox"
                  id="eventActive"
                  class="w-4 h-4"
                />
                <label for="eventActive" class="label mb-0">Event Active</label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showCreateModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="createCarryType()" class="btn btn-primary flex-1" [disabled]="!newCarryType.identifier || !newCarryType.displayName || isCreating">
                {{ isCreating ? 'Creating...' : 'Create' }}
              </button>
            </div>

            @if (createError) {
              <p class="text-red-400 text-sm mt-4">{{ createError }}</p>
            }
          </div>
        </div>
      }

      @if (showEditModal && editingCarryType) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showEditModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Edit Carry Type</h3>

            <div class="space-y-4">
              <div>
                <label class="label">Display Name</label>
                <input
                  [(ngModel)]="editForm.displayName"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ editingCarryType.displayName }}</small>
              </div>

              <div>
                <label class="label">Log Channel ID</label>
                <input
                  [(ngModel)]="editForm.logChannel"
                  type="text"
                  class="input"
                />
                <small class="text-gray-400">Current: {{ editingCarryType.logChannel || 'None' }} (clear to remove)</small>
              </div>

              <div class="flex items-center gap-2">
                <input
                  [(ngModel)]="editForm.eventActive"
                  type="checkbox"
                  id="editEventActive"
                  class="w-4 h-4"
                />
                <label for="editEventActive" class="label mb-0">Event Active</label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showEditModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="updateCarryType()" class="btn btn-primary flex-1" [disabled]="isUpdating">
                {{ isUpdating ? 'Updating...' : 'Update' }}
              </button>
            </div>

            @if (updateError) {
              <p class="text-red-400 text-sm mt-4">{{ updateError }}</p>
            }
          </div>
        </div>
      }

      @if (showDeleteModal && deletingCarryType) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showDeleteModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4 text-red-400">Delete Carry Type</h3>

            <p class="mb-4">Are you sure you want to delete <strong>{{ deletingCarryType.displayName }}</strong>?</p>
            <p class="text-sm text-gray-400 mb-4">This will also delete all associated carry tiers and difficulties.</p>

            <div class="flex gap-3 mt-6">
              <button (click)="showDeleteModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button (click)="deleteCarryType()" class="btn btn-primary flex-1 bg-red-600 hover:bg-red-700" [disabled]="isDeleting">
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
export class CarryTypeListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private carryTypeService = inject(CarryTypeControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  carryTypes: CarryTypeModel[] = [];
  loadError: string | null = null;

  showCreateModal = false;
  isCreating = false;
  createError: string | null = null;
  newCarryType = {
    identifier: '',
    displayName: '',
    logChannel: '',
    eventActive: false
  };

  showEditModal = false;
  isUpdating = false;
  updateError: string | null = null;
  editingCarryType: CarryTypeModel | null = null;
  editForm = {
    displayName: '',
    logChannel: '',
    eventActive: false
  };

  showDeleteModal = false;
  isDeleting = false;
  deleteError: string | null = null;
  deletingCarryType: CarryTypeModel | null = null;

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.loadCarryTypes();
  }

  loadCarryTypes() {
    this.loadError = null;
    this.carryTypeService.getAllCarryTypes(this.serverId).subscribe({
      next: (types) => {
        this.carryTypes = types || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadError = 'Failed to load carry types. Please try again.';
        console.error('Error loading carry types:', err);
        this.cdr.detectChanges();
      }
    });
  }

  createCarryType() {
    if (!this.newCarryType.identifier || !this.newCarryType.displayName || this.isCreating) return;

    this.isCreating = true;
    this.createError = null;

    const creationModel: CarryTypeCreationModel = {
      identifier: this.newCarryType.identifier.trim().toLowerCase().replace(/ /g, '_'),
      displayName: this.newCarryType.displayName,
      logChannel: this.newCarryType.logChannel || undefined,
      eventActive: this.newCarryType.eventActive || undefined
    };

    this.carryTypeService.createNewCarryType(this.serverId, creationModel).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.newCarryType = { identifier: '', displayName: '', logChannel: '', eventActive: false };
        this.isCreating = false;
        this.loadCarryTypes();
      },
      error: (err) => {
        this.createError = err.error?.message || 'Failed to create carry type';
        this.isCreating = false;
        this.cdr.detectChanges();
      }
    });
  }

  openEditModal(carryType: CarryTypeModel) {
    this.editingCarryType = carryType;
    this.editForm = {
      displayName: carryType.displayName,
      logChannel: carryType.logChannel || '',
      eventActive: carryType.isEventActive || false
    };
    this.updateError = null;
    this.showEditModal = true;
  }

  wasCleared(currentValue: any, formValue: any): boolean {
    return currentValue != null && (formValue == null || formValue === '');
  }

  updateCarryType() {
    if (!this.editingCarryType || this.isUpdating) return;

    this.isUpdating = true;
    this.updateError = null;

    const resetLogChannel = this.wasCleared(this.editingCarryType.logChannel, this.editForm.logChannel);

    const updateModel: any = {
      displayName: this.editForm.displayName || undefined,
      logChannel: resetLogChannel ? undefined : (this.editForm.logChannel || undefined),
      eventActive: this.editForm.eventActive,
      resetLogChannel: resetLogChannel,
      resetEventActive: false
    };

    this.carryTypeService.updateCarryType(this.serverId, this.editingCarryType.id, updateModel).subscribe({
      next: () => {
        this.showEditModal = false;
        this.editingCarryType = null;
        this.isUpdating = false;
        this.loadCarryTypes();
      },
      error: (err) => {
        this.updateError = err.error?.message || 'Failed to update carry type';
        this.isUpdating = false;
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteModal(carryType: CarryTypeModel) {
    this.deletingCarryType = carryType;
    this.deleteError = null;
    this.showDeleteModal = true;
  }

  deleteCarryType() {
    if (!this.deletingCarryType || this.isDeleting) return;

    this.isDeleting = true;
    this.deleteError = null;

    this.carryTypeService.deleteById4(this.serverId, this.deletingCarryType.id).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.deletingCarryType = null;
        this.isDeleting = false;
        this.loadCarryTypes();
      },
      error: (err) => {
        this.deleteError = err.error?.message || 'Failed to delete carry type';
        this.isDeleting = false;
        this.cdr.detectChanges();
      }
    });
  }
}
