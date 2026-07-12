export class PointerTracker {
	private activePointerId: number | null = null;

	setActivePointer(id: number): void {
		this.activePointerId = id;
	}

	clearActivePointer(): void {
		this.activePointerId = null;
	}

	isActivePointer(id: number): boolean {
		return this.activePointerId === id;
	}

	isPointerActive(): boolean {
		return this.activePointerId !== null;
	}
}
