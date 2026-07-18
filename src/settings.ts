import { App, PluginSettingTab, Setting } from 'obsidian';
import EphemeralOverlayPlugin from './main';

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

		new Setting(containerEl)
			.setName('Remember the last tool')
			.setDesc('Restore the last color, stroke width, and fade mode when drawing opens again.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.rememberLastTool)
				.onChange(async (value) => {
					this.plugin.settings.rememberLastTool = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pressure sensitivity')
			.setDesc('Vary stroke width with stylus pressure. Mouse strokes keep a consistent width.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.pressureSensitivity)
				.onChange(async (value) => {
					this.plugin.settings.pressureSensitivity = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Stroke smoothing')
			.setDesc('Reduce hand jitter. Lower values follow the stylus more closely.')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.05)
				.setDynamicTooltip()
				.setValue(this.plugin.settings.strokeSmoothing)
				.onChange(async (value) => {
					this.plugin.settings.strokeSmoothing = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Toolbar position')
			.setDesc('Restore the toolbar to its default position at the bottom of the note.')
			.addButton(button => button
				.setButtonText('Reset position')
				.onClick(async () => {
					this.plugin.settings.toolbarPosition = null;
					this.plugin.settings.toolbarCollapsed = false;
					await this.plugin.saveSettings();
					this.plugin.refreshOverlay();
				}));
	}
}
