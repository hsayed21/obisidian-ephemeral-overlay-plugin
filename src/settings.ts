import { App, PluginSettingTab, Setting } from 'obsidian';
import EphemeralOverlayPlugin from './main';

export interface PluginSettings {
	penOnlyMode: boolean;
	clearOnScroll: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	penOnlyMode: false,
	clearOnScroll: false
};

export class EphemeralOverlaySettingTab extends PluginSettingTab {
	plugin: EphemeralOverlayPlugin;

	constructor(app: App, plugin: EphemeralOverlayPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Pen only mode')
			.setDesc('Draw with your stylus while finger touches continue to scroll and interact with the note normally.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.penOnlyMode)
				.onChange(async (value) => {
					this.plugin.settings.penOnlyMode = value;
					await this.plugin.saveSettings();
					this.plugin.refreshOverlay();
					this.display();
				}));

		new Setting(containerEl)
			.setName('Clear on scroll')
			.setDesc('Clear all drawings when the note scrolls by touch, mouse wheel, or trackpad.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.clearOnScroll)
				.onChange(async (value) => {
					this.plugin.settings.clearOnScroll = value;
					await this.plugin.saveSettings();
				}));
	}
}
