import { Notice, Plugin, TFile, TFolder } from 'obsidian';
import { ContextPackSettingTab } from './settings';
import { ContextPackSettings, DEFAULT_SETTINGS } from './types';
import type { PackSource } from './types';
import { PackModal } from './ui/PackModal';
import { buildAndCopy } from './ui/run';
import { ItemSuggestModal } from './ui/suggest';

export default class ContextPackPlugin extends Plugin {
	settings!: ContextPackSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ContextPackSettingTab(this.app, this));

		this.addCommand({
			id: 'build-pack',
			name: 'Build context pack',
			callback: () => new PackModal(this.app, this).open(),
		});

		this.addCommand({
			id: 'pack-current-note-and-links',
			name: 'Pack current note and its links',
			callback: () => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'md') {
					new Notice('Open a markdown note first.');
					return;
				}
				void buildAndCopy(
					this,
					{ kind: 'links', notePath: file.path, depth: 1 },
					this.settings.defaultOptions,
				);
			},
		});

		this.addCommand({
			id: 'rebuild-saved-pack',
			name: 'Rebuild saved pack',
			callback: () => {
				const packs = this.settings.savedPacks;
				if (packs.length === 0) {
					new Notice('No saved packs yet.');
					return;
				}
				new ItemSuggestModal(
					this.app,
					packs,
					(p) => p.name,
					(p) => void buildAndCopy(this, p.source, p.options),
					'Choose a saved pack',
				).open();
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				let source: PackSource;
				if (file instanceof TFolder) {
					source = { kind: 'folder', path: file.isRoot() ? '/' : file.path };
				} else if (file instanceof TFile && file.extension === 'md') {
					source = { kind: 'links', notePath: file.path, depth: 0 };
				} else {
					return;
				}
				menu.addItem((item) =>
					item
						.setTitle('Copy as context pack')
						.setIcon('copy')
						.onClick(
							() =>
								void buildAndCopy(
									this,
									source,
									this.settings.defaultOptions,
								),
						),
				);
			}),
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ContextPackSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
