import { setIcon } from 'obsidian';
import { COLOR_BUTTONS, FADE_MODES, WIDTH_OPTIONS } from './constants';
import type { ToolbarPosition } from './settings-model';
import { ToolbarDockingController } from './toolbar-docking';
import type { DrawingColor, FadeMode } from './types';

interface ToolbarState {
	color: DrawingColor;
	width: number;
	fadeMode: FadeMode;
	position: ToolbarPosition | null;
	collapsed: boolean;
}

interface ToolbarCallbacks {
	onColorChange: (color: DrawingColor) => void;
	onWidthChange: (width: number) => void;
	onFadeModeChange: (mode: FadeMode) => void;
	onClear: () => void;
	onExit: () => void;
	onPositionChange: (position: ToolbarPosition) => void;
	onCollapsedChange: (collapsed: boolean) => void;
}

const FADE_SHORT_LABELS: Record<FadeMode, string> = {
	off: 'Fade off',
	fading: 'Fade 1s',
	medium: 'Fade 3s',
	long: 'Fade 5s',
	verylong: 'Fade 7s',
};

export class MobileToolbar {
	private readonly containerEl: HTMLElement;
	private readonly panelEl: HTMLElement;
	private readonly collapsedButton: HTMLButtonElement;
	private readonly widthIndicator: HTMLElement;
	private readonly dockingController: ToolbarDockingController;
	private fadeButton: HTMLButtonElement | null = null;
	private currentColor: DrawingColor;
	private currentWidth: number;
	private currentFadeMode: FadeMode;

	constructor(
		private readonly parentEl: HTMLElement,
		state: ToolbarState,
		private readonly callbacks: ToolbarCallbacks,
	) {
		this.currentColor = state.color;
		this.currentWidth = state.width;
		this.currentFadeMode = state.fadeMode;

		this.containerEl = parentEl.createDiv({ cls: 'ephemeral-toolbar' });
		this.panelEl = this.containerEl.createDiv({ cls: 'ephemeral-toolbar-panel' });
		this.widthIndicator = this.panelEl.createDiv({ cls: 'ephemeral-width-indicator' });
		this.collapsedButton = this.createIconButton(
			this.containerEl,
			'pencil',
			'Show drawing toolbar',
			'ephemeral-toolbar-collapsed-button',
		);

		const dragButton = this.createPanel();
		this.applyCollapsedState(state.collapsed);
		this.dockingController = new ToolbarDockingController(
			this.parentEl,
			this.containerEl,
			[dragButton, this.collapsedButton],
			this.collapsedButton,
			state.position,
			{
				onPositionChange: position => this.callbacks.onPositionChange(position),
				onCollapsedButtonTap: () => this.setCollapsed(false, true),
			},
		);
		this.updateControls();
	}

	private createPanel(): HTMLButtonElement {
		const dragButton = this.createIconButton(
			this.panelEl,
			'grip',
			'Move drawing toolbar',
			'ephemeral-toolbar-drag-handle',
		);
		this.createWidthButtons();
		this.createColorButtons();
		this.createFadeButton();

		const actions = this.panelEl.createDiv({ cls: 'ephemeral-toolbar-group ephemeral-toolbar-actions' });
		const clearButton = this.createIconButton(actions, 'eraser', 'Clear drawing');
		clearButton.addEventListener('click', event => {
			event.stopPropagation();
			this.callbacks.onClear();
		});

		const collapseButton = this.createIconButton(actions, 'minimize-2', 'Collapse drawing toolbar');
		collapseButton.addEventListener('click', event => {
			event.stopPropagation();
			this.setCollapsed(true, true);
		});

		const exitButton = this.createIconButton(actions, 'x', 'Close drawing mode');
		exitButton.addClass('ephemeral-exit-btn');
		exitButton.addEventListener('click', event => {
			event.stopPropagation();
			this.callbacks.onExit();
		});
		return dragButton;
	}

	private createWidthButtons(): void {
		const group = this.panelEl.createDiv({ cls: 'ephemeral-toolbar-group ephemeral-width-group' });
		for (const width of WIDTH_OPTIONS) {
			const button = this.createTextButton(group, '━', `Stroke width ${width}`);
			button.addClass('ephemeral-width-btn');
			button.dataset.width = String(width);
			button.dataset.widthSize = String(width);
			button.addEventListener('click', event => {
				event.stopPropagation();
				this.callbacks.onWidthChange(width);
			});
		}
	}

