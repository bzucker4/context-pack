import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type ContextPackPlugin from './main';
import type { PackOptions, PackSource } from './types';

export class ContextPackSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: ContextPackPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const settings = this.plugin.settings;
		const save = () => this.plugin.saveSettings();

		new Setting(containerEl).setName('Defaults for new packs').setHeading();
		new Setting(containerEl)
			.setName('Format')
			.setDesc('Output format for new packs.')
			.addDropdown((dd) =>
				dd
					.addOptions({ markdown: 'Markdown', xml: 'XML' })
					.setValue(settings.defaultOptions.format)
					.onChange(async (v) => {
						settings.defaultOptions.format = v as PackOptions['format'];
						await save();
					}),
			);
		const toggles: [keyof Omit<PackOptions, 'format'>, string][] = [
			['includeFrontmatter', 'Include frontmatter'],
			['includePaths', 'Include file paths'],
			['stripEmbeds', 'Strip embeds'],
			['stripImages', 'Strip images'],
		];
		for (const [key, name] of toggles) {
			new Setting(containerEl).setName(name).addToggle((t) =>
				t.setValue(settings.defaultOptions[key]).onChange(async (v) => {
					settings.defaultOptions[key] = v;
					await save();
				}),
			);
		}

		new Setting(containerEl)
			.setName('Model limits')
			.setDesc('Token limits to check each pack against. Counts are estimates.')
			.setHeading();
		settings.modelLimits.forEach((limit, index) => {
			new Setting(containerEl)
				.setClass('context-pack-limit-row')
				.addText((t) =>
					t
						.setPlaceholder('Model name')
						.setValue(limit.name)
						.onChange(async (v) => {
							limit.name = v;
							await save();
						}),
				)
				.addText((t) =>
					t
						.setPlaceholder('Token limit')
						.setValue(String(limit.tokens))
						.onChange(async (v) => {
							const n = Number(v.replace(/[,_\s]/g, ''));
							if (!Number.isFinite(n) || n <= 0) return;
							limit.tokens = Math.round(n);
							await save();
						}),
				)
				.addExtraButton((b) =>
					b
						.setIcon('trash')
						.setTooltip('Remove limit')
						.onClick(async () => {
							settings.modelLimits.splice(index, 1);
							await save();
							this.display();
						}),
				);
		});
		new Setting(containerEl).addButton((b) =>
			b.setButtonText('Add model limit').onClick(async () => {
				settings.modelLimits.push({ name: 'New model', tokens: 100000 });
				await save();
				this.display();
			}),
		);

		new Setting(containerEl).setName('Saved packs').setHeading();
		if (settings.savedPacks.length === 0) {
			containerEl.createEl('p', {
				cls: 'setting-item-description',
				text: 'No saved packs yet. Save one from the build context pack dialog.',
			});
		}
		settings.savedPacks.forEach((pack, index) => {
			new Setting(containerEl)
				.setClass('context-pack-saved-row')
				.setDesc(describeSource(pack.source))
				.addText((t) =>
					t.setValue(pack.name).onChange(async (v) => {
						if (v.trim() === '') return;
						pack.name = v.trim();
						await save();
					}),
				)
				.addExtraButton((b) =>
					b
						.setIcon('trash')
						.setTooltip('Delete pack')
						.onClick(async () => {
							settings.savedPacks.splice(index, 1);
							await save();
							new Notice(`Deleted pack "${pack.name}"`);
							this.display();
						}),
				);
		});
	}
}

function describeSource(source: PackSource): string {
	switch (source.kind) {
		case 'folder':
			return `Folder: ${source.path}`;
		case 'tag':
			return `Tag: ${source.tag}`;
		case 'links':
			return `${source.notePath}${source.depth === 1 ? ' and its links' : ''}`;
	}
}
