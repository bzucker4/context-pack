import { App, Modal, Notice, Setting, TFolder } from 'obsidian';
import type ContextPackPlugin from '../main';
import type { PackOptions, PackSource, SavedPack } from '../types';
import { buildPack, copyText, describeResult, errorMessage } from './run';
import type { PackResult } from './run';
import { ItemSuggestModal, NamePromptModal } from './suggest';
import { formatTokenCount } from '../core/tokens';

type Kind = PackSource['kind'];

export class PackModal extends Modal {
	private kind: Kind = 'folder';
	private folderPath = '/';
	private tag = '';
	private notePath: string;
	private includeLinked = true;
	private options: PackOptions;
	private result: PackResult | null = null;

	private sourceEl!: HTMLElement;
	private resultEl!: HTMLElement;
	private copyButton: HTMLButtonElement | null = null;

	constructor(
		app: App,
		private plugin: ContextPackPlugin,
	) {
		super(app);
		this.notePath = app.workspace.getActiveFile()?.path ?? '';
		this.options = { ...plugin.settings.defaultOptions };
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('context-pack-modal');
		this.setTitle('Build context pack');

		new Setting(contentEl)
			.setName('Source')
			.setDesc('Which notes to include.')
			.addDropdown((dd) =>
				dd
					.addOptions({
						folder: 'Folder',
						tag: 'Tag',
						links: 'Note and its links',
					})
					.setValue(this.kind)
					.onChange((value) => {
						this.kind = value as Kind;
						this.invalidate();
						this.renderSource();
					}),
			);
		this.sourceEl = contentEl.createDiv();
		this.renderSource();

		this.renderOptions(contentEl);

		const actions = new Setting(contentEl).addButton((b) =>
			b
				.setButtonText('Build')
				.setCta()
				.onClick(() => void this.build()),
		);
		actions.addButton((b) => {
			b.setButtonText('Copy')
				.setDisabled(true)
				.onClick(() => void this.copy());
			this.copyButton = b.buttonEl;
		});
		actions.addButton((b) =>
			b.setButtonText('Save pack').onClick(() => this.savePack()),
		);

		this.resultEl = contentEl.createDiv({ cls: 'context-pack-result' });
		this.renderResult();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderSource(): void {
		const el = this.sourceEl;
		el.empty();
		if (this.kind === 'folder') {
			new Setting(el).setName('Folder').addButton((b) =>
				b.setButtonText(this.folderPath).onClick(() => {
					const folders = this.app.vault
						.getAllLoadedFiles()
						.filter((f): f is TFolder => f instanceof TFolder)
						.map((f) => (f.isRoot() ? '/' : f.path));
					new ItemSuggestModal(
						this.app,
						folders,
						(p) => p,
						(p) => {
							this.folderPath = p;
							this.invalidate();
							this.renderSource();
						},
						'Choose a folder',
					).open();
				}),
			);
		} else if (this.kind === 'tag') {
			new Setting(el)
				.setName('Tag')
				.setDesc('With or without the leading #.')
				.addText((t) =>
					t
						.setPlaceholder('Project/alpha')
						.setValue(this.tag)
						.onChange((v) => {
							this.tag = v;
							this.invalidate();
						}),
				);
		} else {
			new Setting(el).setName('Note').addButton((b) =>
				b.setButtonText(this.notePath || 'Choose a note').onClick(() => {
					const paths = this.app.vault
						.getMarkdownFiles()
						.map((f) => f.path)
						.sort();
					new ItemSuggestModal(
						this.app,
						paths,
						(p) => p,
						(p) => {
							this.notePath = p;
							this.invalidate();
							this.renderSource();
						},
						'Choose a note',
					).open();
				}),
			);
			new Setting(el)
				.setName('Include linked notes')
				.setDesc('Also include every note this note links to.')
				.addToggle((t) =>
					t.setValue(this.includeLinked).onChange((v) => {
						this.includeLinked = v;
						this.invalidate();
					}),
				);
		}
	}

	private renderOptions(parent: HTMLElement): void {
		new Setting(parent).setName('Options').setHeading();
		new Setting(parent).setName('Format').addDropdown((dd) =>
			dd
				.addOptions({ markdown: 'Markdown', xml: 'XML' })
				.setValue(this.options.format)
				.onChange((v) => {
					this.options.format = v as PackOptions['format'];
					this.invalidate();
				}),
		);
		const toggles: [keyof Omit<PackOptions, 'format'>, string][] = [
			['includeFrontmatter', 'Include frontmatter'],
			['includePaths', 'Include file paths'],
			['stripEmbeds', 'Strip embeds'],
			['stripImages', 'Strip images'],
		];
		for (const [key, name] of toggles) {
			new Setting(parent).setName(name).addToggle((t) =>
				t.setValue(this.options[key]).onChange((v) => {
					this.options[key] = v;
					this.invalidate();
				}),
			);
		}
	}

	private getSource(): PackSource {
		switch (this.kind) {
			case 'folder':
				return { kind: 'folder', path: this.folderPath };
			case 'tag':
				if (this.tag.trim() === '') throw new Error('Enter a tag first.');
				return { kind: 'tag', tag: this.tag.trim() };
			case 'links':
				if (this.notePath === '') throw new Error('Choose a note first.');
				return {
					kind: 'links',
					notePath: this.notePath,
					depth: this.includeLinked ? 1 : 0,
				};
		}
	}

	/** Settings changed, so any earlier result is stale. */
	private invalidate(): void {
		this.result = null;
		if (this.resultEl) this.renderResult();
	}

	private async build(): Promise<void> {
		try {
			const result = await buildPack(this.plugin, this.getSource(), {
				...this.options,
			});
			this.result = result;
			this.renderResult();
		} catch (err) {
			new Notice(errorMessage(err));
		}
	}

	private renderResult(): void {
		const el = this.resultEl;
		el.empty();
		const result = this.result;
		this.copyButton?.toggleAttribute(
			'disabled',
			!result || result.notes.length === 0,
		);
		if (!result) return;
		el.createDiv({
			cls: 'context-pack-summary',
			text: `${describeResult(result)} (estimate)`,
		});
		const list = el.createEl('ul', { cls: 'context-pack-limits' });
		for (const check of result.checks) {
			const li = list.createEl('li', {
				cls: check.fits ? 'is-pass' : 'is-fail',
			});
			li.setText(
				`${check.fits ? 'Pass' : 'Fail'}: ${check.name} (${formatTokenCount(check.tokens)} limit)`,
			);
		}
	}

	private async copy(): Promise<void> {
		if (!this.result || this.result.notes.length === 0) return;
		if (await copyText(this.result.text)) {
			new Notice(`Copied context pack: ${describeResult(this.result)}`);
		}
	}

	private savePack(): void {
		let source: PackSource;
		try {
			source = this.getSource();
		} catch (err) {
			new Notice(errorMessage(err));
			return;
		}
		new NamePromptModal(this.app, 'Save pack', '', (name) => {
			const pack: SavedPack = {
				id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
				name,
				source,
				options: { ...this.options },
			};
			this.plugin.settings.savedPacks.push(pack);
			void this.plugin.saveSettings().then(
				() => new Notice(`Saved pack "${name}"`),
				(err: unknown) => new Notice(errorMessage(err)),
			);
		}).open();
	}
}
