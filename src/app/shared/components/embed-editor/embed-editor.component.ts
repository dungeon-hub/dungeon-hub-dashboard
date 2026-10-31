import { CommonModule } from "@angular/common";
import {
	Component,
	EventEmitter,
	Input,
	type OnChanges,
	type OnInit,
	Output,
	type SimpleChanges,
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
          [class.!border-red-500]="parseError"
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
                    <input
                      type="text"
                      [(ngModel)]="entry.customType"
                      class="input"
                      [class.!border-amber-500]="!entry.customType?.trim()"
                      [attr.aria-describedby]="entry.customType?.trim() ? null : parseErrorId + '-custom-' + entry.id"
                    />
                    @if (!entry.customType?.trim()) {
                      <small [id]="parseErrorId + '-custom-' + entry.id" class="font-normal text-amber-400">
                        Required. This embed is not saved until it has a type.
                      </small>
                    }
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
                  <div class="field-label">
                    <span aria-hidden="true">Color</span>
                    <span class="flex gap-2">
                      <input
                        type="color"
                        [value]="colorPreview(entry) ?? '#5865f2'"
                        (input)="entry.color = $any($event.target).value"
                        class="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-gray-600 bg-gray-700 p-1"
                        aria-label="Embed color picker"
                      />
                      <input
                        type="text"
                        [(ngModel)]="entry.color"
                        class="input font-mono"
                        placeholder="#5865f2"
                        aria-label="Embed color (hex)"
                      />
                    </span>
                  </div>
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
      @apply rounded px-3 py-0.5 text-xs font-medium text-gray-400 hover:text-gray-200;
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
      @apply inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-30;
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
export class EmbedEditorComponent implements OnInit, OnChanges {
	@Input() embedJson: string = "";
	@Input() allowCustomEmbeds: boolean = false;
	@Output() embedJsonChange = new EventEmitter<string>();

	entries: EmbedEntry[] = [];
	rawText = "";
	mode: "raw" | "editor" = "raw";
	parseError: string | null = null;
	private wasArray = false;
	private nextId = 1;
	private lastEmitted: string | null = null;
	readonly parseErrorId = `embed-editor-parse-error-${nextInstanceId++}`;

	ngOnInit() {
		this.load(true);
	}

	ngOnChanges(changes: SimpleChanges) {
		const change = changes["embedJson"];
		if (!change || change.firstChange) return;
		// The host echoes back what this editor emitted; only reload on outside changes.
		if ((this.embedJson ?? "") === this.lastEmitted) return;
		this.load(this.mode === "editor");
	}

	private load(preferEditor: boolean) {
		this.rawText = this.embedJson ?? "";
		this.lastEmitted = this.rawText;
		this.entries = [];
		this.parseError = null;
		const parsed = this.parse(this.rawText);
		this.mode = parsed && preferEditor ? "editor" : "raw";
	}

	toggleMode() {
		if (this.mode === "raw") {
			this.entries = [];
			this.parseError = null;
			if (!this.parse(this.rawText)) return;
			this.mode = "editor";
		} else {
			this.mode = "raw";
			this.rawText = this.serialize();
			this.emitChange(this.rawText);
		}
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
		return {
			id: this.nextId++,
			name: "",
			value: "",
			inline: false,
			extras: {},
		};
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
		for (const [index, element] of list.entries()) {
			const at = list.length > 1 ? `Embed ${index + 1}: ` : "";
			if (typeof element === "string") {
				if (!this.allowCustomEmbeds)
					return this.fail(
						`${at}Plain strings are custom embeds, which are not supported here.`,
					);
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
			if (!isJsonObject(element))
				return this.fail(
					`${at}Each embed must be a JSON object (or a custom embed string).`,
				);
			if ("customEmbed" in element) {
				if (!this.allowCustomEmbeds)
					return this.fail(`${at}Custom embeds are not supported here.`);
				const customEmbed = element["customEmbed"];
				if (typeof customEmbed !== "string")
					return this.fail(`${at}"customEmbed" must be a string.`);
				const customData = element["customData"];
				if (customData !== undefined && typeof customData !== "string")
					return this.fail(`${at}"customData" must be a string.`);
				this.entries.push(
					this.wrapEntry({
						...this.createEntry(),
						kind: "custom",
						customType: customEmbed,
						customData: customData ?? null,
						customWasString: false,
					}),
				);
				continue;
			}
			const entry = this.parseEmbedEntry(element, at);
			if (!entry) return false;
			this.entries.push(entry);
		}
		return true;
	}

	private fail(message: string): false {
		this.parseError = `${message} Fix it in the raw JSON to use the visual editor.`;
		return false;
	}

	/** Parses one embed object, or sets parseError and returns null if a known property has an unexpected type. */
	private parseEmbedEntry(element: JsonObject, at: string): EmbedEntry | null {
		try {
			return this.wrapEntry(this.readEmbed(element));
		} catch (error) {
			if (!(error instanceof EmbedTypeError)) throw error;
			this.fail(`${at}${error.message}`);
			return null;
		}
	}

	private readEmbed(element: JsonObject): EmbedEntry {
		const entry = this.createEntry();
		for (const [key, value] of Object.entries(element)) {
			switch (key) {
				case "title":
				case "description":
				case "url":
				case "color":
				case "image":
					entry[key] = optionalString(element, key, key);
					break;
				case "timestamp":
					if (typeof value === "number")
						entry.timestamp = String(Math.trunc(value));
					else if (typeof value === "string") entry.timestamp = value;
					else
						throw new EmbedTypeError(
							`"timestamp" must be a number or a string.`,
						);
					break;
				case "footer": {
					const footer = requireObject(value, "footer");
					entry.footerText = optionalString(footer, "text", "footer.text");
					entry.footerIcon = optionalString(footer, "icon", "footer.icon");
					entry.footerExtras = this.extrasOf(footer, ["text", "icon"]);
					break;
				}
				case "thumbnail": {
					const thumbnail = requireObject(value, "thumbnail");
					entry.thumbnailUrl = optionalString(
						thumbnail,
						"url",
						"thumbnail.url",
					);
					entry.thumbnailExtras = this.extrasOf(thumbnail, ["url"]);
					break;
				}
				case "author":
					if (typeof value === "string") {
						entry.authorName = value;
						entry.authorAsString = true;
						break;
					}
					if (!isJsonObject(value))
						throw new EmbedTypeError(`"author" must be an object or a string.`);
					entry.authorName = optionalString(value, "name", "author.name");
					entry.authorUrl = optionalString(value, "url", "author.url");
					entry.authorIcon = optionalString(value, "icon", "author.icon");
					entry.authorExtras = this.extrasOf(value, ["name", "url", "icon"]);
					break;
				case "fields":
					if (!Array.isArray(value))
						throw new EmbedTypeError(`"fields" must be an array.`);
					for (const [index, item] of value.entries()) {
						const path = `fields[${index}]`;
						const field = requireObject(item, path);
						const inline = field["inline"];
						if (inline !== undefined && typeof inline !== "boolean")
							throw new EmbedTypeError(
								`"${path}.inline" must be true or false.`,
							);
						entry.fields.push(
							this.wrapField({
								id: this.nextId++,
								name: optionalString(field, "name", `${path}.name`) ?? "",
								value: optionalString(field, "value", `${path}.value`) ?? "",
								inline: inline ?? false,
								extras: this.extrasOf(field, ["name", "value", "inline"]),
							}),
						);
					}
					break;
				default:
					entry.extras[key] = value;
			}
		}
		return entry;
	}

	private extrasOf(
		value: JsonObject,
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
		// A custom embed without a type has nothing to send, so it stays out until one is filled in.
		const built = this.entries
			.filter(
				(entry) =>
					entry.kind !== "custom" ||
					this.val(entry.customType?.trim() ?? null) !== null,
			)
			.map((entry) => this.buildEntry(entry));
		if (built.length === 0) return "";
		if (!this.wasArray && built.length === 1)
			return JSON.stringify(built[0], null, 2);
		return JSON.stringify(built, null, 2);
	}

	private buildEntry(entry: EmbedEntry): Json {
		if (entry.kind === "custom") {
			const customType = entry.customType?.trim() ?? "";
			if (entry.customWasString && !entry.customData) return customType;
			const custom: Record<string, Json> = { customEmbed: customType };
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
				...field.extras,
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
type JsonObject = { [key: string]: Json };

function isJsonObject(value: Json | undefined): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Thrown while parsing an embed when a known property has an unexpected type. */
class EmbedTypeError extends Error {}

function requireObject(value: Json, path: string): JsonObject {
	if (!isJsonObject(value))
		throw new EmbedTypeError(`"${path}" must be an object.`);
	return value;
}

function optionalString(
	owner: JsonObject,
	key: string,
	path: string,
): string | null {
	const value = owner[key];
	if (value === undefined) return null;
	if (typeof value !== "string")
		throw new EmbedTypeError(`"${path}" must be a string.`);
	return value;
}

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
	extras: Record<string, Json>;
};
