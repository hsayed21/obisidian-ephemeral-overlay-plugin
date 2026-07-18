import { shouldStartDrawing } from './input-policy';

interface DrawingInputCallbacks {
	onStart: (event: PointerEvent) => void;
	onMove: (events: PointerEvent[]) => void;
	onEnd: (discard: boolean) => void;
	onNavigate: () => void;
	onWidthAdjust: (increment: number) => void;
	onActiveChange: (active: boolean) => void;
}

interface DrawingInputOptions {
	contentEl: HTMLElement;
	viewEl: HTMLElement;
	getPenOnlyMode: () => boolean;
	isToolbarEvent: (event: Event) => boolean;
	callbacks: DrawingInputCallbacks;
}

export class DrawingInputController {
	private readonly contentEl: HTMLElement;
	private readonly viewEl: HTMLElement;
	private readonly ownerDocument: Document;
	private readonly ownerWindow: Window;
	private readonly getPenOnlyMode: () => boolean;
	private readonly isToolbarEvent: (event: Event) => boolean;
	private readonly callbacks: DrawingInputCallbacks;
	private activePointerId: number | null = null;

	private readonly pointerDown = (event: PointerEvent): void => this.handlePointerDown(event);
	private readonly pointerMove = (event: PointerEvent): void => this.handlePointerMove(event);
	private readonly pointerUp = (event: PointerEvent): void => this.finishPointer(event, false);
	private readonly pointerCancel = (event: PointerEvent): void => this.finishPointer(event, false);
	private readonly lostPointerCapture = (event: PointerEvent): void => this.finishPointer(event, false);
	private readonly touchGesture = (event: TouchEvent): void => this.handleTouchGesture(event);
	private readonly scroll = (): void => this.callbacks.onNavigate();
	private readonly wheel = (event: WheelEvent): void => this.handleWheel(event);
	private readonly nativeInteraction = (event: Event): void => this.blockNativeInteraction(event);
	private readonly blur = (): void => this.cancelActive(false);
	private readonly visibilityChange = (): void => {
		if (this.ownerDocument.hidden) this.cancelActive(false);
	};

	constructor(options: DrawingInputOptions) {
		this.contentEl = options.contentEl;
		this.viewEl = options.viewEl;
		this.ownerDocument = this.contentEl.ownerDocument;
		const ownerWindow = this.ownerDocument.defaultView;
		if (!ownerWindow) throw new Error('Drawing overlay requires a browser window');
		this.ownerWindow = ownerWindow;
		this.getPenOnlyMode = options.getPenOnlyMode;
		this.isToolbarEvent = options.isToolbarEvent;
		this.callbacks = options.callbacks;
		this.attach();
	}

	private attach(): void {
		this.contentEl.addEventListener('pointerdown', this.pointerDown, { capture: true, passive: false });
		this.contentEl.addEventListener('lostpointercapture', this.lostPointerCapture, true);
		this.contentEl.addEventListener('touchstart', this.touchGesture, { capture: true, passive: false });
		this.contentEl.addEventListener('touchmove', this.touchGesture, { capture: true, passive: false });
		this.contentEl.addEventListener('contextmenu', this.nativeInteraction, true);
		this.contentEl.addEventListener('selectstart', this.nativeInteraction, true);
		this.viewEl.addEventListener('scroll', this.scroll, { capture: true, passive: true });
		this.viewEl.addEventListener('wheel', this.wheel, { capture: true, passive: false });
		this.ownerDocument.addEventListener('pointermove', this.pointerMove, { capture: true, passive: false });
		this.ownerDocument.addEventListener('pointerup', this.pointerUp, true);
		this.ownerDocument.addEventListener('pointercancel', this.pointerCancel, true);
		this.ownerDocument.addEventListener('visibilitychange', this.visibilityChange);
		this.ownerWindow.addEventListener('blur', this.blur);
	}

