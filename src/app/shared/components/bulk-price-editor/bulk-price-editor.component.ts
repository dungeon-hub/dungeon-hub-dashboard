import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { BulkPriceModel } from "@dungeon-hub/api-client";

export interface BulkPriceRow {
	amount: number | null;
	price: number | null;
}

export function toBulkPriceRows(
	bulkPrices: BulkPriceModel[] | null | undefined,
): BulkPriceRow[] {
	return (bulkPrices ?? []).map((bulkPrice) => ({
		amount: bulkPrice.amount,
		price: bulkPrice.price,
	}));
}

/**
 * Returns an error message if the rows can't be saved, otherwise null.
 */
export function validateBulkPriceRows(rows: BulkPriceRow[]): string | null {
	const amounts = new Set<number>();

	for (const row of rows) {
		const amount = row.amount ?? 0;
		const price = row.price ?? 0;

		if (
			!Number.isInteger(amount) ||
			!Number.isInteger(price) ||
			amount < 1 ||
			price < 1
		) {
			return "Every bulk price needs a whole amount and price of at least 1.";
		}

		if (amounts.has(amount)) {
			return "Only one bulk price per amount is allowed.";
		}

		amounts.add(amount);
	}

	return null;
}

export function toBulkPriceModels(rows: BulkPriceRow[]): BulkPriceModel[] {
	return rows
		.map((row) => ({ amount: row.amount ?? 0, price: row.price ?? 0 }))
		.sort((a, b) => a.amount - b.amount);
}

@Component({
	selector: "app-bulk-price-editor",
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
    <div class="space-y-2">
      @for (row of bulkPrices; track $index) {
        <div class="flex items-center gap-2">
          <input
            [(ngModel)]="row.amount"
            type="number"
            class="input"
            min="1"
            placeholder="Amount"
            [attr.aria-label]="'Bulk price ' + ($index + 1) + ' amount'"
          />
          <input
            [(ngModel)]="row.price"
            type="number"
            class="input"
            min="1"
            placeholder="Price per carry"
            [attr.aria-label]="'Bulk price ' + ($index + 1) + ' price per carry'"
          />
          <button
            type="button"
            (click)="removeRow($index)"
            class="text-gray-400 hover:text-gray-200 p-1 flex-shrink-0"
            [attr.aria-label]="'Remove bulk price ' + ($index + 1)"
            title="Remove bulk price"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      }
      <button type="button" (click)="addRow()" class="btn btn-secondary">
        Add Bulk Price
      </button>
    </div>
  `,
})
export class BulkPriceEditorComponent {
	@Input() bulkPrices: BulkPriceRow[] = [];
	@Output() bulkPricesChange = new EventEmitter<BulkPriceRow[]>();

	addRow() {
		this.bulkPrices = [...this.bulkPrices, { amount: null, price: null }];
		this.bulkPricesChange.emit(this.bulkPrices);
	}

	removeRow(index: number) {
		this.bulkPrices = this.bulkPrices.filter((_, i) => i !== index);
		this.bulkPricesChange.emit(this.bulkPrices);
	}
}
