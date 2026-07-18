import { App, MarkdownView, Platform } from 'obsidian';
import { CanvasRenderer } from './canvas-renderer';
import {
	DEFAULT_COLOR,
	DEFAULT_FADE_MODE,
	DEFAULT_STROKE_WIDTH,
	FADE_LABELS,
	FADE_MODES,
	MAX_STROKE_WIDTH,
	MIN_STROKE_WIDTH,
} from './constants';
import { FadeAnimator } from './fade-animator';
import { DrawingInputController } from './input-controller';
import { isEditableTarget } from './input-policy';
import { PluginSettings, ToolbarPosition } from './settings-model';
import { pressureFactor, shouldAppendPoint, smoothPoint } from './stroke-utils';
import { MobileToolbar } from './toolbar';
import { DrawingColor, DrawingState, FadeMode, Point, Stroke } from './types';

export interface ToolPreferenceChange {
	color?: DrawingColor;
	width?: number;
	fadeMode?: FadeMode;
}

interface DrawingOverlayCallbacks {
	onExit: () => void;
	onToolChange: (change: ToolPreferenceChange) => void;
	onToolbarPositionChange: (position: ToolbarPosition) => void;
	onToolbarCollapsedChange: (collapsed: boolean) => void;
}

interface DrawingOverlayOptions {
	app: App;
	markdownView: MarkdownView;
	settings: PluginSettings;
	statusBarItem: HTMLElement | null;
	callbacks: DrawingOverlayCallbacks;
}

export class DrawingOverlay {
	private readonly app: App;
	private readonly markdownView: MarkdownView;
	private readonly settings: PluginSettings;
	private readonly callbacks: DrawingOverlayCallbacks;
	private readonly overlayEl: HTMLElement;
	private readonly canvas: HTMLCanvasElement;
	private readonly renderer: CanvasRenderer;
	private readonly fadeAnimator: FadeAnimator;
	private readonly inputController: DrawingInputController;
	private readonly ownerDocument: Document;
	private readonly ownerWindow: Window;
	private readonly state: DrawingState;
	private toolbar: MobileToolbar | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private layoutChangeRef: (() => void) | null = null;
	private layoutTimer: number | null = null;
	private cursorEl: HTMLElement | null = null;
	private statusBarItem: HTMLElement | null;
	private pendingResize = false;

	private readonly handleKeyDown = (event: KeyboardEvent): void => this.onKeyDown(event);
	private readonly handleMouseMove = (event: MouseEvent): void => this.onMouseMove(event);
	private readonly handleWindowResize = (): void => this.handleResize();

	constructor(options: DrawingOverlayOptions) {
		this.app = options.app;
		this.markdownView = options.markdownView;
		this.settings = options.settings;
		this.callbacks = options.callbacks;
		this.statusBarItem = options.statusBarItem;
		this.ownerDocument = this.markdownView.contentEl.ownerDocument;
		const ownerWindow = this.ownerDocument.defaultView;
		if (!ownerWindow) throw new Error('Drawing overlay requires a browser window');
		this.ownerWindow = ownerWindow;

		this.state = this.createInitialState();
		this.overlayEl = this.markdownView.contentEl.createDiv({ cls: 'ephemeral-overlay' });
		this.canvas = this.overlayEl.createEl('canvas', { cls: 'ephemeral-overlay-canvas' });
		this.renderer = new CanvasRenderer(this.canvas);
		this.fadeAnimator = new FadeAnimator(
			this.renderer,
			() => this.state.strokes,
			strokes => { this.state.strokes = strokes; },
			() => ({
				points: this.state.currentStroke,
				color: this.state.currentColor,
				width: this.state.strokeWidth,
			}),
			() => this.state.isDrawing,
			this.ownerWindow,
		);

		if (Platform.isMobile) this.createMobileToolbar();
		if (!Platform.isMobile) this.createCustomCursor();

		this.inputController = new DrawingInputController({
			contentEl: this.markdownView.contentEl,
			viewEl: this.markdownView.containerEl,
			getPenOnlyMode: () => this.settings.penOnlyMode,
			isToolbarEvent: event => this.isToolbarEvent(event),
			callbacks: {
				onStart: event => this.startStroke(event),
				onMove: events => this.extendStroke(events),
				onEnd: discard => this.finishStroke(discard),
				onNavigate: () => this.handleNavigation(),
				onWidthAdjust: increment => this.adjustWidth(increment),
				onActiveChange: active => this.updateDrawingActivity(active),
			},
		});

		this.attachAuxiliaryListeners();
		this.renderer.resize();
		this.setupResizeObserver();
		this.updateStatusBar();
	}