	private handlePointerDown(event: PointerEvent): void {
		if (this.isToolbarEvent(event)) return;

		if (this.activePointerId !== null) {
			if (event.pointerType === 'touch') {
				event.preventDefault();
				event.stopPropagation();
			}
			return;
		}

		if (!shouldStartDrawing(event.pointerType, event.button, this.getPenOnlyMode())) return;

		event.preventDefault();
		event.stopPropagation();
		this.activePointerId = event.pointerId;
		this.callbacks.onActiveChange(true);
		this.callbacks.onStart(event);
		try {
			this.contentEl.setPointerCapture(event.pointerId);
		} catch {
			// WebKit may already own implicit capture; document listeners still track the stroke.
		}
	}

	private handlePointerMove(event: PointerEvent): void {
		if (event.pointerId !== this.activePointerId) return;

		event.preventDefault();
		event.stopPropagation();
		const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
		this.callbacks.onMove(events);
	}

	private finishPointer(event: PointerEvent, discard: boolean): void {
		if (event.pointerId !== this.activePointerId) return;

		if (event.type !== 'lostpointercapture') {
			event.preventDefault();
			event.stopPropagation();
		}
		const pointerId = this.activePointerId;
		this.activePointerId = null;
		this.callbacks.onEnd(discard);
		this.callbacks.onActiveChange(false);
		if (pointerId !== null && this.contentEl.hasPointerCapture(pointerId)) {
			this.contentEl.releasePointerCapture(pointerId);
		}
	}

	private handleTouchGesture(event: TouchEvent): void {
		if (this.isToolbarEvent(event)) return;

		const stylusTouch = hasStylusTouch(event.changedTouches);
		if (stylusTouch || this.activePointerId !== null) {
			if (event.cancelable) event.preventDefault();
			event.stopPropagation();
			return;
		}

		if (event.type === 'touchmove') this.callbacks.onNavigate();
	}

	private handleWheel(event: WheelEvent): void {
		if (this.isToolbarEvent(event)) return;

		if (event.ctrlKey) {
			event.preventDefault();
			this.callbacks.onWidthAdjust(event.deltaY < 0 ? 1 : -1);
			return;
		}
		this.callbacks.onNavigate();
	}

	private blockNativeInteraction(event: Event): void {
		if (this.activePointerId === null) return;
		event.preventDefault();
		event.stopPropagation();
	}

	isActive(): boolean {
		return this.activePointerId !== null;
	}

	cancelActive(discard: boolean): void {
		const pointerId = this.activePointerId;
		if (pointerId === null) return;

		this.activePointerId = null;
		this.callbacks.onEnd(discard);
		this.callbacks.onActiveChange(false);
		if (this.contentEl.hasPointerCapture(pointerId)) {
			this.contentEl.releasePointerCapture(pointerId);
		}
	}

	destroy(): void {
		this.cancelActive(true);
		this.contentEl.removeEventListener('pointerdown', this.pointerDown, true);
		this.contentEl.removeEventListener('lostpointercapture', this.lostPointerCapture, true);
		this.contentEl.removeEventListener('touchstart', this.touchGesture, true);
		this.contentEl.removeEventListener('touchmove', this.touchGesture, true);
		this.contentEl.removeEventListener('contextmenu', this.nativeInteraction, true);
		this.contentEl.removeEventListener('selectstart', this.nativeInteraction, true);
		this.viewEl.removeEventListener('scroll', this.scroll, true);
		this.viewEl.removeEventListener('wheel', this.wheel, true);
		this.ownerDocument.removeEventListener('pointermove', this.pointerMove, true);
		this.ownerDocument.removeEventListener('pointerup', this.pointerUp, true);
		this.ownerDocument.removeEventListener('pointercancel', this.pointerCancel, true);
		this.ownerDocument.removeEventListener('visibilitychange', this.visibilityChange);
		this.ownerWindow.removeEventListener('blur', this.blur);
	}
}

function hasStylusTouch(touches: TouchList): boolean {
	for (let index = 0; index < touches.length; index++) {
		if (touches[index]?.touchType === 'stylus') return true;
	}
	return false;
}
