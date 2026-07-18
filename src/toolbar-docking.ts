import type { ToolbarPosition } from './settings-model';

export type DockEdge = 'left' | 'right' | 'top' | 'bottom';
export type ToolbarOrientation = 'horizontal' | 'vertical';

interface DragState {
	pointerId: number;
	source: HTMLElement;
	startClientX: number;
	startClientY: number;
	startX: number;
	startY: number;
	moved: boolean;
}

interface ToolbarDockingCallbacks {
	onPositionChange: (position: ToolbarPosition) => void;
	onCollapsedButtonTap: () => void;
}

const DRAG_THRESHOLD = 5;
const EDGE_MARGIN = 8;

export class ToolbarDockingController {
	private readonly ownerWindow: Window;
	private readonly dragHandles: Set<HTMLElement>;
	private currentPosition: ToolbarPosition | null;
	private currentEdge: DockEdge = 'bottom';
	private dragState: DragState | null = null;
	private ignoreNextClick = false;
	private clickResetTimer: number | null = null;
	private layoutFrame: number | null = null;

	private readonly pointerDown = (event: PointerEvent): void => this.handlePointerDown(event);
	private readonly pointerMove = (event: PointerEvent): void => this.handlePointerMove(event);
	private readonly pointerUp = (event: PointerEvent): void => this.finishPointer(event, false);
	private readonly pointerCancel = (event: PointerEvent): void => this.finishPointer(event, true);
	private readonly click = (event: MouseEvent): void => this.handleClick(event);
	private readonly touchGesture = (event: TouchEvent): void => this.blockTouchGesture(event);
	private readonly nativeGesture = (event: Event): void => this.blockNativeGesture(event);
	private readonly windowBlur = (): void => this.finishDrag(true);

	constructor(
		private readonly parentEl: HTMLElement,
		private readonly toolbarEl: HTMLElement,
		dragHandles: HTMLElement[],
		private readonly collapsedButton: HTMLElement,
		initialPosition: ToolbarPosition | null,
		private readonly callbacks: ToolbarDockingCallbacks,
	) {
		const ownerWindow = parentEl.ownerDocument.defaultView;
		if (!ownerWindow) throw new Error('Toolbar docking requires a browser window');

		this.ownerWindow = ownerWindow;
		this.dragHandles = new Set(dragHandles);
		this.currentPosition = initialPosition;
		this.updateOrientation(initialPosition ? this.nearestEdge(initialPosition) : 'bottom');
		this.applyPosition();
		this.attachCaptureListeners();
		this.repositionAfterLayout();
	}

	private attachCaptureListeners(): void {
		this.ownerWindow.addEventListener('pointerdown', this.pointerDown, { capture: true, passive: false });
		this.ownerWindow.addEventListener('pointermove', this.pointerMove, { capture: true, passive: false });
		this.ownerWindow.addEventListener('pointerup', this.pointerUp, { capture: true, passive: false });
		this.ownerWindow.addEventListener('pointercancel', this.pointerCancel, { capture: true, passive: false });
		this.ownerWindow.addEventListener('click', this.click, true);
		this.ownerWindow.addEventListener('touchstart', this.touchGesture, { capture: true, passive: false });
		this.ownerWindow.addEventListener('touchmove', this.touchGesture, { capture: true, passive: false });
		this.ownerWindow.addEventListener('touchend', this.touchGesture, { capture: true, passive: false });
		this.ownerWindow.addEventListener('touchcancel', this.touchGesture, { capture: true, passive: false });
		this.ownerWindow.addEventListener('contextmenu', this.nativeGesture, true);
		this.ownerWindow.addEventListener('dragstart', this.nativeGesture, true);
		this.ownerWindow.addEventListener('blur', this.windowBlur);
	}

	private handlePointerDown(event: PointerEvent): void {
		const source = this.findDragHandle(event);
		if (!source) return;

		blockEvent(event);
		if (event.button !== 0 || this.dragState) return;

		const parentRect = this.parentEl.getBoundingClientRect();
		const toolbarRect = this.toolbarEl.getBoundingClientRect();
		this.dragState = {
			pointerId: event.pointerId,
			source,
			startClientX: event.clientX,
			startClientY: event.clientY,
			startX: toolbarRect.left + (toolbarRect.width / 2) - parentRect.left,
			startY: toolbarRect.top + (toolbarRect.height / 2) - parentRect.top,
			moved: false,
		};
		this.toolbarEl.addClass('is-dragging');
		try {
			source.setPointerCapture(event.pointerId);
		} catch {
			// WebKit can retain implicit capture; window capture listeners still own the gesture.
		}
	}