	private createInitialState(): DrawingState {
		const remember = this.settings.rememberLastTool;
		return {
			currentColor: remember ? this.settings.lastColor : DEFAULT_COLOR,
			strokeWidth: remember ? this.settings.lastStrokeWidth : DEFAULT_STROKE_WIDTH,
			fadeMode: remember ? this.settings.lastFadeMode : DEFAULT_FADE_MODE,
			isDrawing: false,
			currentStroke: [],
			strokes: [],
		};
	}

	private createMobileToolbar(): void {
		this.toolbar = new MobileToolbar(
			this.overlayEl,
			{
				color: this.state.currentColor,
				width: this.state.strokeWidth,
				fadeMode: this.state.fadeMode,
				position: this.settings.toolbarPosition,
				collapsed: this.settings.toolbarCollapsed,
			},
			{
				onColorChange: color => this.setColor(color),
				onWidthChange: width => this.setWidth(width),
				onFadeModeChange: mode => this.setFadeMode(mode),
				onClear: () => this.clearCanvas(),
				onExit: this.callbacks.onExit,
				onPositionChange: this.callbacks.onToolbarPositionChange,
				onCollapsedChange: this.callbacks.onToolbarCollapsedChange,
			},
		);
	}

	private attachAuxiliaryListeners(): void {
		if (!Platform.isMobile) {
			this.ownerDocument.addEventListener('keydown', this.handleKeyDown);
			this.markdownView.contentEl.addEventListener('mousemove', this.handleMouseMove);
		}
		this.ownerWindow.addEventListener('resize', this.handleWindowResize);
	}

	private setupResizeObserver(): void {
		this.resizeObserver = new ResizeObserver(() => this.handleResize());
		this.resizeObserver.observe(this.overlayEl);
		this.layoutChangeRef = () => {
			if (this.layoutTimer !== null) this.ownerWindow.clearTimeout(this.layoutTimer);
			this.layoutTimer = this.ownerWindow.setTimeout(() => {
				this.layoutTimer = null;
				this.handleResize();
			}, 50);
		};
		this.app.workspace.on('layout-change', this.layoutChangeRef);
	}

	private startStroke(event: PointerEvent): void {
		this.state.isDrawing = true;
		this.state.currentStroke = [this.pointFromEvent(event)];
	}

	private extendStroke(events: PointerEvent[]): void {
		if (!this.state.isDrawing) return;

		const previousLength = this.state.currentStroke.length;
		for (const event of events) {
			const rawPoint = this.pointFromEvent(event);
			const previous = this.state.currentStroke[this.state.currentStroke.length - 1];
			if (!previous) {
				this.state.currentStroke.push(rawPoint);
				continue;
			}
			const point = smoothPoint(previous, rawPoint, this.settings.strokeSmoothing);
			if (shouldAppendPoint(previous, point)) this.state.currentStroke.push(point);
		}

		if (this.state.currentStroke.length > previousLength) {
			const segmentStart = Math.max(0, previousLength - 1);
			this.renderer.drawStroke(
				this.state.currentStroke.slice(segmentStart),
				this.state.currentColor,
				this.state.strokeWidth,
			);
		}
	}

	private pointFromEvent(event: PointerEvent): Point {
		const pressure = pressureFactor(
			event.pointerType,
			event.pressure,
			this.settings.pressureSensitivity,
		);
		return this.renderer.getCanvasPoint(event.clientX, event.clientY, pressure);
	}

	private finishStroke(discard: boolean): void {
		if (!this.state.isDrawing) return;

		if (!discard && this.state.currentStroke.length > 0) {
			if (this.state.currentStroke.length === 1) {
				this.renderer.drawStroke(
					this.state.currentStroke,
					this.state.currentColor,
					this.state.strokeWidth,
				);
			}
			this.state.strokes.push({
				points: [...this.state.currentStroke],
				color: this.state.currentColor,
				width: this.state.strokeWidth,
				timestamp: Date.now(),
			});
			this.fadeAnimator.start(this.state.fadeMode);
		}

		this.state.currentStroke = [];
		this.state.isDrawing = false;
		if (this.pendingResize) this.performResize();
	}

	private updateDrawingActivity(active: boolean): void {
		this.cursorEl?.toggleClass('ephemeral-display-none', active);
	}

	private handleNavigation(): void {
		if (this.settings.clearOnScroll) this.clearCanvas();
	}

	private onKeyDown(event: KeyboardEvent): void {
		if (isEditableTarget(event.target)) return;

		if (event.ctrlKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
			event.preventDefault();
			this.adjustWidth(event.key === 'ArrowUp' ? 1 : -1);
			return;
		}

		const shortcuts: Record<string, () => void> = {
			r: () => this.setColor('red'),
			y: () => this.setColor('yellow'),
			b: () => this.setColor('blue'),
			g: () => this.setColor('green'),
			o: () => this.setColor('orange'),
			p: () => this.setColor('pink'),
			'1': () => this.setWidth(2),
			'2': () => this.setWidth(4),
			'3': () => this.setWidth(8),
			'4': () => this.setWidth(12),
			'5': () => this.setWidth(16),
			f: () => this.cycleFadeMode(),
			e: () => this.clearCanvas(),
			escape: this.callbacks.onExit,
		};
		const action = shortcuts[event.key.toLowerCase()];
		if (!action) return;

		event.preventDefault();
		event.stopPropagation();
		action();
	}

