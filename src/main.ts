import { MarkdownView, Plugin } from 'obsidian';
import { DrawingOverlay } from './overlay';
import { DEFAULT_SETTINGS, EphemeralOverlaySettingTab, PluginSettings } from './settings';

export default class EphemeralOverlayPlugin extends Plugin {
	settings: PluginSettings;
	private overlay: DrawingOverlay | null = null;
	private ribbonIconEl: HTMLElement | null = null;
	private statusBarItem: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new EphemeralOverlaySettingTab(this.app, this));

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.setText('');
		this.statusBarItem.hide();

		this.ribbonIconEl = this.addRibbonIcon('pencil', 'Toggle Drawing Overlay', () => {
			this.toggleOverlay();
		});

		this.addCommand({
			id: 'toggle-drawing-overlay',
			name: 'Toggle Drawing Overlay',
			callback: () => this.toggleOverlay()
			// hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'D' }]
		});

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => this.updateViewActionButton())
		);

		this.updateViewActionButton();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		if (this.overlay) {
			this.overlay.destroy();
			this.overlay = null;
		}
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

		this.overlay = new DrawingOverlay(
			this.app,
			markdownView,
			this.settings,
			this.statusBarItem,
			() => this.disableOverlay()
		);

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
		if (viewEl.querySelector('.view-actions .clickable-icon[aria-label="Toggle Drawing"]')) {
			return;
		}
		
		(markdownView as any).addAction('pen-tool', 'Toggle Drawing', () => this.toggleOverlay());
	}
}
