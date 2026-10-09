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

@Component({
	selector: "app-embed-editor",
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
    <div class="flex flex-col gap-2 -mt-5">
      <div class="flex items-center justify-end gap-2">
        <span class="text-gray-400">
          {{ mode === "editor" ? "Visual editor" : "Raw JSON" }}
        </span>
        <button
          type="button"
          (click)="toggleMode()"
          class="w-16 h-6 rounded-full border border-gray-500 cursor-pointer inline-flex items-center"
          title="Toggle between raw JSON and the visual editor"
          aria-label="Toggle between raw JSON and the visual editor"
        >
          <span
            class="w-4 h-4 rounded-full bg-gray-300"
            [class.ml-1]="mode === 'raw'"
            [class.ml-11]="mode === 'editor'"
          ></span>
        </button>
      </div>

      @if (parseError) {
        <small id="embed-editor-parse-error" class="text-red-400 block">{{ parseError }}</small>
      }

      <div class="card rounded-lg border border-gray-600 p-3">
        @if (mode === "raw") {
        <textarea
          rows="6"
          [(ngModel)]="rawText"
          [attr.aria-invalid]="parseError ? 'true' : null"
          [attr.aria-describedby]="parseError ? 'embed-editor-parse-error' : null"
          (input)="onRawTextInput()"
          class="input font-mono text-sm w-full"
        ></textarea>
      } @else {
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="addEntry()"
            class="input inline-flex items-center cursor-pointer text-gray-300"
            title="Add embed at the end"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-width="2" d="M12 5l0 14M5 12l14 0"></path>
            </svg>
            <span class="ml-2">Add embed</span>
          </button>
          @if (allowCustomEmbeds) {
            <button
              type="button"
              (click)="addCustomEntry()"
              class="input inline-flex items-center cursor-pointer text-gray-300"
              title="Add custom embed at the end"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-width="2" d="M12 5l0 14M5 12l14 0"></path>
              </svg>
              <span class="ml-2">Add custom embed</span>
            </button>
          }
        </div>

        @for (entry of entries; track entry.id) {
          <div class="card rounded-lg border border-gray-600 p-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">
                {{ entry.kind === "custom" ? "Custom embed" : "Embed" }}
              </span>
              <div class="flex gap-1">
                <button
                  type="button"
                  (click)="moveEntry(entry, -1)"
                  [disabled]="$index === 0"
                  class="input cursor-pointer text-gray-400"
                  title="Move up"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 15l6-6l6 6"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  (click)="moveEntry(entry, 1)"
                  [disabled]="$index === entries.length - 1"
                  class="input cursor-pointer text-gray-400"
                  title="Move down"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6l6-6"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  (click)="removeEntry(entry)"
                  class="input cursor-pointer text-red-400 hover:text-red-300"
                  title="Delete embed"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7l16 0M10 4l4 0l0 3M10 4l-4 0l0 3M7 9l10 0M7 19l10 0M7 9l0 10M17 9l0 10"></path>
                  </svg>
                </button>
              </div>
            </div>

            @if (entry.kind === "custom") {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div>
                  <label class="label">Custom embed type</label>
                  <input type="text" [(ngModel)]="entry.customType" class="input" />
                </div>
                <div>
                  <label class="label">Custom data</label>
                  <input type="text" [(ngModel)]="entry.customData" class="input" />
                </div>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <div>
                  <label class="label">Title</label>
                  <input type="text" [(ngModel)]="entry.title" class="input" />
                </div>
                <div>
                  <label class="label">Description</label>
                  <input type="text" [(ngModel)]="entry.description" class="input" />
                </div>
                <div>
                  <label class="label">URL</label>
                  <input type="text" [(ngModel)]="entry.url" class="input" />
                </div>
                <div>
                  <label class="label">Timestamp (ms)</label>
                  <input type="text" [(ngModel)]="entry.timestamp" class="input" />
                </div>
                <div>
                  <label class="label">Color (#hex)</label>
                  <input type="text" [(ngModel)]="entry.color" class="input" />
                </div>
                <div>
                  <label class="label">Image URL</label>
                  <input type="text" [(ngModel)]="entry.image" class="input" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div>
                  <label class="label">Footer text</label>
                  <input type="text" [(ngModel)]="entry.footerText" class="input" />
                </div>
                <div>
                  <label class="label">Footer icon URL</label>
                  <input type="text" [(ngModel)]="entry.footerIcon" class="input" />
                </div>
                <div>
                  <label class="label">Thumbnail URL</label>
                  <input type="text" [(ngModel)]="entry.thumbnailUrl" class="input" />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div>
                  <label class="label">Author name</label>
                  <input type="text" [(ngModel)]="entry.authorName" class="input" />
                </div>
                <div>
                  <label class="label">Author URL</label>
                  <input type="text" [(ngModel)]="entry.authorUrl" class="input" />
                </div>
                <div>
                  <label class="label">Author icon URL</label>
                  <input type="text" [(ngModel)]="entry.authorIcon" class="input" />
                </div>
              </div>

              <div class="mt-2">
                <button
                  type="button"
                  (click)="addField(entry)"
                  class="input inline-flex items-center cursor-pointer text-gray-300"
                  title="Add field at the end"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-width="2" d="M12 5l0 14M5 12l14 0"></path>
                  </svg>
                  <span class="ml-2">Add field</span>
                </button>

                @for (field of entry.fields; track field.id) {
                  <div class="flex items-center gap-2 mt-2">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label class="label">
                        Field name
                        <input type="text" [(ngModel)]="field.name" class="input" />
                      </label>
                      <label class="label">
                        Field value
                        <input type="text" [(ngModel)]="field.value" class="input" />
                      </label>
                    </div>
                    <label class="inline-flex items-center gap-1 text-gray-300">
                      <input type="checkbox" [(ngModel)]="field.inline" class="mr-1" />
                      Inline
                    </label>
                    <div class="flex gap-1">
                      <button
                        type="button"
                        (click)="moveField(entry, field, -1)"
                        [disabled]="$index === 0"
                        class="input cursor-pointer text-gray-400"
                        title="Move field up"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 15l6-6l6 6"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        (click)="moveField(entry, field, 1)"
                        [disabled]="$index === entry.fields.length - 1"
                        class="input cursor-pointer text-gray-400"
                        title="Move field down"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 9l6 6l6-6"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        (click)="removeField(entry, field)"
                        class="input cursor-pointer text-red-400 hover:text-red-300"
                        title="Delete field"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7l16 0M10 4l4 0l0 3M10 4l-4 0l0 3M7 9l10 0M7 19l10 0M7 9l0 10M17 9l0 10"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
        }
      </div>
    </div>
  `,
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