	private onMouseMove(event: MouseEvent): void {
		if (!this.cursorEl) return;
		this.cursorEl.style.left = `${event.clientX}px`;
		this.cursorEl.style.top = `${event.clientY}px`;
	}

	private handleResize(): void {
		this.toolbar?.reposition();
		if (this.state.isDrawing) {
			this.pendingResize = true;
			return;
		}
		this.performResize();
	}

	private performResize(): void {
		this.renderer.resize();
		this.redrawStrokes(this.state.strokes);
		this.pendingResize = false;
	}

	private setColor(color: DrawingColor): void {
		this.state.currentColor = color;
		this.toolbar?.setColor(color);
		this.updateCustomCursor();
		this.callbacks.onToolChange({ color });
	}

	private setWidth(width: number): void {
		this.state.strokeWidth = Math.max(MIN_STROKE_WIDTH, Math.min(MAX_STROKE_WIDTH, width));
		this.toolbar?.setWidth(this.state.strokeWidth);
		this.updateCustomCursor();
		this.callbacks.onToolChange({ width: this.state.strokeWidth });
	}

	private adjustWidth(increment: number): void {
		this.setWidth(this.state.strokeWidth + increment);
	}

	private setFadeMode(mode: FadeMode): void {
		this.state.fadeMode = mode;
		this.toolbar?.setFadeMode(mode);
		this.updateStatusBar();
		this.callbacks.onToolChange({ fadeMode: mode });

		if (mode === 'off') {
			this.fadeAnimator.stop();
			this.redrawStrokes(this.state.strokes);
		} else if (this.state.strokes.length > 0) {
			this.fadeAnimator.start(mode);
		}
	}

	private cycleFadeMode(): void {
		const currentIndex = FADE_MODES.indexOf(this.state.fadeMode);
		const nextMode = FADE_MODES[(currentIndex + 1) % FADE_MODES.length];
		if (nextMode) this.setFadeMode(nextMode);
	}

	private clearCanvas(): void {
		this.inputController.cancelActive(true);
		this.state.strokes = [];
		this.state.currentStroke = [];
		this.state.isDrawing = false;
		this.fadeAnimator.stop();
		this.renderer.clear();
	}

	private redrawStrokes(strokes: Stroke[]): void {
		this.renderer.clear();
		for (const stroke of strokes) {
			this.renderer.drawStroke(stroke.points, stroke.color, stroke.width);
		}
	}

	private isToolbarEvent(event: Event): boolean {
		const element = event.target as Element | null;
		return typeof element?.closest === 'function' && element.closest('.ephemeral-toolbar') !== null;
	}

	private createCustomCursor(): void {
		this.markdownView.contentEl.addClass('ephemeral-cursor-none');
		this.cursorEl = this.ownerDocument.body.createDiv({ cls: 'ephemeral-cursor' });
		this.updateCustomCursor();
	}

	private updateCustomCursor(): void {
		if (!this.cursorEl) return;

		const size = this.state.strokeWidth * 2;
		this.cursorEl.style.width = `${size}px`;
		this.cursorEl.style.height = `${size}px`;
		this.cursorEl.dataset.color = this.state.currentColor;
		for (const color of ['red', 'yellow', 'blue', 'green', 'orange', 'pink']) {
			this.cursorEl.removeClass(`ephemeral-cursor-${color}`);
		}
		this.cursorEl.addClass(`ephemeral-cursor-${this.state.currentColor}`);
	}

	private updateStatusBar(): void {
		this.statusBarItem?.setText(FADE_LABELS[this.state.fadeMode]);
	}

	destroy(): void {
		this.inputController.destroy();
		this.fadeAnimator.stop();
		this.ownerDocument.removeEventListener('keydown', this.handleKeyDown);
		this.markdownView.contentEl.removeEventListener('mousemove', this.handleMouseMove);
		this.ownerWindow.removeEventListener('resize', this.handleWindowResize);
		this.markdownView.contentEl.removeClass('ephemeral-cursor-none');

		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		if (this.layoutChangeRef) this.app.workspace.off('layout-change', this.layoutChangeRef);
		this.layoutChangeRef = null;
		if (this.layoutTimer !== null) this.ownerWindow.clearTimeout(this.layoutTimer);
		this.layoutTimer = null;
		this.statusBarItem = null;
		this.cursorEl?.remove();
		this.cursorEl = null;
		this.toolbar?.destroy();
		this.toolbar = null;
		this.overlayEl.remove();
		this.state.strokes = [];
		this.state.currentStroke = [];
	}
}
