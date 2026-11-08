import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";

export type PermissionValue = "allow" | "deny" | "default";

const OPTION_META = {
	deny: { symbol: "✕", label: "Deny" },
	default: { symbol: "-", label: "Don't modify" },
	allow: { symbol: "✓", label: "Allow" },
} as const satisfies Record<PermissionValue, { symbol: string; label: string }>;

@Component({
	selector: "app-permission-toggle",
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: [
		`
    :host {
      display: inline-block;
      flex: none;
      --segment-width: 2.75rem;
      --color-deny: #ef4444;
      --color-default: #6b7280;
      --color-allow: #22c55e;
      --color-border: #4b5563;
      --color-text: #9ca3af;
    }

    .permission-segmented {
      display: inline-grid;
      grid-auto-flow: column;
      grid-auto-columns: var(--segment-width);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--color-border);
      font-size: 16px;
      position: relative;
    }

    .permission-segment {
      padding: 6px 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease;
      color: var(--color-text);
      position: relative;
      z-index: 1;
      box-sizing: border-box;
      user-select: none;
    }

    .permission-segment + .permission-segment::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 1px;
      background-color: var(--color-border);
      pointer-events: none;
    }

    .permission-segment[data-option="deny"] {
      color: var(--color-deny);
    }

    .permission-segment[data-option="default"] {
      color: var(--color-default);
    }

    .permission-segment[data-option="allow"] {
      color: var(--color-allow);
    }

    .permission-segment.selected {
      color: white;
    }

    .highlight {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: var(--segment-width);
      border-radius: 4px;
      transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1),
                  background-color 0.2s ease;
      pointer-events: none;
      z-index: 0;
      transform: translateX(calc(var(--index) * 100%));
    }

    .permission-segmented[data-selected="deny"] .highlight {
      background-color: var(--color-deny);
    }

    .permission-segmented[data-selected="default"] .highlight {
      background-color: var(--color-default);
    }

    .permission-segmented[data-selected="allow"] .highlight {
      background-color: var(--color-allow);
    }
  `,
	],
	template: `
    <div
      class="permission-segmented"
      role="radiogroup"
      [attr.aria-label]="label()"
      [attr.data-selected]="selected()"
    >
      <div
        class="highlight"
        [style.--index]="index()"
      ></div>
      @for (option of options(); track option) {
        <button
          type="button"
          class="permission-segment"
          [attr.data-option]="option"
          [class.selected]="selected() === option"
          role="radio"
          [attr.tabindex]="selected() === option ? 0 : -1"
          [attr.aria-checked]="selected() === option"
          [attr.aria-label]="meta[option].label"
          (click)="select(option)"
          (keydown)="onKeydown($event, option)"
        >
          {{ meta[option].symbol }}
        </button>
      }
    </div>
  `,
})
export class PermissionToggleComponent {
	value = input.required<PermissionValue>();
	options = input.required<PermissionValue[]>();
	label = input("Permission toggle");

	valueChange = output<PermissionValue>();

	protected readonly meta = OPTION_META;

	protected readonly index = computed(() =>
		Math.max(0, this.options().indexOf(this.value())),
	);

	protected readonly selected = computed(() => this.options()[this.index()]);

	/** Moves focus and selection between options with the arrow keys (WAI-ARIA radio group). */
	protected onKeydown(event: KeyboardEvent, option: PermissionValue): void {
		const options = this.options();
		const current = options.indexOf(option);
		let next: number;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowDown":
				next = (current + 1) % options.length;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				next = (current - 1 + options.length) % options.length;
				break;
			default:
				return;
		}
		event.preventDefault();
		const group = (event.currentTarget as HTMLElement).parentElement;
		const buttons = group?.querySelectorAll<HTMLElement>(".permission-segment");
		buttons?.[next]?.focus();
		this.select(options[next]);
	}

	/** Emits the chosen option unless it is already selected. */
	protected select(option: PermissionValue): void {
		if (option !== this.selected()) {
			this.valueChange.emit(option);
		}
	}
}
