import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {CntRequestControllerService, CntRequestModel} from '@dungeon-hub/api-client';
import { getCntRequestTypeLabel } from './cnt-request-type-labels';

@Component({
  selector: 'app-cnt-request-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <a [routerLink]="['/server', serverId]" class="btn btn-secondary mb-4 inline-block">
          ← Back to Server
        </a>
        <h2 class="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          CNT Requests
        </h2>
      </div>

      <!-- Request Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        @for (request of requests; track request.id) {
          <a
            [routerLink]="['/server', serverId, 'cnt-request', request.id]"
            [queryParams]="{page: currentPage}"
            class="card hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group"
          >
            <div class="flex justify-between items-start mb-3">
              <h3 class="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                Request #{{ request.id }}
              </h3>
              <span
                class="px-2 py-1 rounded text-sm"
                [class.bg-green-600]="request.completed"
                [class.bg-yellow-600]="!request.completed"
              >
                {{ request.completed ? 'Completed' : 'Pending' }}
              </span>
            </div>

            <div class="space-y-2 text-sm text-gray-300">
              <p><span class="text-gray-400">Type:</span> {{ getRequestTypeLabel(request.requestType) }}</p>
              <p><span class="text-gray-400">Description:</span> {{ request.description || 'N/A' }}</p>
              @if (request.coinValue) {
                <p><span class="text-gray-400">Value:</span> {{ request.coinValue }}</p>
              }
              @if (request.claimer) {
                <p><span class="text-gray-400">Claimed by:</span> {{ request.claimer.id }}</p>
              }
            </div>
          </a>
        }
      </div>

      <!-- Empty State -->
      @if (requests.length === 0 && !loading) {
        <div class="card text-center py-12">
          <p class="text-gray-400 text-lg">No CNT requests found.</p>
        </div>
      }

      <!-- Loading State -->
      @if (loading) {
        <div class="card text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p class="mt-4 text-gray-400">Loading...</p>
        </div>
      }

      <!-- Pagination -->
      <div class="flex justify-between items-center">
        <button
          (click)="previousPage()"
          [disabled]="currentPage === 0"
          class="btn btn-secondary"
          [class.opacity-50]="currentPage === 0"
        >
          ← Previous
        </button>

        <span class="text-gray-400">
          Page {{ currentPage + 1 }} of {{ totalPages }}
        </span>

        <button
          (click)="nextPage()"
          [disabled]="!hasMore"
          class="btn btn-secondary"
          [class.opacity-50]="!hasMore"
        >
          Next →
        </button>
      </div>
    </div>
  `
})
export class CntRequestListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private cntRequestService = inject(CntRequestControllerService);
  private cdr = inject(ChangeDetectorRef);

  serverId!: string;
  requests: CntRequestModel[] = [];
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  hasMore = false;
  loading = true;

  // Expose utility function for template
  getRequestTypeLabel = getCntRequestTypeLabel;

  ngOnInit() {
    this.serverId = this.route.snapshot.params['serverId'];
    const pageParam = this.route.snapshot.queryParams['page'];
    const parsedPage = parseInt(pageParam, 10);
    this.currentPage = Math.max(0, isNaN(parsedPage) ? 0 : parsedPage);
    this.loadRequests();
  }

  loadRequests() {
    this.loading = true;
    this.cntRequestService.getCntRequests(this.serverId, this.currentPage, this.pageSize).subscribe({
      next: (page: any) => {
        this.requests = page.requests || [];
        this.hasMore = page.page < page.totalPages - 1;
        this.totalPages = page.totalPages || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  nextPage() {
    if (this.hasMore) {
      this.currentPage++;
      this.loadRequests();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadRequests();
    }
  }
}