	private handlePointerMove(event: PointerEvent): void {
		const drag = this.dragState;
		if (!drag || drag.pointerId !== event.pointerId) return;

		blockEvent(event);
		const deltaX = event.clientX - drag.startClientX;
		const deltaY = event.clientY - drag.startClientY;
		if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
		drag.moved = true;

		const parentRect = this.parentEl.getBoundingClientRect();
		if (parentRect.width <= 0 || parentRect.height <= 0) return;

		const candidate = {
			x: (drag.startX + deltaX) / parentRect.width,
			y: (drag.startY + deltaY) / parentRect.height,
		};
		this.updateOrientation(this.nearestEdge(candidate));
		this.currentPosition = this.constrainPosition(candidate);
		this.applyPosition();
	}

	private finishPointer(event: PointerEvent, cancelled: boolean): void {
		if (event.pointerId !== this.dragState?.pointerId) return;
		blockEvent(event);
		this.finishDrag(cancelled);
	}

	private finishDrag(cancelled: boolean): void {
		const drag = this.dragState;
		if (!drag) return;

		this.dragState = null;
		this.ignoreNextClick = true;
		if (this.clickResetTimer !== null) this.ownerWindow.clearTimeout(this.clickResetTimer);
		this.clickResetTimer = this.ownerWindow.setTimeout(() => {
			this.ignoreNextClick = false;
			this.clickResetTimer = null;
		}, 0);
		if (drag.source.hasPointerCapture(drag.pointerId)) {
			drag.source.releasePointerCapture(drag.pointerId);
		}

		if (drag.moved && this.currentPosition) {
			this.dockAndSave();
		} else if (!cancelled && drag.source === this.collapsedButton) {
			this.callbacks.onCollapsedButtonTap();
		}
		this.toolbarEl.removeClass('is-dragging');
	}

	private handleClick(event: MouseEvent): void {
		const source = this.findDragHandle(event);
		if (!source) return;

		blockEvent(event);
		if (source === this.collapsedButton && !this.ignoreNextClick) {
			this.callbacks.onCollapsedButtonTap();
		}
		this.ignoreNextClick = false;
		if (this.clickResetTimer !== null) this.ownerWindow.clearTimeout(this.clickResetTimer);
		this.clickResetTimer = null;
	}

	private blockTouchGesture(event: TouchEvent): void {
		if (!this.dragState && !this.findDragHandle(event)) return;
		blockEvent(event);
	}

	private blockNativeGesture(event: Event): void {
		if (this.findDragHandle(event)) blockEvent(event);
	}

	private findDragHandle(event: Event): HTMLElement | null {
		for (const target of event.composedPath()) {
			const element = target as HTMLElement;
			if (this.dragHandles.has(element)) return element;
		}
		return null;
	}

	private dockAndSave(): void {
		if (!this.currentPosition) return;

		this.currentEdge = this.nearestEdge(this.currentPosition);
		this.updateOrientation(this.currentEdge);
		this.currentPosition = this.dockedPosition(this.currentPosition, this.currentEdge);
		this.applyPosition();
		this.callbacks.onPositionChange(this.currentPosition);
	}

	private nearestEdge(position: ToolbarPosition): DockEdge {
		const parentRect = this.parentEl.getBoundingClientRect();
		return nearestDockEdge(position, parentRect.width, parentRect.height);
	}

	private updateOrientation(edge: DockEdge): void {
		this.currentEdge = edge;
		const orientation = toolbarOrientation(edge);
		const parentHeight = this.parentEl.getBoundingClientRect().height;
		this.toolbarEl.toggleClass('is-vertical', orientation === 'vertical');
		this.toolbarEl.toggleClass('is-horizontal', orientation === 'horizontal');
		this.toolbarEl.dataset.dockEdge = edge;
		this.toolbarEl.style.setProperty(
			'--ephemeral-toolbar-max-height',
			`${Math.max(0, parentHeight - (EDGE_MARGIN * 2))}px`,
		);
	}

	private constrainPosition(position: ToolbarPosition): ToolbarPosition {
		const parentRect = this.parentEl.getBoundingClientRect();
		const toolbarRect = this.toolbarEl.getBoundingClientRect();
		if (parentRect.width <= 0 || parentRect.height <= 0) return position;

		const minX = Math.min(0.5, ((toolbarRect.width / 2) + EDGE_MARGIN) / parentRect.width);
		const minY = Math.min(0.5, ((toolbarRect.height / 2) + EDGE_MARGIN) / parentRect.height);
		return {
			x: clamp(position.x, minX, 1 - minX),
			y: clamp(position.y, minY, 1 - minY),
		};
	}

