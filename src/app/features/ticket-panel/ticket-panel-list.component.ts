import { CommonModule } from "@angular/common";
import {
	ChangeDetectorRef,
	Component,
	DestroyRef,
	inject,
	type OnInit,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import {
	TicketPanelControllerService,
	type TicketPanelCreationModel,
	type TicketPanelModel,
} from "@dungeon-hub/api-client";
import { DiscordGuildService } from "../../core/services/discord-guild.service";
import type { TicketPanelImport } from "./ticket-panel-transfer";
import {
	detachServerBoundFields,
	findImportConflict,
	hasDuplicatePanelName,
	isTicketPanelExport,
	parseTicketPanelExports,
	SERVER_BOUND_TICKET_PANEL_FIELDS,
	serializeTicketPanel,
	serializeTicketPanels,
	toTicketPanelCreation,
	toTicketPanelUpdate,
} from "./ticket-panel-transfer";

const DEFAULT_TICKET_PANEL: Omit<
	TicketPanelCreationModel,
	"name" | "displayName" | "emoji"
> = {
	closeable: false,
	closeConfirmation: false,
	claimable: false,
	requiresLinking: false,
	openChannelName: "{panel.name}-{ticket.count}",
	ticketMessage:
		'{"content":"Welcome, {user.mention}!\\nPlease describe your {panel.name} request below further."}',
	userTranscriptDm: '["transcript"]',
	permissions: {
		SupportTeam: { Allowed: "68608" },
		AdditionalRoles: { Allowed: "68608" },
		TicketCreator: { Allowed: "68608" },
		TicketClaimer: { Allowed: "68608" },
		Everyone: { Denied: "1024" },
	},
};

@Component({
	selector: "app-ticket-panel-list",
	standalone: true,
	imports: [CommonModule, RouterLink, FormsModule],
	template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-8">
        <a [routerLink]="['/server', serverId]" class="btn btn-secondary mb-4 inline-block">
          ← Back to Server
        </a>
        <h2 class="text-3xl font-bold holographic">{{ serverName }}</h2>
      </div>

      @if (loadError) {
        <div class="card bg-red-900/20 border-red-500 mb-8">
          <div class="flex justify-between items-center">
            <p class="text-red-400">{{ loadError }}</p>
            <button (click)="loadTicketPanels()" class="btn btn-secondary">Retry</button>
          </div>
        </div>
      }

      <div class="card">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-semibold">Ticket Panels</h3>
          <div class="flex gap-2">
            <button
              (click)="openExportAllModal()"
              [disabled]="ticketPanels.length === 0"
              class="btn btn-secondary"
              title="Export all ticket panels"
            >
              ⇩ Export All
            </button>
            <button (click)="openImportSourceModal()" class="btn btn-secondary">⇧ Import</button>
            <button (click)="openCreateModal()" class="btn btn-primary">＋ New Panel</button>
          </div>
        </div>

        @if (ticketPanels.length > 0) {
          <div class="space-y-4">
            @for (panel of ticketPanels; track panel.id) {
              <div
                class="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group flex justify-between items-center"
              >
                <a [routerLink]="['/server', serverId, 'ticket-panel', panel.id]" class="flex-1">
                  <div class="flex justify-between items-center">
                    <div class="flex-1">
                      <div class="flex items-center gap-4">
                        <span
                          class="text-lg font-semibold group-hover:text-blue-400 transition-colors"
                        >
                          {{ panel.displayName || panel.name }}
                        </span>
                        <span class="text-sm text-gray-400">#{{ panel.id }}</span>
                      </div>
                    </div>
                  </div>
                </a>
                <div class="flex gap-2 ml-4">
                  <button
                    (click)="openExportModal(panel)"
                    class="btn btn-secondary"
                    title="Export panel"
                  >
                    ⇩ Export
                  </button>
                  <button
                    (click)="openCopyModal(panel)"
                    class="btn btn-secondary"
                    title="Clone panel"
                  >
                    ⧉ Clone
                  </button>
                  <a
                    [routerLink]="['/server', serverId, 'ticket-panel', panel.id]"
                    class="text-gray-400 p-2"
                    [attr.aria-label]="'Open ' + (panel.displayName || panel.name)"
                    >→</a
                  >
                </div>
              </div>
            }
          </div>
        }

        @if (ticketPanels.length === 0 && !loadError) {
          <p class="text-gray-400 text-center py-8">
            No ticket panels created yet. Click "New Panel" to create one.
          </p>
        }
      </div>

      @if (showExportModal && (exportTarget || exportAllSelected)) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="card max-w-md w-full mx-4">
            <h3 class="text-xl font-semibold mb-3">
              {{ exportAllSelected ? 'Export All Ticket Panels' : 'Export Ticket Panel' }}
            </h3>
            <p class="text-gray-400 mb-6">Where should the panel data be sent?</p>
            <div class="flex gap-3">
              <button (click)="closeExportModal()" class="btn btn-secondary">Cancel</button>
              <button (click)="copyExportToClipboard()" class="btn btn-secondary flex-1">
                Copy to Clipboard
              </button>
              <button (click)="downloadExport()" class="btn btn-primary flex-1">
                Download JSON
              </button>
            </div>
            @if (transferMessage) {
              <p
                class="text-sm mt-4"
                [class.text-red-400]="transferError"
                [class.text-green-400]="!transferError"
              >
                {{ transferMessage }}
              </p>
            }
          </div>
        </div>
      }

      @if (showImportSourceModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="card max-w-lg w-full mx-4">
            <h3 class="text-xl font-semibold mb-3">Import Ticket Panel</h3>
            <p class="text-gray-400 mb-4">
              Choose a JSON file or use valid ticket panel data from your clipboard.
            </p>
            <button
              class="w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors"
              [class.border-blue-400]="isDragging"
              [class.bg-blue-900]="isDragging"
              [class.border-gray-500]="!isDragging"
              (click)="importInput.click()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)"
            >
              <span class="block text-lg">Drop a ticket panel JSON file here</span>
              <span class="block text-gray-400 text-sm mt-1">or click to select a file</span>
            </button>
            <input
              #importInput
              type="file"
              accept="application/json,.json"
              class="hidden"
              (change)="importPanel($event)"
            />
            <button
              (click)="importFromClipboard()"
              [disabled]="!clipboardHasValidPanel"
              class="btn w-full mt-3"
              [class.btn-primary]="clipboardHasValidPanel"
              [class.btn-secondary]="!clipboardHasValidPanel"
            >
              Use Clipboard
            </button>
            <small class="block text-gray-400 mt-2">
              {{
                clipboardHasValidPanel
                  ? 'Valid ticket panel data found in clipboard.'
                  : clipboardAccessDenied
                    ? 'Clipboard access was denied. Select a JSON file instead.'
                    : 'Clipboard does not contain valid ticket panel JSON.'
              }}
            </small>
            @if (transferMessage) {
              <p class="text-red-400 text-sm mt-3">{{ transferMessage }}</p>
            }
            <button (click)="closeImportSourceModal()" class="btn btn-secondary w-full mt-4">
              Cancel
            </button>
          </div>
        </div>
      }

      @if (showImportSelectionModal) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="card max-w-lg w-full mx-4">
            <h3 class="text-xl font-semibold mb-3">Select Ticket Panels to Import</h3>
            <p class="text-gray-400 mb-4">
              This file contains multiple ticket panels. Choose which panels should continue through
              the import flow.
            </p>
            <div class="space-y-3 max-h-80 overflow-y-auto mb-4">
              @for (candidate of importCandidates; track candidate.index) {
                <label class="flex items-center gap-3 bg-gray-700 rounded-lg p-3">
                  <input type="checkbox" [(ngModel)]="candidate.selected" />
                  <span>
                    {{ candidate.imported.panel.displayName || candidate.imported.panel.name }}
                    <span class="text-gray-400">({{ candidate.imported.panel.name }})</span>
                  </span>
                </label>
              }
            </div>
            @if (createError) {
              <p class="text-red-400 text-sm mb-4">{{ createError }}</p>
            }
            <div class="flex gap-3">
              <button (click)="cancelImport()" class="btn btn-secondary flex-1">Cancel</button>
              <button (click)="confirmSelectedImports()" class="btn btn-primary flex-1">
                Continue
              </button>
            </div>
          </div>
        </div>
      }

      @if (importConflict) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="card max-w-lg w-full mx-4">
            <h3 class="text-xl font-semibold mb-4">Existing Ticket Panel Found</h3>
            <p class="text-gray-300 mb-2">
              The imported ID and name match
              <strong>{{ importConflict.displayName || importConflict.name }}</strong
              >.
            </p>
            <p class="text-gray-400 mb-6">
              Overwrite its settings, or create a separate panel from the imported settings?
            </p>
            @if (createError) {
              <p class="text-red-400 text-sm mb-4">{{ createError }}</p>
            }
            <div class="flex flex-wrap gap-3">
              <button (click)="cancelImport()" [disabled]="isCreating" class="btn btn-secondary">
                Cancel
              </button>
              <button
                (click)="createNewFromConflict()"
                [disabled]="isCreating"
                class="btn btn-secondary flex-1"
              >
                Create New
              </button>
              <button
                (click)="overwriteImport()"
                [disabled]="isCreating"
                class="btn btn-primary flex-1"
              >
                {{ isCreating ? 'Overwriting...' : 'Overwrite Existing' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (showCreateModal) {
        <div
          class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          (click)="showCreateModal = false"
        >
          <div class="card max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-semibold mb-4">
              {{ pendingPanel ? modalTitle : 'Create New Ticket Panel' }}
            </h3>
            @if (pendingPanel) {
              <p class="text-gray-400 mb-4">
                Choose a new, unique internal and display name. The original panel will not be
                changed.
              </p>
            }

            <div class="space-y-4">
              <div>
                <label class="label">Internal Name *</label>
                <input
                  [(ngModel)]="newPanel.name"
                  type="text"
                  class="input"
                  placeholder="e.g. support_ticket"
                  required
                />
                <small class="text-gray-400">Unique identifier for the system</small>
              </div>

              <div>
                <label class="label">Display Name {{ pendingPanel ? '*' : '' }}</label>
                <input
                  [(ngModel)]="newPanel.displayName"
                  type="text"
                  class="input"
                  placeholder="e.g. Support Ticket"
                />
                <small class="text-gray-400">Shown to users on the button</small>
              </div>

              @if (newPanel.name.trim() && newPanel.displayName.trim() && !canCreate) {
                <p class="text-red-400 text-sm">
                  That internal name or display name is already in use.
                </p>
              }

              <div>
                <label class="label">Emoji</label>
                <input
                  [(ngModel)]="newPanel.emoji"
                  type="text"
                  class="input"
                  placeholder="🎫 or <:name:id>"
                />
                <small class="text-gray-400">Unicode emoji or custom Discord emoji</small>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="showCreateModal = false" class="btn btn-secondary flex-1">
                Cancel
              </button>
              <button
                (click)="createPanel()"
                class="btn btn-primary flex-1"
                [disabled]="!canCreate || isCreating"
              >
                {{ isCreating ? 'Creating...' : pendingPanel ? 'Create Copy' : 'Create' }}
              </button>
            </div>

            @if (createError) {
              <p class="text-red-400 text-sm mt-4">{{ createError }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class TicketPanelListComponent implements OnInit {
	private route = inject(ActivatedRoute);
	private ticketPanelService = inject(TicketPanelControllerService);
	private discordGuildService = inject(DiscordGuildService);
	private cdr = inject(ChangeDetectorRef);
	private destroyRef = inject(DestroyRef);

	serverId!: string;
	serverName = "Server";
	ticketPanels: TicketPanelModel[] = [];
	loadError: string | null = null;

	showCreateModal = false;
	isCreating = false;
	createError: string | null = null;
	newPanel = {
		name: "",
		displayName: "",
		emoji: "",
	};
	pendingPanel: TicketPanelCreationModel | null = null;
	pendingImportServer: string | undefined;
	importConflict: TicketPanelModel | null = null;
	importCandidates: {
		index: number;
		imported: TicketPanelImport;
		selected: boolean;
	}[] = [];
	pendingImportQueue: TicketPanelImport[] = [];
	createdPanelNames: Pick<TicketPanelModel, "name" | "displayName">[] = [];
	showImportSelectionModal = false;
	modalTitle = "";
	showExportModal = false;
	showImportSourceModal = false;
	exportTarget: TicketPanelModel | null = null;
	exportAllSelected = false;
	clipboardContents = "";
	clipboardHasValidPanel = false;
	clipboardAccessDenied = false;
	isDragging = false;
	transferMessage: string | null = null;
	transferError = false;

	get canCreate(): boolean {
		const name = this.newPanel.name.trim();
		const displayName = this.newPanel.displayName.trim();
		return (
			!!name &&
			(!this.pendingPanel || !!displayName) &&
			!hasDuplicatePanelName(
				[...this.ticketPanels, ...this.createdPanelNames],
				name,
				displayName,
			)
		);
	}

	openCreateModal() {
		this.pendingPanel = null;
		this.pendingImportServer = undefined;
		this.createdPanelNames = [];
		this.newPanel = { name: "", displayName: "", emoji: "" };
		this.createError = null;
		this.showCreateModal = true;
	}

	openCopyModal(panel: TicketPanelModel) {
		this.pendingPanel = toTicketPanelCreation(panel);
		this.pendingImportServer = this.serverId;
		this.modalTitle = "Clone Ticket Panel";
		this.newPanel = { name: "", displayName: "", emoji: panel.emoji || "" };
		this.createError = null;
		this.showCreateModal = true;
	}

	async importPanel(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = "";
		if (!file) return;
		await this.importFile(file);
	}

	async openImportSourceModal() {
		this.showImportSourceModal = true;
		this.transferMessage = null;
		this.clipboardContents = "";
		this.clipboardHasValidPanel = false;
		this.clipboardAccessDenied = false;
		try {
			this.clipboardContents = await navigator.clipboard.readText();
			this.clipboardHasValidPanel = isTicketPanelExport(this.clipboardContents);
		} catch {
			this.clipboardAccessDenied = true;
		}
		if (!this.destroyRef.destroyed) this.cdr.detectChanges();
	}

	closeImportSourceModal() {
		this.showImportSourceModal = false;
		this.isDragging = false;
		this.transferMessage = null;
	}

	importFromClipboard() {
		if (this.clipboardHasValidPanel)
			void this.processImport(this.clipboardContents);
	}

	onDragOver(event: DragEvent) {
		event.preventDefault();
		this.isDragging = true;
	}

	onDragLeave(event: DragEvent) {
		event.preventDefault();
		this.isDragging = false;
	}

	async onFileDrop(event: DragEvent) {
		event.preventDefault();
		this.isDragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) await this.importFile(file);
	}

	private async importFile(file: Pick<File, "text">) {
		try {
			await this.processImport(await file.text());
		} catch {
			this.transferMessage =
				"Could not read ticket panel export. Choose a valid ticket panel JSON file.";
		}
	}

	private async processImport(contents: string) {
		try {
			const imports = parseTicketPanelExports(contents);
			this.createError = null;
			this.showImportSourceModal = false;
			if (imports.length > 1) {
				this.importCandidates = imports.map((imported, index) => ({
					index,
					imported,
					selected: true,
				}));
				this.showImportSelectionModal = true;
				return;
			}
			this.startImportQueue(imports);
		} catch {
			this.transferMessage =
				"Could not read ticket panel export. Choose a valid ticket panel JSON file.";
		}
	}

	confirmSelectedImports() {
		const selectedImports = this.importCandidates
			.filter((candidate) => candidate.selected)
			.map((candidate) => candidate.imported);
		if (selectedImports.length === 0) {
			this.createError = "Select at least one ticket panel to import.";
			return;
		}
		this.importCandidates = [];
		this.showImportSelectionModal = false;
		this.startImportQueue(selectedImports);
	}

	private startImportQueue(imports: TicketPanelImport[]) {
		this.createdPanelNames = [];
		this.pendingImportQueue = [...imports];
		this.openNextPendingImport();
	}

	private openNextPendingImport() {
		const imported = this.pendingImportQueue.shift();
		if (!imported) {
			this.pendingPanel = null;
			this.pendingImportServer = undefined;
			this.importConflict = null;
			return;
		}
		this.pendingPanel = imported.panel;
		this.pendingImportServer = imported.server;
		this.importConflict =
			findImportConflict(this.ticketPanels, imported) || null;
		if (!this.importConflict) this.openImportedNameModal();
	}

	private finishCurrentImport() {
		this.importConflict = null;
		this.pendingPanel = null;
		this.pendingImportServer = undefined;
		if (this.pendingImportQueue.length > 0) {
			this.openNextPendingImport();
		}
	}

	createNewFromConflict() {
		if (this.isCreating) return;
		this.importConflict = null;
		this.createError = null;
		this.openImportedNameModal();
	}

	overwriteImport() {
		if (!this.importConflict || !this.pendingPanel || this.isCreating) return;
		this.isCreating = true;
		this.createError = null;
		this.ticketPanelService
			.updateTicketPanel(
				this.serverId,
				this.importConflict.id,
				toTicketPanelUpdate(
					this.pendingPanel,
					this.pendingImportServer === this.serverId
						? undefined
						: SERVER_BOUND_TICKET_PANEL_FIELDS,
				),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.isCreating = false;
					this.finishCurrentImport();
					this.loadTicketPanels();
				},
				error: (err) => {
					this.isCreating = false;
					this.createError =
						err.error?.message || "Failed to overwrite ticket panel";
					this.cdr.detectChanges();
				},
			});
	}

	cancelImport() {
		this.importConflict = null;
		this.pendingPanel = null;
		this.pendingImportServer = undefined;
		this.pendingImportQueue = [];
		this.importCandidates = [];
		this.createdPanelNames = [];
		this.showImportSelectionModal = false;
		this.createError = null;
	}

	private openImportedNameModal() {
		if (!this.pendingPanel) return;
		this.modalTitle = "Import Ticket Panel";
		this.newPanel = {
			name: "",
			displayName: "",
			emoji: this.pendingPanel.emoji || "",
		};
		this.showCreateModal = true;
	}

	openExportModal(panel: TicketPanelModel) {
		this.exportTarget = panel;
		this.exportAllSelected = false;
		this.showExportModal = true;
		this.transferMessage = null;
		this.transferError = false;
	}

	openExportAllModal() {
		if (this.ticketPanels.length === 0) return;
		this.exportTarget = null;
		this.exportAllSelected = true;
		this.showExportModal = true;
		this.transferMessage = null;
		this.transferError = false;
	}

	closeExportModal() {
		this.showExportModal = false;
		this.exportTarget = null;
		this.exportAllSelected = false;
		this.transferMessage = null;
	}

	async copyExportToClipboard() {
		const serialized = this.getExportContents();
		if (!serialized) return;
		try {
			await navigator.clipboard.writeText(serialized);
			this.transferMessage = this.exportAllSelected
				? "Ticket panel backup copied to the clipboard."
				: "Ticket panel data copied to the clipboard.";
			this.transferError = false;
		} catch {
			this.transferMessage =
				"Clipboard access was denied. Please download the JSON file instead.";
			this.transferError = true;
		}
		if (!this.destroyRef.destroyed) this.cdr.detectChanges();
	}

	downloadExport() {
		const serialized = this.getExportContents();
		if (!serialized) return;
		let url: string | null = null;
		try {
			const blob = new Blob([serialized], {
				type: "application/json",
			});
			url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = this.exportAllSelected
				? "ticket-panels.backup.json"
				: `${this.exportTarget?.name}.ticket-panel.json`;
			document.body.appendChild(link);
			try {
				link.click();
			} finally {
				link.remove();
			}
			this.closeExportModal();
		} catch {
			this.transferMessage =
				"Could not download the ticket panel export. Please try again.";
			this.transferError = true;
		} finally {
			if (url) {
				const allocatedUrl = url;
				setTimeout(() => URL.revokeObjectURL(allocatedUrl), 0);
			}
		}
	}

	private getExportContents(): string | null {
		if (this.exportAllSelected) return serializeTicketPanels(this.ticketPanels);
		return this.exportTarget ? serializeTicketPanel(this.exportTarget) : null;
	}

	ngOnInit() {
		this.serverId = this.route.snapshot.params["serverId"];
		const guild = this.discordGuildService.getGuildById(this.serverId);
		this.serverName = guild
			? this.discordGuildService.getDisplayName(guild)
			: "Server";
		this.loadTicketPanels();
	}

	loadTicketPanels() {
		this.loadError = null;
		this.ticketPanelService
			.getAllTicketPanels(this.serverId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (panels) => {
					this.ticketPanels = panels || [];
					this.cdr.detectChanges();
				},
				error: (err) => {
					this.loadError = "Failed to load ticket panels. Please try again.";
					console.error("Error loading ticket panels:", err);
					this.cdr.detectChanges();
				},
			});
	}

	createPanel() {
		const trimmedName = this.newPanel.name.trim();
		if (this.isCreating) return;
		if (this.pendingPanel && !this.newPanel.displayName.trim()) {
			this.createError =
				"A display name is required for cloned and imported ticket panels.";
			return;
		}
		if (!this.canCreate) {
			this.createError = "Internal and display names must be unique.";
			return;
		}

		this.isCreating = true;
		this.createError = null;

		const pendingPanel =
			this.pendingPanel && this.pendingImportServer !== this.serverId
				? detachServerBoundFields(this.pendingPanel)
				: this.pendingPanel;
		const creationModel: TicketPanelCreationModel = structuredClone({
			...DEFAULT_TICKET_PANEL,
			...pendingPanel,
			name: trimmedName,
			displayName: this.newPanel.displayName.trim() || undefined,
			emoji: this.newPanel.emoji.trim() || undefined,
		});

		this.ticketPanelService
			.createNewTicketPanel(this.serverId, creationModel)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.showCreateModal = false;
					this.createdPanelNames.push({
						name: creationModel.name,
						displayName: creationModel.displayName,
					});
					this.newPanel = { name: "", displayName: "", emoji: "" };
					this.isCreating = false;
					this.finishCurrentImport();
					this.loadTicketPanels();
				},
				error: (err) => {
					this.createError =
						err.error?.message || "Failed to create ticket panel";
					this.isCreating = false;
					this.cdr.detectChanges();
				},
			});
	}
}
