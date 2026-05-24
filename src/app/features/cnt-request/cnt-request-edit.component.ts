import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CntRequestControllerService, CntRequestUpdateModel } from '@dungeon-hub/api-client';
import { CNT_REQUEST_TYPE_LABELS } from './cnt-request-type-labels';

@Component({
  selector: 'app-cnt-request-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <!-- Header -->
      <div class="mb-8">
        <a
          [routerLink]="['/server', serverId, 'cnt-requests']"
          [queryParams]="{page: returnPage}"
          class="btn btn-secondary mb-4 inline-block"
        >
          ← Back to List
        </a>
        <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Edit CNT Request #{{ request?.id }}
        </h2>
      </div>

      <!-- Loading State -->
      @if (loading) {
        <div class="card text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p class="mt-4 text-gray-400">Loading...</p>
        </div>
      }

      <!-- Form -->
      @if (!loading && form) {
        <form [formGroup]="form" (ngSubmit)="save()">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- General Info -->
          <div class="card">
            <h3 class="text-xl font-semibold mb-4">General</h3>
            <div class="space-y-3 text-sm">
              <p><span class="text-gray-400">Message ID:</span> {{ request?.messageId }}</p>
              <p><span class="text-gray-400">Requester:</span> {{ request?.user?.id }}</p>
              @if (request?.claimer) {
                <p>
                  <span class="text-gray-400">Claimed by:</span> {{ request?.claimer?.id }}
                </p>
              }
              <p><span class="text-gray-400">Created:</span> {{ request?.time | date:'medium' }}</p>
            </div>

            <div class="mt-6">
              <label class="label">Request Type (Coin Value)</label>
              <select formControlName="requestType" class="input">
                @for (key of requestTypeKeys; track key) {
                  <option [value]="requestTypeEnum[key]">
                    {{ requestTypeLabels[requestTypeEnum[key]] }}
                  </option>
                }
              </select>
            </div>

            <div class="mt-4 space-y-3">
              <label class="flex items-center cursor-pointer">
                <input formControlName="completed" type="checkbox" class="mr-2" />
                <span class="text-gray-300">Mark as Completed</span>
              </label>

              @if (request?.claimer) {
                <label class="flex items-center cursor-pointer">
                  <input formControlName="unclaim" type="checkbox" class="mr-2" />
                  <span class="text-gray-300">Unclaim this request</span>
                </label>
              }
            </div>
          </div>

          <!-- Request Details -->
          <div class="card">
            <h3 class="text-xl font-semibold mb-4">Information</h3>
            <div class="space-y-4">
              <div>
                <label class="label">Description</label>
                <input formControlName="description" type="text" class="input" />
              </div>

              <div>
                <label class="label">Coin Value</label>
                <input formControlName="coinValue" type="text" class="input" />
              </div>

              <div>
                <label class="label">Requirement</label>
                <input formControlName="requirement" type="text" class="input" />
              </div>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end mt-6">
          <button
            type="submit"
            [disabled]="!form.valid || saving"
            class="btn btn-primary"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
        </form>
      }
    </div>
  `
})
export class CntRequestEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cntRequestService = inject(CntRequestControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  requestId!: string;
  returnPage = 0;
  request: any;
  form!: FormGroup;
  loading = true;
  saving = false;

  // Expose enum and labels for template
  requestTypeEnum = CntRequestUpdateModel.RequestTypeEnum;
  requestTypeKeys = Object.keys(CntRequestUpdateModel.RequestTypeEnum) as Array<keyof typeof CntRequestUpdateModel.RequestTypeEnum>;
  requestTypeLabels = CNT_REQUEST_TYPE_LABELS;

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    this.requestId = this.route.snapshot.params['requestId'];
    this.returnPage = Number(this.route.snapshot.queryParams['page']) || 0;

    this.initForm();
    this.loadRequest();
  }

  initForm() {
    this.form = this.fb.group({
      requestType: [''],
      description: [''],
      coinValue: [''],
      requirement: [''],
      completed: [false],
      unclaim: [false]
    });
  }

  loadRequest() {
    this.cntRequestService.getCntRequest(this.serverId, this.requestId).subscribe({
      next: (request) => {
        this.request = request;
        this.populateForm(request);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  populateForm(request: any) {
    this.form.patchValue({
      requestType: request.requestType ?? '',
      description: request.description ?? '',
      coinValue: request.coinValue ?? '',
      requirement: request.requirement ?? '',
      completed: request.completed ?? false,
      unclaim: false
    });
  }

  save() {
    if (!this.form.valid || this.saving) return;

    this.saving = true;
    const formValue = this.form.value;

    const updateModel: CntRequestUpdateModel = {
      description: formValue.description || null,
      coinValue: formValue.coinValue || null,
      requirement: formValue.requirement || null,
      completed: formValue.completed,
      requestType: formValue.requestType,
    };

    if (formValue.unclaim) {
      updateModel.claimer = undefined;
    }

    this.cntRequestService.updateCntRequest(this.serverId, this.requestId, updateModel).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/server', this.serverId, 'cnt-requests'], {
          queryParams: { page: this.returnPage }
        });
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
