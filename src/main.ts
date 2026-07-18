import { MarkdownView, Plugin } from 'obsidian';
import { DrawingOverlay, type ToolPreferenceChange } from './overlay';
import { EphemeralOverlaySettingTab } from './settings';
import { normalizeSettings, type PluginSettings, type ToolbarPosition } from './settings-model';

export default class EphemeralOverlayPlugin extends Plugin {
	settings: PluginSettings = normalizeSettings(null);
	private overlay: DrawingOverlay | null = null;
	private ribbonIconEl: HTMLElement | null = null;
	private statusBarItem: HTMLElement | null = null;
	private saveQueue: Promise<void> = Promise.resolve();

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new EphemeralOverlaySettingTab(this.app, this));

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('');
		this.statusBarItem.hide();

		this.ribbonIconEl = this.addRibbonIcon('pencil', 'Toggle drawing overlay', () => {
			this.toggleOverlay();
		});

		this.addCommand({
			id: 'toggle-drawing-overlay',
			name: 'Toggle drawing overlay',
			callback: () => this.toggleOverlay(),
		});

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.handleActiveLeafChange())
		);

		this.updateViewActionButton();
	}

	async loadSettings() {
		this.settings = normalizeSettings(await this.loadData());
	}

	saveSettings(): Promise<void> {
		this.saveQueue = this.saveQueue
			.catch(() => undefined)
			.then(() => this.saveData(this.settings));
		return this.saveQueue;
	}

	refreshOverlay() {
		if (!this.overlay) return;

		this.disableOverlay();
		this.enableOverlay();
	}

	onunload() {
		this.disableOverlay();
	}

	private toggleOverlay() {
		if (this.overlay) {
			this.disableOverlay();
		} else {
			this.enableOverlay();
		}
	}

	private enableOverlay() {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) return;

		this.overlay = new DrawingOverlay({
			app: this.app,
			markdownView,
			settings: this.settings,
			statusBarItem: this.statusBarItem,
			callbacks: {
				onExit: () => this.disableOverlay(),
				onToolChange: change => this.rememberTool(change),
				onToolbarPositionChange: position => this.rememberToolbarPosition(position),
				onToolbarCollapsedChange: collapsed => this.rememberToolbarCollapsed(collapsed),
			},
		});

		this.ribbonIconEl?.addClass('is-active');
		this.statusBarItem?.show();
	}

	private disableOverlay() {
		if (this.overlay) {
			this.overlay.destroy();
			this.overlay = null;
		}

		this.statusBarItem?.hide();
		this.ribbonIconEl?.removeClass('is-active');
	}

	private updateViewActionButton() {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) return;

		const viewEl = markdownView.containerEl;
		if (viewEl.querySelector('.view-actions .clickable-icon[aria-label="Toggle drawing"]')) {
			return;
		}

		markdownView.addAction('pen-tool', 'Toggle drawing', () => this.toggleOverlay());
	}

	private handleActiveLeafChange(): void {
		if (this.overlay) this.disableOverlay();
		this.updateViewActionButton();
	}

	private rememberTool(change: ToolPreferenceChange): void {
		if (!this.settings.rememberLastTool) return;

		if (change.color) this.settings.lastColor = change.color;
		if (change.width !== undefined) this.settings.lastStrokeWidth = change.width;
		if (change.fadeMode) this.settings.lastFadeMode = change.fadeMode;
		void this.saveSettings();
	}

	private rememberToolbarPosition(position: ToolbarPosition): void {
		this.settings.toolbarPosition = position;
		void this.saveSettings();
	}

	private rememberToolbarCollapsed(collapsed: boolean): void {
		this.settings.toolbarCollapsed = collapsed;
		void this.saveSettings();
	}
}
