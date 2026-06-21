import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener, ElementRef, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative">
      <!-- Trigger Button and Clear Button (siblings) -->
      <div class="relative">
        <button
          type="button"
          (click)="toggleDropdown()"
          class="input flex items-center justify-between w-full text-left"
        >
          <span class="flex-1 truncate">{{ getDisplayValue() }}</span>
          <div class="flex items-center gap-2 ml-2 flex-shrink-0">
            @if (selectedItem) {
              <!-- Placeholder for clear button spacing -->
              <div class="w-4 h-4"></div>
            }
            <svg
              class="w-4 h-4 transition-transform text-gray-400"
              [class.rotate-180]="isOpen"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </button>
        @if (selectedItem) {
          <button
            type="button"
            (click)="clear($event)"
            class="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-1 z-10"
            title="Clear selection"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        }
      </div>

      <!-- Dropdown Popover -->
      @if (isOpen) {
        <div class="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg overflow-hidden">
          <!-- Search Input -->
          <div class="p-2 border-b border-gray-700">
            <input
              #searchInput
              type="text"
              [(ngModel)]="searchQuery"
              (input)="filterItems()"
              [placeholder]="placeholder"
              class="input w-full"
            />
          </div>

          <!-- Items List -->
          <div class="max-h-60 overflow-y-auto">
            <!-- None Option -->
            <div
              (click)="selectItem(null)"
              class="px-4 py-2 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-between"
              [class.bg-gray-700]="!selectedItem"
            >
              <span class="text-gray-300">{{ nullLabel }}</span>
              @if (!selectedItem) {
                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              }
            </div>

            <!-- Filtered Items (Ungrouped) -->
            @if (!groupByKey) {
              @for (item of filteredItems; track getNestedProperty(item, valueKey)) {
                <div
                  (click)="selectItem(item)"
                  class="px-4 py-2 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-between"
                  [class.bg-gray-700]="isItemSelected(item)"
                >
                  <span class="text-gray-300">{{ getNestedProperty(item, displayKey) }}</span>
                  @if (isItemSelected(item)) {
                    <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  }
                </div>
              }
            }

            <!-- Filtered Items (Grouped) -->
            @if (groupByKey) {
              @for (groupKey of groupKeys; track groupKey) {
                <!-- Group Header -->
                <div class="px-4 py-2 text-xs font-semibold text-gray-400 uppercase bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
                  {{ groupDisplayNames[groupKey] || groupKey || 'Uncategorized' }}
                </div>

                <!-- Group Items -->
                @for (item of groupedItems[groupKey]; track getNestedProperty(item, valueKey)) {
                  <div
                    (click)="selectItem(item)"
                    class="px-4 py-2 pl-6 cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-between"
                    [class.bg-gray-700]="isItemSelected(item)"
                  >
                    <span class="text-gray-300">{{ getNestedProperty(item, displayKey) }}</span>
                    @if (isItemSelected(item)) {
                      <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    }
                  </div>
                }
              }
            }

            <!-- Empty State -->
            @if (filteredItems.length === 0 && searchQuery) {
              <div class="px-4 py-2 text-gray-500 text-center">
                No results found
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AutocompleteComponent implements OnInit, OnChanges {
  private elementRef = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);

  @Input() items: any[] = [];
  @Input() displayKey: string = 'name';
  @Input() valueKey: string = 'id';
  @Input() groupByKey?: string; // Optional: group items by this field (e.g., 'category.id')
  @Input() groupDisplayKey?: string; // Optional: display key for group labels (e.g., 'category.name')
  @Input() placeholder: string = 'Search...';
  @Input() selectedItem: any = null; // The selected object (can be null)
  @Input() nullLabel: string = 'None';
  @Output() selectedItemChange = new EventEmitter<any>();

  isOpen: boolean = false;
  searchQuery: string = '';
  filteredItems: any[] = [];
  groupedItems: { [key: string]: any[] } = {};
  groupKeys: string[] = [];
  groupDisplayNames: { [key: string]: string } = {}; // Maps group key to display name

  ngOnInit() {
    this.filterItems();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items']) {
      this.filterItems();
    }
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.filterItems();
      // Focus the search input after the view updates
      setTimeout(() => {
        const searchInput = this.elementRef.nativeElement.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }, 0);
    }
  }

  selectItem(item: any | null) {
    this.selectedItem = item;
    this.selectedItemChange.emit(item);
    this.isOpen = false;
    this.cdr.detectChanges();
  }

  clear(event: Event) {
    event.stopPropagation();
    this.selectItem(null);
  }

  getDisplayValue(): string {
    if (!this.selectedItem) {
      return this.nullLabel;
    }
    return this.getNestedProperty(this.selectedItem, this.displayKey) || this.nullLabel;
  }

  getSelectedValue(): any {
    if (!this.selectedItem) {
      return null;
    }
    return this.getNestedProperty(this.selectedItem, this.valueKey);
  }

  filterItems() {
    if (!this.searchQuery) {
      this.filteredItems = this.items;
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredItems = this.items.filter(item => {
        const displayValue = this.getNestedProperty(item, this.displayKey);
        return typeof displayValue === 'string' && displayValue.toLowerCase().includes(query);
      });
    }

    // Group items if groupByKey is specified
    if (this.groupByKey) {
      this.groupItems();
    }
  }

  groupItems() {
    this.groupedItems = {};
    this.groupKeys = [];
    this.groupDisplayNames = {};

    // Group filtered items by the specified key
    for (const item of this.filteredItems) {
      // Get the group value (supports nested properties like 'category.id')
      const groupValue = this.getNestedProperty(item, this.groupByKey!) || 'Uncategorized';
      const groupKey = String(groupValue);

      if (!this.groupedItems[groupKey]) {
        this.groupedItems[groupKey] = [];
        this.groupKeys.push(groupKey);

        // Get the display name for this group
        if (groupKey !== 'Uncategorized' && this.groupDisplayKey) {
          const displayValue = this.getNestedProperty(item, this.groupDisplayKey);
          this.groupDisplayNames[groupKey] = String(displayValue || groupKey);
        } else if (groupKey !== 'Uncategorized') {
          this.groupDisplayNames[groupKey] = groupKey;
        }
      }
      this.groupedItems[groupKey].push(item);
    }

    // Sort group keys alphabetically by display name, but keep 'Uncategorized' at the end
    this.groupKeys.sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      const displayA = this.groupDisplayNames[a] || a;
      const displayB = this.groupDisplayNames[b] || b;
      return displayA.localeCompare(displayB);
    });
  }

  // Helper method to get nested property values (e.g., 'category.name' or 'category.id')
  getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  // Check if an item is currently selected
  isItemSelected(item: any): boolean {
    if (!this.selectedItem || !item) {
      return false;
    }
    const selectedValue = this.getNestedProperty(this.selectedItem, this.valueKey);
    const itemValue = this.getNestedProperty(item, this.valueKey);
    return selectedValue === itemValue;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
      this.cdr.detectChanges();
    }
  }
}
