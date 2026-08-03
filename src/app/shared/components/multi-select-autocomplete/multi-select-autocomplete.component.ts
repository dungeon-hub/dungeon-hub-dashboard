import {CommonModule} from '@angular/common';
import {ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, type OnChanges, type OnInit, Output, type SimpleChanges, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';

// Items deliberately have a dynamic shape because callers configure nested display and value paths.
// biome-ignore lint/suspicious/noExplicitAny: preserving the reusable component's caller-specific item type
type AutocompleteItem = any;

@Component({
  selector: 'app-multi-select-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <button type="button" (click)="toggleDropdown()" class="input flex items-center justify-between w-full text-left min-h-11">
        <span class="flex-1 truncate">{{ getDisplayValue() }}</span>
        <svg class="w-4 h-4 transition-transform text-gray-400" [class.rotate-180]="isOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      @if (selectedItems.length > 0) {
        <div class="flex flex-wrap gap-2 mt-2">
          @for (item of selectedItems; track getNestedProperty(item, valueKey)) {
            <button type="button" (click)="removeItem(item)" class="px-2 py-1 rounded bg-blue-900/50 text-blue-200 text-sm hover:bg-blue-800/60">
              {{ getNestedProperty(item, displayKey) }} ×
            </button>
          }
        </div>
      }

      @if (isOpen) {
        <div class="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
          <div class="p-2 border-b border-gray-700">
            <input #searchInput type="text" [(ngModel)]="searchQuery" (input)="filterItems()" [placeholder]="placeholder" class="input w-full" />
          </div>

          <div class="max-h-60 overflow-y-auto">
            @for (item of filteredItems; track getNestedProperty(item, valueKey)) {
              <button type="button" (click)="toggleItem(item)" class="w-full px-4 py-2 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-between text-left bg-transparent border-none" [class.bg-gray-700]="isItemSelected(item)">
                <span class="text-gray-300">{{ getNestedProperty(item, displayKey) }}</span>
                @if (isItemSelected(item)) {
                  <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                }
              </button>
            }

            @if (filteredItems.length === 0) {
              <div class="px-4 py-2 text-gray-500 text-center">No results found</div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class MultiSelectAutocompleteComponent implements OnInit, OnChanges {
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  @Input() items: AutocompleteItem[] = [];
  @Input() selectedItems: AutocompleteItem[] = [];
  @Input() displayKey = 'name';
  @Input() valueKey = 'id';
  @Input() placeholder = 'Search...';
  @Input() nullLabel = 'None selected';
  @Output() selectedItemsChange = new EventEmitter<AutocompleteItem[]>();

  isOpen = false;
  searchQuery = '';
  filteredItems: AutocompleteItem[] = [];

  ngOnInit(): void {
    this.filterItems();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.filterItems();
    }
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.filterItems();
      setTimeout(() => this.elementRef.nativeElement.querySelector('input[type="text"]')?.focus(), 0);
    }
  }

  toggleItem(item: AutocompleteItem): void {
    if (this.isItemSelected(item)) {
      this.removeItem(item);
      return;
    }

    this.selectedItems = [...this.selectedItems, item];
    this.selectedItemsChange.emit(this.selectedItems);
    this.cdr.detectChanges();
  }

  removeItem(item: AutocompleteItem): void {
    const value = this.getNestedProperty(item, this.valueKey);
    this.selectedItems = this.selectedItems.filter(selected => this.getNestedProperty(selected, this.valueKey) !== value);
    this.selectedItemsChange.emit(this.selectedItems);
    this.cdr.detectChanges();
  }

  isItemSelected(item: AutocompleteItem): boolean {
    const value = this.getNestedProperty(item, this.valueKey);
    return this.selectedItems.some(selected => this.getNestedProperty(selected, this.valueKey) === value);
  }

  getDisplayValue(): string {
    if (this.selectedItems.length === 0) {
      return this.nullLabel;
    }

    if (this.selectedItems.length === 1) {
      return this.getNestedProperty(this.selectedItems[0], this.displayKey) || this.nullLabel;
    }

    return `${this.selectedItems.length} selected`;
  }

  filterItems(): void {
    if (!this.searchQuery) {
      this.filteredItems = this.items;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredItems = this.items.filter(item => {
      const displayValue = this.getNestedProperty(item, this.displayKey);
      return typeof displayValue === 'string' && displayValue.toLowerCase().includes(query);
    });
  }

  getNestedProperty(obj: AutocompleteItem, path: string): AutocompleteItem {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