	private createColorButtons(): void {
		const group = this.panelEl.createDiv({ cls: 'ephemeral-toolbar-group ephemeral-color-group' });
		for (const { color, hex } of COLOR_BUTTONS) {
			const button = this.createTextButton(group, '', `Use ${color} ink`);
			button.addClass('ephemeral-color-btn');
			button.dataset.color = color;
			button.style.setProperty('--ephemeral-color', hex);
			button.addEventListener('click', event => {
				event.stopPropagation();
				this.callbacks.onColorChange(color);
			});
		}
	}

	private createFadeButton(): void {
		const group = this.panelEl.createDiv({ cls: 'ephemeral-toolbar-group' });
		this.fadeButton = this.createTextButton(group, '', 'Change fade duration');
		this.fadeButton.addClass('ephemeral-fade-btn');
		this.fadeButton.addEventListener('click', event => {
			event.stopPropagation();
			const currentIndex = FADE_MODES.indexOf(this.currentFadeMode);
			const nextMode = FADE_MODES[(currentIndex + 1) % FADE_MODES.length];
			if (nextMode) this.callbacks.onFadeModeChange(nextMode);
		});
	}

	private createIconButton(
		parent: HTMLElement,
		icon: string,
		label: string,
		extraClass?: string,
	): HTMLButtonElement {
		const button = parent.createEl('button', { cls: 'ephemeral-toolbar-btn' });
		if (extraClass) button.addClass(extraClass);
		button.setAttribute('aria-label', label);
		button.setAttribute('title', label);
		setIcon(button, icon);
		return button;
	}

	private createTextButton(parent: HTMLElement, text: string, label: string): HTMLButtonElement {
		const button = parent.createEl('button', { text, cls: 'ephemeral-toolbar-btn' });
		button.setAttribute('aria-label', label);
		button.setAttribute('title', label);
		return button;
	}

	private setCollapsed(collapsed: boolean, notify: boolean): void {
		this.applyCollapsedState(collapsed);
		if (notify) this.callbacks.onCollapsedChange(collapsed);
		this.dockingController.repositionAfterLayout();
	}

	private applyCollapsedState(collapsed: boolean): void {
		this.containerEl.toggleClass('is-collapsed', collapsed);
		this.panelEl.toggleClass('ephemeral-display-none', collapsed);
		this.collapsedButton.toggleClass('ephemeral-display-none', !collapsed);
	}

	setColor(color: DrawingColor): void {
		this.currentColor = color;
		this.updateControls();
	}

	setWidth(width: number): void {
		this.currentWidth = width;
		this.updateControls();
	}

	setFadeMode(mode: FadeMode): void {
		this.currentFadeMode = mode;
		this.updateControls();
	}

	reposition(): void {
		this.dockingController.reposition();
	}

	private updateControls(): void {
		this.widthIndicator.empty();
		const dot = this.widthIndicator.createDiv({ cls: 'ephemeral-width-dot' });
		dot.style.width = `${Math.max(4, this.currentWidth * 2)}px`;
		dot.style.height = dot.style.width;

		this.containerEl.querySelectorAll<HTMLElement>('.ephemeral-width-btn').forEach(button => {
			const active = Number(button.dataset.width) === this.currentWidth;
			button.toggleClass('is-active', active);
			button.setAttribute('aria-pressed', String(active));
		});
		this.containerEl.querySelectorAll<HTMLElement>('.ephemeral-color-btn').forEach(button => {
			const active = button.dataset.color === this.currentColor;
			button.toggleClass('is-active', active);
			button.setAttribute('aria-pressed', String(active));
		});
		if (this.fadeButton) {
			this.fadeButton.textContent = FADE_SHORT_LABELS[this.currentFadeMode];
			this.fadeButton.setAttribute('aria-label', `${FADE_SHORT_LABELS[this.currentFadeMode]}. Change fade duration`);
		}
	}

	destroy(): void {
		this.dockingController.destroy();
		this.containerEl.remove();
	}
}
