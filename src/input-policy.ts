export function shouldStartDrawing(
	pointerType: string,
	button: number,
	penOnlyMode: boolean,
): boolean {
	if (button !== 0 || pointerType === 'touch') return false;
	return !penOnlyMode || pointerType === 'pen';
}

export function isEditableTarget(target: EventTarget | null): boolean {
	const element = target as Element | null;
	return typeof element?.closest === 'function'
		&& element.closest('input, textarea, select, [contenteditable="true"], .cm-content') !== null;
}
