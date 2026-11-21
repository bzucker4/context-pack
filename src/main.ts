import { Plugin } from 'obsidian';
import { ContextPackSettings, DEFAULT_SETTINGS } from './types';

export default class ContextPackPlugin extends Plugin {
	settings!: ContextPackSettings;

	async onload() {
		await this.loadSettings();
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
