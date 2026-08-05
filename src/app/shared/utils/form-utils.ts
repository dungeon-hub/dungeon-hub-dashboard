export function wasCleared(currentValue: unknown, formValue: unknown): boolean {
	return currentValue != null && (formValue == null || formValue === "");
}
