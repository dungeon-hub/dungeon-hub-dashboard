import { CommonModule } from "@angular/common";
import {
	ChangeDetectorRef,
	Component,
	EventEmitter,
	Input,
	inject,
	type OnInit,
	Output,
} from "@angular/core";
import { FormsModule } from "@angular/forms";

let nextInstanceId = 1;

@Component({
	selector: "app-embed-editor",
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
    <div class="flex flex-col gap-3 -mt-8">
      <div class="flex justify-end">
        <div class="inline-flex rounded-md border border-gray-600 bg-gray-900 p-0.5" role="group" aria-label="Embed editor mode">
          <button
            type="button"
            (click)="setMode('editor')"
            [attr.aria-pressed]="mode === 'editor'"
            class="mode-option"
            [class.mode-option-active]="mode === 'editor'"
          >
            Visual
          </button>
          <button
            type="button"
            (click)="setMode('raw')"
            [attr.aria-pressed]="mode === 'raw'"
            class="mode-option"
            [class.mode-option-active]="mode === 'raw'"
          >
            JSON
          </button>
        </div>
      </div>

      @if (mode === "raw") {
        <textarea
          rows="10"
          [(ngModel)]="rawText"
          [attr.aria-invalid]="parseError ? 'true' : null"
          [attr.aria-describedby]="parseError ? parseErrorId : null"
          (input)="onRawTextInput()"
          class="input font-mono text-sm"
          [class.border-red-500]="parseError"
          spellcheck="false"
        ></textarea>
      }

      @if (parseError) {
        <p [id]="parseErrorId" class="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {{ parseError }}
        </p>
      }

      @if (mode === "editor") {
        @if (entries.length === 0) {
          <div class="rounded-lg border border-dashed border-gray-600 px-4 py-6 text-center text-sm text-gray-400">
            No embeds yet. Add one to get started.
          </div>
        }

        @for (entry of entries; track entry.id) {
          <section
            class="rounded-lg border border-gray-700 border-l-4 bg-gray-900/50"
            [style.border-left-color]="entry.kind === 'custom' ? null : colorPreview(entry)"
            [class.border-l-gray-500]="entry.kind === 'custom' || !colorPreview(entry)"
          >
            <header class="flex items-center justify-between gap-2 border-b border-gray-700 px-3 py-2">
              <div class="flex min-w-0 items-baseline gap-2">
                <span class="whitespace-nowrap text-sm font-semibold text-gray-200">
                  {{ entry.kind === "custom" ? "Custom embed" : "Embed" }} {{ $index + 1 }}
                </span>
                @if (entry.kind === "custom" ? entry.customType : entry.title) {
                  <span class="truncate text-sm text-gray-400">
                    {{ entry.kind === "custom" ? entry.customType : entry.title }}
                  </span>
                }
              </div>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  (click)="moveEntry(entry, -1)"
                  [disabled]="$index === 0"
                  class="icon-button"
                  title="Move up"
                  aria-label="Move embed up"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 15l6-6l6 6"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  (click)="moveEntry(entry, 1)"
                  [disabled]="$index === entries.length - 1"
                  class="icon-button"
                  title="Move down"
                  aria-label="Move embed down"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6l6-6"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  (click)="removeEntry(entry)"
                  class="icon-button icon-button-danger"
                  title="Delete embed"
                  aria-label="Delete embed"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7l16 0M10 4l4 0l0 3M10 4l-4 0l0 3M7 9l10 0M7 19l10 0M7 9l0 10M17 9l0 10"></path>
                  </svg>
                </button>
              </div>
            </header>

            <div class="flex flex-col gap-4 p-3">
              @if (entry.kind === "custom") {
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label class="field-label">
                    Custom embed type
                    <input type="text" [(ngModel)]="entry.customType" class="input" />
                  </label>
                  <label class="field-label">
                    Custom data
                    <input type="text" [(ngModel)]="entry.customData" class="input" />
                  </label>
                </div>
              } @else {
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label class="field-label">
                    Title
                    <input type="text" [(ngModel)]="entry.title" class="input" />
                  </label>
                  <label class="field-label">
                    Title URL
                    <input type="url" [(ngModel)]="entry.url" class="input" placeholder="https://" />
                  </label>
                  <label class="field-label md:col-span-2">
                    Description
                    <textarea rows="3" [(ngModel)]="entry.description" class="input"></textarea>
                  </label>
                  <label class="field-label">
                    Color
                    <span class="flex gap-2">
                      <input
                        type="color"
                        [value]="colorPreview(entry) ?? '#5865f2'"
                        (input)="entry.color = $any($event.target).value"
                        class="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-gray-600 bg-gray-700 p-1"
                        aria-label="Pick embed color"
                      />
                      <input type="text" [(ngModel)]="entry.color" class="input font-mono" placeholder="#5865f2" />
                    </span>
                  </label>
                  <label class="field-label">
                    Timestamp (ms)
                    <input type="text" inputmode="numeric" [(ngModel)]="entry.timestamp" class="input font-mono" />
                  </label>
                </div>

                <fieldset class="group-box">
                  <legend class="group-legend">Images</legend>
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label class="field-label">
                      Image URL
                      <input type="url" [(ngModel)]="entry.image" class="input" placeholder="https://" />
                    </label>
                    <label class="field-label">
                      Thumbnail URL
                      <input type="url" [(ngModel)]="entry.thumbnailUrl" class="input" placeholder="https://" />
                    </label>
                  </div>
                </fieldset>

                <fieldset class="group-box">
                  <legend class="group-legend">Author</legend>
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label class="field-label">
                      Name
                      <input type="text" [(ngModel)]="entry.authorName" class="input" />
                    </label>
                    <label class="field-label">
                      URL
                      <input type="url" [(ngModel)]="entry.authorUrl" class="input" placeholder="https://" />
                    </label>
                    <label class="field-label">
                      Icon URL
                      <input type="url" [(ngModel)]="entry.authorIcon" class="input" placeholder="https://" />
                    </label>
                  </div>
                </fieldset>

                <fieldset class="group-box">
                  <legend class="group-legend">Footer</legend>
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label class="field-label">
                      Text
                      <input type="text" [(ngModel)]="entry.footerText" class="input" />
                    </label>
                    <label class="field-label">
                      Icon URL
                      <input type="url" [(ngModel)]="entry.footerIcon" class="input" placeholder="https://" />
                    </label>
                  </div>
                </fieldset>

                <fieldset class="group-box">
                  <legend class="group-legend">Fields</legend>
                  <div class="flex flex-col gap-2">
                    @for (field of entry.fields; track field.id) {
                      <div class="flex flex-col gap-3 rounded-md border border-gray-700 bg-gray-800 p-3 md:flex-row md:items-end">
                        <div class="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                          <label class="field-label">
                            Name
                            <input type="text" [(ngModel)]="field.name" class="input" />
                          </label>
                          <label class="field-label">
                            Value
                            <input type="text" [(ngModel)]="field.value" class="input" />
                          </label>
                        </div>
                        <div class="flex items-center justify-between gap-3 md:h-10">
                          <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300">
                            <input type="checkbox" [(ngModel)]="field.inline" class="h-4 w-4 accent-blue-500" />
                            Inline
                          </label>
                          <div class="flex gap-1">
                            <button
                              type="button"
                              (click)="moveField(entry, field, -1)"
                              [disabled]="$index === 0"
                              class="icon-button"
                              title="Move field up"
                              aria-label="Move field up"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 15l6-6l6 6"></path>
                              </svg>
                            </button>
                            <button
                              type="button"
                              (click)="moveField(entry, field, 1)"
                              [disabled]="$index === entry.fields.length - 1"
                              class="icon-button"
                              title="Move field down"
                              aria-label="Move field down"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6l6-6"></path>
                              </svg>
                            </button>
                            <button
                              type="button"
                              (click)="removeField(entry, field)"
                              class="icon-button icon-button-danger"
                              title="Delete field"
                              aria-label="Delete field"
                            >
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7l16 0M10 4l4 0l0 3M10 4l-4 0l0 3M7 9l10 0M7 19l10 0M7 9l0 10M17 9l0 10"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                    <button type="button" (click)="addField(entry)" class="add-button self-start" title="Add field at the end">
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-width="2" d="M12 5l0 14M5 12l14 0"></path>
                      </svg>
                      Add field
                    </button>
                  </div>
                </fieldset>
              }
            </div>
          </section>
        }

        <div class="flex flex-wrap gap-2">
          <button type="button" (click)="addEntry()" class="add-button" title="Add embed at the end">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-width="2" d="M12 5l0 14M5 12l14 0"></path>
            </svg>
            Add embed
          </button>
          @if (allowCustomEmbeds) {
            <button type="button" (click)="addCustomEntry()" class="add-button" title="Add custom embed at the end">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-width="2" d="M12 5l0 14M5 12l14 0"></path>
              </svg>
              Add custom embed
            </button>
          }
        </div>
      }
    </div>
  `,
	styles: [
		`
    .mode-option {
      @apply rounded px-3 py-0.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500;
    }

    .mode-option-active {
      @apply bg-gray-700 text-gray-100;
    }

    .field-label {
      @apply flex flex-col gap-1 text-sm font-medium text-gray-300;
    }

    .group-box {
      @apply rounded-md border border-gray-700 px-3 pb-3 pt-1;
    }

    .group-legend {
      @apply px-1 text-xs font-semibold uppercase tracking-wide text-gray-400;
    }

    .icon-button {
      @apply inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400;
    }

    .icon-button-danger {
      @apply text-red-400 hover:bg-red-950/50 hover:text-red-300;
    }

    .add-button {
      @apply inline-flex items-center gap-2 rounded-md border border-dashed border-gray-600 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-blue-500 hover:text-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500;
    }
  `,
	],
})
export class EmbedEditorComponent implements OnInit {
	private cdr = inject(ChangeDetectorRef);

	@Input() embedJson: string = "";
	@Input() allowCustomEmbeds: boolean = false;
	@Output() embedJsonChange = new EventEmitter<string>();

	entries: EmbedEntry[] = [];
	rawText = "";
	mode = "raw";
	parseError: string | null = null;
	private wasArray = false;
	private nextId = 1;
	private lastEmitted: string | null = null;
	readonly parseErrorId = `embed-editor-parse-error-${nextInstanceId++}`;

	ngOnInit() {
		this.rawText = this.embedJson ?? "";
		this.lastEmitted = this.rawText;
		this.mode = "editor";
		this.entries = [];
		this.parseError = null;
		if (!this.parse(this.rawText)) {
			this.mode = "raw";
		}
	}

	toggleMode() {
		if (this.mode === "raw") {
			this.entries = [];
			this.parseError = null;
			if (!this.parse(this.rawText)) {
				this.mode = "raw";
				this.cdr.detectChanges();
				return;
			}
			this.mode = "editor";
		} else {
			this.mode = "raw";
			this.rawText = this.serialize();
			this.emitChange(this.rawText);
		}
		this.cdr.detectChanges();
	}

	setMode(mode: "raw" | "editor") {
		if (this.mode !== mode) this.toggleMode();
	}

	/** The embed color as a #rrggbb value usable for previews, or null if it is not one. */
	colorPreview(entry: EmbedEntry): string | null {
		const color = entry.color?.trim();
		return color && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null;
	}

	addEntry() {
		this.entries.push(this.wrapEntry(this.createEntry()));
		this.commit();
	}

	addCustomEntry() {
		if (!this.allowCustomEmbeds) return;
		this.entries.push(
			this.wrapEntry({
				...this.createEntry(),
				kind: "custom",
				customType: "",
			}),
		);
		this.commit();
	}

	removeEntry(entry: EmbedEntry) {
		const index = this.entries.findIndex((it) => it.id === entry.id);
		if (index === -1) return;
		this.entries.splice(index, 1);
		this.commit();
	}

	moveEntry(entry: EmbedEntry, delta: number) {
		const from = this.entries.findIndex((it) => it.id === entry.id);
		if (from === -1) return;
		const to = Math.min(Math.max(from + delta, 0), this.entries.length - 1);
		if (from === to) return;
		const [moved] = this.entries.splice(from, 1);
		this.entries.splice(to, 0, moved);
		this.commit();
	}

	addField(entry: EmbedEntry) {
		entry.fields.push(this.wrapField(this.createField()));
		this.commit();
	}

	removeField(entry: EmbedEntry, field: EmbedField) {
		const index = entry.fields.findIndex((it) => it.id === field.id);
		if (index === -1) return;
		entry.fields.splice(index, 1);
		this.commit();
	}

	moveField(entry: EmbedEntry, field: EmbedField, delta: number) {
		const from = entry.fields.findIndex((it) => it.id === field.id);
		if (from === -1) return;
		const to = Math.min(Math.max(from + delta, 0), entry.fields.length - 1);
		if (from === to) return;
		const [moved] = entry.fields.splice(from, 1);
		entry.fields.splice(to, 0, moved);
		this.commit();
	}

	onRawTextInput() {
		if (this.mode !== "raw") return;
		this.entries = [];
		this.parseError = null;
		this.parse(this.rawText);
		this.emitChange(this.rawText);
	}

	private createEntry(): EmbedEntry {
		return {
			id: this.nextId++,
			kind: "embed",
			title: null,
			description: null,
			url: null,
			timestamp: null,
			color: null,
			image: null,
			footerText: null,
			footerIcon: null,
			footerExtras: {},
			thumbnailUrl: null,
			thumbnailExtras: {},
			authorName: null,
			authorUrl: null,
			authorIcon: null,
			authorExtras: {},
			authorAsString: false,
			fields: [],
			extras: {},
			customType: null,
			customData: null,
			customWasString: false,
		};
	}

	private createField(): EmbedField {
		return { id: this.nextId++, name: "", value: "", inline: false };
	}

	// Any direct edit of a parsed entry (via ngModel) re-serializes and notifies the host form.
	private wrapEntry(entry: EmbedEntry): EmbedEntry {
		return new Proxy(entry, {
			set: (target, key, value) => {
				const result = Reflect.set(target, key, value);
				this.commit();
				return result;
			},
		}) as EmbedEntry;
	}

	private wrapField(field: EmbedField): EmbedField {
		return new Proxy(field, {
			set: (target, key, value) => {
				const result = Reflect.set(target, key, value);
				this.commit();
				return result;
			},
		}) as EmbedField;
	}

	private commit() {
		if (this.mode !== "editor") return;
		this.rawText = this.serialize();
		this.emitChange(this.rawText);
	}

	private emitChange(json: string) {
		if (json === this.lastEmitted) return;
		this.lastEmitted = json;
		this.embedJson = json;
		this.embedJsonChange.emit(json);
	}

	parse(text: string): boolean {
		const trimmed = text.trim();
		if (!trimmed) {
			this.wasArray = false;
			return true;
		}
		let value: Json;
		try {
			value = JSON.parse(trimmed);
		} catch (_error) {
			this.parseError =
				"Invalid JSON. Fix the raw JSON before you switch to the visual editor.";
			return false;
		}
		if (Array.isArray(value)) {
			this.wasArray = true;
			return this.parseEntries(value);
		}
		if (value === null) {
			this.parseError = "Embeds must be a JSON object or array, not null.";
			return false;
		}
		this.wasArray = false;
		return this.parseEntries([value]);
	}

	private parseEntries(list: Json[]): boolean {
		for (const element of list) {
			if (typeof element === "string") {
				if (!this.allowCustomEmbeds) {
					this.parseError =
						"Plain strings are custom embeds, which are not supported here.";
					return false;
				}
				this.entries.push(
					this.wrapEntry({
						...this.createEntry(),
						kind: "custom",
						customType: element,
						customWasString: true,
					}),
				);
				continue;
			}
			if (
				element === null ||
				typeof element !== "object" ||
				Array.isArray(element)
			) {
				this.parseError =
					"Each embed must be a JSON object (or a custom embed string).";
				return false;
			}
			if ("customEmbed" in element) {
				if (!this.allowCustomEmbeds) {
					this.parseError = "Custom embeds are not supported here.";
					return false;
				}
				const customEmbed = element["customEmbed"];
				if (typeof customEmbed !== "string") {
					this.parseError = "customEmbed must be a string.";
					return false;
				}
				const customData = element["customData"];
				if (customData !== undefined && typeof customData !== "string") {
					this.parseError = "customData must be a string.";
					return false;
				}
				this.entries.push(
					this.wrapEntry({
						...this.createEntry(),
						kind: "custom",
						customType: customEmbed,
						customData:
							customData === null ? null : (customData as string | null),
						customWasString: false,
					}),
				);
				continue;
			}
			this.entries.push(this.parseEmbedEntry(element));
		}
		return true;
	}

	private parseEmbedEntry(element: { [key: string]: Json }): EmbedEntry {
		const entry = this.createEntry();
		for (const [key, value] of Object.entries(element)) {
			switch (key) {
				case "title":
				case "description":
				case "url":
				case "color":
				case "image":
					entry[key] = typeof value === "string" ? value : null;
					break;
				case "timestamp":
					entry.timestamp =
						typeof value === "number"
							? String(Math.trunc(value))
							: typeof value === "string"
								? value
								: null;
					break;
				case "footer": {
					if (
						typeof value !== "object" ||
						value === null ||
						Array.isArray(value)
					)
						break;
					const footer = value;
					entry.footerText =
						typeof footer["text"] === "string" ? footer["text"] : null;
					entry.footerIcon =
						typeof footer["icon"] === "string" ? footer["icon"] : null;
					entry.footerExtras = this.extrasOf(footer, ["text", "icon"]);
					break;
				}
				case "thumbnail": {
					if (
						typeof value !== "object" ||
						value === null ||
						Array.isArray(value)
					)
						break;
					const thumbnail = value;
					entry.thumbnailUrl =
						typeof thumbnail["url"] === "string" ? thumbnail["url"] : null;
					entry.thumbnailExtras = this.extrasOf(thumbnail, ["url"]);
					break;
				}
				case "author": {
					if (typeof value === "string") {
						entry.authorName = value;
						entry.authorAsString = true;
					} else if (
						typeof value === "object" &&
						value !== null &&
						!Array.isArray(value)
					) {
						const author = value;
						entry.authorName =
							typeof author["name"] === "string" ? author["name"] : null;
						entry.authorUrl =
							typeof author["url"] === "string" ? author["url"] : null;
						entry.authorIcon =
							typeof author["icon"] === "string" ? author["icon"] : null;
						entry.authorExtras = this.extrasOf(author, ["name", "url", "icon"]);
					}
					break;
				}
				case "fields":
					if (!Array.isArray(value)) break;
					for (const field of value) {
						if (
							typeof field !== "object" ||
							field === null ||
							Array.isArray(field)
						)
							continue;
						entry.fields.push(
							this.wrapField({
								id: this.nextId++,
								name: typeof field["name"] === "string" ? field["name"] : "",
								value: typeof field["value"] === "string" ? field["value"] : "",
								inline: field["inline"] === true,
							}),
						);
					}
					break;
				default:
					entry.extras[key] = value;
			}
		}
		return this.wrapEntry(entry);
	}

	private extrasOf(
		value: { [key: string]: Json },
		knownKeys: string[],
	): Record<string, Json> {
		const extras: Record<string, Json> = {};
		for (const [key, nested] of Object.entries(value)) {
			if (!knownKeys.includes(key)) extras[key] = nested;
		}
		return extras;
	}

	/** Treat cleared (empty-string) inputs as absent so they drop the key. */
	private val(value: string | null): string | null {
		return value === null || value === "" ? null : value;
	}

	serialize(): string {
		if (this.entries.length === 0) return "";
		const built = this.entries.map((entry) => this.buildEntry(entry));
		if (!this.wasArray && built.length === 1)
			return JSON.stringify(built[0], null, 2);
		return JSON.stringify(built, null, 2);
	}

	private buildEntry(entry: EmbedEntry): Json {
		if (entry.kind === "custom") {
			if (entry.customWasString && !entry.customData)
				return entry.customType ?? "";
			const custom: Record<string, Json> = {};
			const customType = this.val(entry.customType);
			if (customType !== null) custom["customEmbed"] = customType;
			const customData = this.val(entry.customData);
			if (customData !== null) custom["customData"] = customData;
			return custom;
		}

		const embed: Record<string, Json> = { ...entry.extras };
		this.put(embed, "title", entry.title);
		this.put(embed, "description", entry.description);
		this.put(embed, "url", entry.url);
		this.put(embed, "color", entry.color);
		this.put(embed, "image", entry.image);

		const timestamp = entry.timestamp?.trim();
		if (timestamp) {
			embed["timestamp"] = /^\d+$/.test(timestamp)
				? Number(timestamp)
				: timestamp;
		}

		const footerText = this.val(entry.footerText);
		const footerIcon = this.val(entry.footerIcon);
		if (
			footerText !== null ||
			footerIcon !== null ||
			Object.keys(entry.footerExtras).length > 0
		) {
			const footer: Record<string, Json> = { ...entry.footerExtras };
			if (footerText !== null) footer["text"] = footerText;
			if (footerIcon !== null) footer["icon"] = footerIcon;
			embed["footer"] = footer;
		}

		const thumbnailUrl = this.val(entry.thumbnailUrl);
		if (
			thumbnailUrl !== null ||
			Object.keys(entry.thumbnailExtras).length > 0
		) {
			const thumbnail: Record<string, Json> = { ...entry.thumbnailExtras };
			if (thumbnailUrl !== null) thumbnail["url"] = thumbnailUrl;
			embed["thumbnail"] = thumbnail;
		}

		const authorName = this.val(entry.authorName);
		const authorUrl = this.val(entry.authorUrl);
		const authorIcon = this.val(entry.authorIcon);
		if (entry.authorAsString) {
			embed["author"] = authorName ?? "";
		} else if (
			authorName !== null ||
			authorUrl !== null ||
			authorIcon !== null ||
			Object.keys(entry.authorExtras).length > 0
		) {
			const author: Record<string, Json> = { ...entry.authorExtras };
			if (authorName !== null) author["name"] = authorName;
			if (authorUrl !== null) author["url"] = authorUrl;
			if (authorIcon !== null) author["icon"] = authorIcon;
			embed["author"] = author;
		}

		if (entry.fields.length > 0) {
			embed["fields"] = entry.fields.map((field) => ({
				name: field.name,
				value: field.value,
				inline: field.inline,
			}));
		}

		return embed;
	}

	private put(target: Record<string, Json>, key: string, value: string | null) {
		if (value === null || value === "") return;
		target[key] = value;
	}
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

type EmbedEntry = {
	id: number;
	kind: "embed" | "custom";
	title: string | null;
	description: string | null;
	url: string | null;
	timestamp: string | null;
	color: string | null;
	image: string | null;
	footerText: string | null;
	footerIcon: string | null;
	footerExtras: Record<string, Json>;
	thumbnailUrl: string | null;
	thumbnailExtras: Record<string, Json>;
	authorName: string | null;
	authorUrl: string | null;
	authorIcon: string | null;
	authorExtras: Record<string, Json>;
	authorAsString: boolean;
	fields: EmbedField[];
	extras: Record<string, Json>;
	customType: string | null;
	customData: string | null;
	customWasString: boolean;
};

type EmbedField = {
	id: number;
	name: string;
	value: string;
	inline: boolean;
};