	private dockedPosition(position: ToolbarPosition, edge: DockEdge): ToolbarPosition {
		const parentRect = this.parentEl.getBoundingClientRect();
		if (parentRect.width <= 0 || parentRect.height <= 0) return position;

		const constrained = this.constrainPosition(position);
		const toolbarRect = this.toolbarEl.getBoundingClientRect();
		const minX = Math.min(0.5, ((toolbarRect.width / 2) + EDGE_MARGIN) / parentRect.width);
		const minY = Math.min(0.5, ((toolbarRect.height / 2) + EDGE_MARGIN) / parentRect.height);

		switch (edge) {
			case 'left': return { x: minX, y: constrained.y };
			case 'right': return { x: 1 - minX, y: constrained.y };
			case 'top': return { x: constrained.x, y: minY };
			case 'bottom': return { x: constrained.x, y: 1 - minY };
		}
	}

	private applyPosition(): void {
		if (!this.currentPosition) {
			this.toolbarEl.removeClass('is-positioned');
			this.toolbarEl.style.removeProperty('--ephemeral-toolbar-x');
			this.toolbarEl.style.removeProperty('--ephemeral-toolbar-y');
			return;
		}

		this.toolbarEl.addClass('is-positioned');
		this.toolbarEl.style.setProperty('--ephemeral-toolbar-x', `${this.currentPosition.x * 100}%`);
		this.toolbarEl.style.setProperty('--ephemeral-toolbar-y', `${this.currentPosition.y * 100}%`);
	}

	repositionAfterLayout(): void {
		if (this.layoutFrame !== null) this.ownerWindow.cancelAnimationFrame(this.layoutFrame);
		this.layoutFrame = this.ownerWindow.requestAnimationFrame(() => {
			this.layoutFrame = null;
			this.reposition();
		});
	}

	reposition(): void {
		if (!this.currentPosition) return;
		this.updateOrientation(this.nearestEdge(this.currentPosition));
		this.currentPosition = this.dockedPosition(this.currentPosition, this.currentEdge);
		this.applyPosition();
	}

	destroy(): void {
		this.finishDrag(true);
		this.ownerWindow.removeEventListener('pointerdown', this.pointerDown, true);
		this.ownerWindow.removeEventListener('pointermove', this.pointerMove, true);
		this.ownerWindow.removeEventListener('pointerup', this.pointerUp, true);
		this.ownerWindow.removeEventListener('pointercancel', this.pointerCancel, true);
		this.ownerWindow.removeEventListener('click', this.click, true);
		this.ownerWindow.removeEventListener('touchstart', this.touchGesture, true);
		this.ownerWindow.removeEventListener('touchmove', this.touchGesture, true);
		this.ownerWindow.removeEventListener('touchend', this.touchGesture, true);
		this.ownerWindow.removeEventListener('touchcancel', this.touchGesture, true);
		this.ownerWindow.removeEventListener('contextmenu', this.nativeGesture, true);
		this.ownerWindow.removeEventListener('dragstart', this.nativeGesture, true);
		this.ownerWindow.removeEventListener('blur', this.windowBlur);
		if (this.layoutFrame !== null) this.ownerWindow.cancelAnimationFrame(this.layoutFrame);
		if (this.clickResetTimer !== null) this.ownerWindow.clearTimeout(this.clickResetTimer);
	}
}

export function nearestDockEdge(
	position: ToolbarPosition,
	parentWidth: number,
	parentHeight: number,
): DockEdge {
	const distances: Record<DockEdge, number> = {
		left: position.x * parentWidth,
		right: (1 - position.x) * parentWidth,
		top: position.y * parentHeight,
		bottom: (1 - position.y) * parentHeight,
	};

	let nearest: DockEdge = 'bottom';
	for (const edge of ['left', 'right', 'top', 'bottom'] as DockEdge[]) {
		if (distances[edge] < distances[nearest]) nearest = edge;
	}
	return nearest;
}

export function toolbarOrientation(edge: DockEdge): ToolbarOrientation {
	return edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal';
}

function blockEvent(event: Event): void {
	if (event.cancelable) event.preventDefault();
	event.stopImmediatePropagation();
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
