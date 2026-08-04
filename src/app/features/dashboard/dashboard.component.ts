import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DiscordGuildService, DiscordGuild } from '../../core/services/discord-guild.service';
import { CdnService } from '../../core/services/cdn.service';
import { DiscordServerControllerService, DiscordUserControllerService } from '@dungeon-hub/api-client';
import { Subscription } from 'rxjs';

export function formatLinkedUserCount(value: string): string {
  return String(value ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function categorizeGuilds(
  allGuilds: DiscordGuild[],
  adminServerIds: ReadonlySet<string>,
  botServerIds: ReadonlySet<string>
) {
  const hasAdminAccess = (guild: DiscordGuild) => adminServerIds.has(guild.id.toString());
  const hasBot = (guild: DiscordGuild) => botServerIds.has(guild.id.toString());

  return {
    editable: allGuilds.filter(guild => hasAdminAccess(guild) && hasBot(guild)),
    needingInvite: allGuilds.filter(guild => hasAdminAccess(guild) && !hasBot(guild)),
    viewOnly: allGuilds.filter(guild => !hasAdminAccess(guild) && hasBot(guild))
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold holographic">
          Dungeon Hub Dashboard
        </h1>
      </div>

      <!-- Loading State -->
      @if (loading) {
        <div class="card text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p class="mt-4 text-gray-400">Loading servers...</p>
        </div>
      }

      <!-- Error State -->
      @if (error && !loading) {
        <div class="card bg-red-900/20 border-red-500 text-center py-12">
          <p class="text-red-400 text-lg font-semibold mb-2">Error</p>
          <p class="text-gray-300">{{ error }}</p>
          <button (click)="logout()" class="btn btn-secondary mt-4">
            Logout and Try Again
          </button>
        </div>
      }

      <!-- Servers the user can manage -->
      @if (!loading && !error && guilds.length > 0) {
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Servers You Can Manage</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (guild of guilds; track guild.id) {
              <div class="card">
                <div class="flex items-center gap-4">
                  <div class="relative w-16 h-16 rounded-full overflow-hidden">
                    @if (guild.icon) {
                      <img
                        [src]="getIconUrl(guild)"
                        [alt]="guild.name"
                        class="w-full h-full object-cover"
                      />
                    } @else {
                      <div
                        class="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                        [style.background-color]="getGuildColor(guild)"
                      >
                        {{ guild.name[0].toUpperCase() }}
                      </div>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-xl font-semibold truncate">
                      {{ getDisplayName(guild) }}
                    </h3>
                    <p class="text-gray-400 text-sm truncate">ID: {{ guild.id }}</p>
                  </div>
                  <div class="flex flex-col gap-2">
                    <a
                      [routerLink]="['/server', guild.id, 'stats']"
                      class="btn btn-secondary text-center whitespace-nowrap"
                    >
                      View
                    </a>
                    <a
                      [routerLink]="['/server', guild.id]"
                      class="btn btn-primary text-center whitespace-nowrap"
                    >
                      Edit
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Servers Needing Bot Invite -->
      @if (!loading && !error && guildsNeedingInvite.length > 0) {
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Servers Needing Bot Invite</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (guild of guildsNeedingInvite; track guild.id) {
              <div class="card">
                <div class="flex items-center gap-4">
                  <div class="relative w-16 h-16 rounded-full overflow-hidden">
                    @if (guild.icon) {
                      <img
                        [src]="getIconUrl(guild)"
                        [alt]="guild.name"
                        class="w-full h-full object-cover"
                      />
                    } @else {
                      <div
                        class="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                        [style.background-color]="getGuildColor(guild)"
                      >
                        {{ guild.name[0].toUpperCase() }}
                      </div>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-xl font-semibold truncate">
                      {{ getDisplayName(guild) }}
                    </h3>
                    <p class="text-gray-400 text-sm truncate">ID: {{ guild.id }}</p>
                  </div>
                  <a
                    [href]="'https://invite.dungeon-hub.net/&guild_id=' + guild.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn btn-primary whitespace-nowrap"
                  >
                    Invite
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Servers shared by the user and bot without admin access -->
      @if (!loading && !error && viewOnlyGuilds.length > 0) {
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-4">Other Servers You're In</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (guild of viewOnlyGuilds; track guild.id) {
              <div class="card">
                <div class="flex items-center gap-4">
                  <div class="relative w-16 h-16 rounded-full overflow-hidden">
                    @if (guild.icon) {
                      <img
                        [src]="getIconUrl(guild)"
                        [alt]="guild.name"
                        class="w-full h-full object-cover"
                      />
                    } @else {
                      <div
                        class="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                        [style.background-color]="getGuildColor(guild)"
                      >
                        {{ guild.name[0].toUpperCase() }}
                      </div>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-xl font-semibold truncate">
                      {{ getDisplayName(guild) }}
                    </h3>
                    <p class="text-gray-400 text-sm truncate">ID: {{ guild.id }}</p>
                  </div>
                  <a
                    [routerLink]="['/server', guild.id, 'stats']"
                    class="btn btn-secondary text-center whitespace-nowrap"
                  >
                    View
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading && !error && guilds.length === 0 && viewOnlyGuilds.length === 0 && guildsNeedingInvite.length === 0) {
        <div class="card text-center py-12">
          <p class="text-gray-400 text-lg">No servers found.</p>
          <p class="text-gray-500 text-sm mt-2">
            Make sure the bot is added to your Discord servers.
          </p>
        </div>
      }

      <!-- Global bot statistics -->
      <section class="mt-8" aria-labelledby="global-stats-heading">
        <h2 id="global-stats-heading" class="text-2xl font-bold mb-4">Global Stats</h2>
        @if (globalStatsLoading) {
          <div class="card text-center py-8" aria-live="polite">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p class="mt-3 text-gray-400">Loading global stats...</p>
          </div>
        } @else if (globalStatsError) {
          <div class="card bg-red-900/20 border-red-500 text-center py-8" role="alert">
            <p class="text-red-400 font-semibold">Unable to load global stats</p>
            <button type="button" (click)="loadGlobalStats()" class="btn btn-secondary mt-4">Retry</button>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
            <article class="card border-blue-500/40">
              <p class="text-sm font-medium uppercase tracking-wide text-blue-400">Linked users</p>
              <p class="mt-3 text-3xl font-bold">{{ linkedUsers }}</p>
              <p class="mt-2 text-sm text-gray-400">Discord users linked to their Minecraft account</p>
            </article>
            <article class="card border-purple-500/40">
              <p class="text-sm font-medium uppercase tracking-wide text-purple-400">Completed carries</p>
              <dl class="mt-3 space-y-3">
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Lifetime</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Last 30 days</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Last 7 days</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
              </dl>
              <p class="mt-4 text-sm text-gray-500">Trend comparisons are not implemented yet and are coming soon.</p>
            </article>
            <article class="card border-cyan-500/40">
              <p class="text-sm font-medium uppercase tracking-wide text-cyan-400">Total created tickets</p>
              <dl class="mt-3 space-y-3">
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Lifetime</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Last 30 days</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Last 7 days</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
              </dl>
              <p class="mt-4 text-sm text-gray-500">Trend comparisons are not implemented yet and are coming soon.</p>
            </article>
            <article class="card border-emerald-500/40">
              <p class="text-sm font-medium uppercase tracking-wide text-emerald-400">Unique carriers</p>
              <dl class="mt-3 space-y-3">
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Lifetime</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Last 30 days</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-gray-400">Last 7 days</dt>
                  <dd class="font-semibold">Coming soon</dd>
                </div>
              </dl>
              <p class="mt-4 text-sm text-gray-500">People who gained score by completing at least one carry.</p>
              <p class="mt-2 text-sm text-gray-500">Trend comparisons are not implemented yet and are coming soon.</p>
            </article>
            <article class="card border-red-500/40">
              <p class="text-sm font-medium uppercase tracking-wide text-red-400">Total flagged users</p>
              <p class="mt-3 text-3xl font-bold">Coming soon</p>
              <p class="mt-2 text-sm text-gray-400">Users flagged for illegitimate or harmful activity</p>
            </article>
          </div>
        }
      </section>

      <!-- CDN Upload Section (only for users with CDN permission) -->
      @if (hasCdnPermission) {
        <div class="card mt-8">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">CDN File Upload</h2>
            <button
              (click)="showUploadModal = true"
              class="btn btn-primary"
            >
              Upload File
            </button>
          </div>

          @if (uploadError) {
            <div class="mb-4 p-3 bg-red-900/20 border border-red-500 rounded">
              <p class="text-red-400 text-sm">{{ uploadError }}</p>
            </div>
          }

          @if (uploadHistory.length > 0) {
            <div>
              <h3 class="text-lg font-semibold mb-3">Recently Uploaded Files</h3>
              <div class="space-y-2">
                @for (upload of uploadHistory; track upload.url) {
                  <div class="p-3 bg-gray-700 rounded-lg">
                    <div class="flex justify-between items-start gap-4">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-gray-300 truncate">{{ upload.filename }}</p>
                        <a
                          [href]="upload.url"
                          target="_blank"
                          class="text-xs text-blue-400 hover:text-blue-300 break-all"
                        >
                          {{ upload.url }}
                        </a>
                        <p class="text-xs text-gray-500 mt-1">{{ formatTimestamp(upload.timestamp) }}</p>
                      </div>
                      <button
                        (click)="copyToClipboard(upload.url)"
                        class="btn btn-secondary text-xs px-2 py-1 whitespace-nowrap"
                        title="Copy URL"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          } @else {
            <p class="text-gray-400 text-sm">No files uploaded yet.</p>
          }
        </div>
      }

      <!-- Upload Modal -->
      @if (showUploadModal) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showUploadModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">Upload File to CDN</h3>
            <p class="text-sm text-gray-400 mb-4">Tip: You can paste an image from your clipboard using Ctrl+V</p>

            <div class="space-y-4">
              <div>
                <label class="label">Filename (optional)</label>
                <input
                  [(ngModel)]="uploadFilename"
                  type="text"
                  class="input"
                  placeholder="e.g. my-image (without extension)"
                />
                <small class="text-gray-400">Leave empty to generate a random name. Don't add an extension here.</small>
              </div>

              <!-- Drag and Drop Area -->
              <div
                (drop)="onDrop($event)"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                [class.border-blue-500]="isDragging"
                [class.bg-blue-900/20]="isDragging"
                class="border-2 border-dashed border-gray-600 rounded-lg p-6 transition-colors"
              >
                @if (!selectedFile) {
                  <div class="text-center">
                    <p class="text-gray-400 mb-2">Drag and drop a file here, or</p>
                    <label class="btn btn-secondary cursor-pointer inline-block">
                      <input
                        #fileInput
                        type="file"
                        class="hidden"
                        (change)="onFileSelected($event)"
                      />
                      Choose File
                    </label>
                  </div>
                } @else {
                  <div class="text-center">
                    <div class="flex items-center justify-center gap-2 mb-2">
                      <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span class="text-green-400 font-semibold">File Selected</span>
                    </div>
                    <p class="text-sm text-gray-300 mb-1">{{ selectedFile.name }}</p>
                    <p class="text-xs text-gray-400 mb-3">{{ formatFileSize(selectedFile.size) }}</p>
                    <div class="flex gap-2 justify-center">
                      <label class="btn btn-secondary text-sm cursor-pointer">
                        <input
                          type="file"
                          class="hidden"
                          (change)="onFileSelected($event)"
                        />
                        Change File
                      </label>
                      <button
                        (click)="removeSelectedFile()"
                        class="btn btn-secondary text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="closeUploadModal()" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                (click)="uploadFile()"
                class="btn btn-primary flex-1"
                [disabled]="!selectedFile || isUploading"
              >
                {{ isUploading ? 'Uploading...' : 'Upload' }}
              </button>
            </div>

            @if (uploadError) {
              <p class="text-red-400 text-sm mt-4">{{ uploadError }}</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private discordServerService = inject(DiscordServerControllerService);
  private discordUserService = inject(DiscordUserControllerService);
  private discordGuildService = inject(DiscordGuildService);
  private cdnService = inject(CdnService);
  private cdr = inject(ChangeDetectorRef);

  guilds: DiscordGuild[] = [];
  viewOnlyGuilds: DiscordGuild[] = [];
  guildsNeedingInvite: DiscordGuild[] = [];
  userInfo: any;
  loading = true;
  error: string | null = null;
  linkedUsers = '0';
  globalStatsLoading = true;
  globalStatsError = false;
  private globalStatsSubscription?: Subscription;

  // TODO: Remove this comment when global trend statistics are implemented. Request twice
  // the displayed period (60 days for a 30-day trend, or 14 days for a 7-day trend), subtract
  // the current period from that total to obtain the preceding period, then calculate the
  // percentage change as (current - preceding) / preceding * 100. The zero-preceding-period
  // case needs an explicit new-activity state rather than an infinite percentage.

  // CDN Upload
  hasCdnPermission = false;
  showUploadModal = false;
  uploadFilename = '';
  selectedFile: File | null = null;
  isUploading = false;
  uploadError: string | null = null;
  uploadHistory: Array<{url: string, filename: string, timestamp: Date}> = [];
  isDragging = false;

  ngOnInit() {
    this.userInfo = this.authService.getUserInfo();
    this.checkCdnPermission();
    this.loadGuilds();
    this.loadGlobalStats();
    this.setupPasteListener();
  }

  ngOnDestroy() {
    this.removePasteListener();
    this.globalStatsSubscription?.unsubscribe();
  }

  loadGlobalStats() {
    this.globalStatsSubscription?.unsubscribe();
    this.globalStatsLoading = true;
    this.globalStatsError = false;

    this.globalStatsSubscription = this.discordUserService.countLinkedUsers().subscribe({
      next: (count) => {
        this.linkedUsers = formatLinkedUserCount(count);
        this.globalStatsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.globalStatsLoading = false;
        this.globalStatsError = true;
        this.cdr.detectChanges();
      },
    });
  }

  private pasteHandler = (event: ClipboardEvent) => {
    if (!this.showUploadModal || !this.hasCdnPermission) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          this.selectedFile = file;

          // Always populate filename for pasted images
          const extension = file.type.split('/')[1];
          this.uploadFilename = `pasted-image-${Date.now()}`;

          this.cdr.detectChanges();
          event.preventDefault();
          break;
        }
      }
    }
  };

  private setupPasteListener() {
    document.addEventListener('paste', this.pasteHandler);
  }

  private removePasteListener() {
    document.removeEventListener('paste', this.pasteHandler);
  }

  checkCdnPermission() {
    const claims = this.authService.getUserInfo() ?? {};
    const permissions: string[] = claims['permissions'] || [];
    this.hasCdnPermission = permissions.includes('CDN');
  }

  loadGuilds() {
    // Get guilds and permissions from user info (from Keycloak token)
    const claims = this.authService.getUserInfo() ?? {};

    const allGuilds: DiscordGuild[] = this.discordGuildService.getAllGuilds();

    // Get permissions claim and extract server IDs where user has admin permissions
    const permissions: string[] = claims['permissions'] || [];
    const adminServerIds = new Set(
      permissions
        .filter(p => p.startsWith('server_'))
        .map(p => p.substring('server_'.length)) // Remove 'server_' prefix
    );

    // Load servers from API
    this.discordServerService.getAllServers().subscribe({
      next: (servers) => {
        // Handle case where API might return object instead of array
        let serverArray: any[] = [];
        if (Array.isArray(servers)) {
          serverArray = servers;
        } else if (servers && typeof servers === 'object') {
          serverArray = (servers as any).content || (servers as any).data || (servers as any).servers || [];
        }

        // Get server IDs where bot has access
        const serverIds = new Set(serverArray.map((s: any) => s.id?.toString()));

        const categorizedGuilds = categorizeGuilds(allGuilds, adminServerIds, serverIds);
        this.guilds = categorizedGuilds.editable;
        this.viewOnlyGuilds = categorizedGuilds.viewOnly;
        this.guildsNeedingInvite = categorizedGuilds.needingInvite;

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.status === 401
          ? 'Unauthorized: Please log out and log in again'
          : `Failed to load servers: ${err.message || err.statusText || 'Unknown error'}`;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getIconUrl(guild: DiscordGuild): string {
    return this.discordGuildService.getIconUrl(guild);
  }

  getGuildColor(guild: DiscordGuild): string {
    return this.discordGuildService.getGuildColor(guild);
  }

  getDisplayName(guild: DiscordGuild): string {
    return this.discordGuildService.getDisplayName(guild);
  }

  logout() {
    this.authService.logout();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];

      // Always populate filename from the new file
      if (this.selectedFile) {
        // Remove extension from filename
        const nameWithoutExt = this.selectedFile.name.replace(/\.[^/.]+$/, '');
        this.uploadFilename = nameWithoutExt;
      }
    }
  }

  removeSelectedFile() {
    this.selectedFile = null;
    this.uploadFilename = '';
    this.cdr.detectChanges();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];

      // Always populate filename from the new file
      if (this.selectedFile) {
        // Remove extension from filename
        const nameWithoutExt = this.selectedFile.name.replace(/\.[^/.]+$/, '');
        this.uploadFilename = nameWithoutExt;
      }

      this.cdr.detectChanges();
    }
  }

  uploadFile() {
    if (!this.selectedFile || this.isUploading) return;

    this.isUploading = true;
    this.uploadError = null;

    // Use filename from input (if cleared, CDN will generate random UUID)
    const filename = this.uploadFilename.trim();
    const originalFilename = this.selectedFile.name;

    this.cdnService.uploadFile(filename, this.selectedFile).subscribe({
      next: (url) => {
        // Add to upload history
        this.uploadHistory.unshift({
          url,
          filename: filename || originalFilename,
          timestamp: new Date()
        });

        // Keep only the last 10 uploads
        if (this.uploadHistory.length > 10) {
          this.uploadHistory = this.uploadHistory.slice(0, 10);
        }

        // Reset uploading state and close modal
        this.isUploading = false;
        this.closeUploadModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadError = err.error?.message || 'Failed to upload file';
        this.isUploading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadFilename = '';
    this.selectedFile = null;
    this.uploadError = null;
    this.isDragging = false;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here if desired
      console.log('Copied to clipboard:', text);
    });
  }
}
