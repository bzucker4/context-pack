import { App, FuzzySuggestModal, Modal, Setting } from 'obsidian';

/** Generic fuzzy picker over an in-memory list. */
export class ItemSuggestModal<T> extends FuzzySuggestModal<T> {
	constructor(
		app: App,
		private items: T[],
		private toText: (item: T) => string,
		private onChoose: (item: T) => void,
		placeholder: string,
	) {
		super(app);
		this.setPlaceholder(placeholder);
	}

	getItems(): T[] {
		return this.items;
	}

	getItemText(item: T): string {
		return this.toText(item);
	}

	onChooseItem(item: T): void {
		this.onChoose(item);
	}
}

/** Small modal that asks for a single line of text. */
export class NamePromptModal extends Modal {
	private value: string;

	constructor(
		app: App,
		private title: string,
		initial: string,
		private onSubmit: (value: string) => void,
	) {
		super(app);
		this.value = initial;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle(this.title);
		const submit = () => {
			const name = this.value.trim();
			if (name === '') return;
			this.close();
			this.onSubmit(name);
		};
		new Setting(contentEl).setName('Name').addText((text) => {
			text.setValue(this.value).onChange((v) => (this.value = v));
			text.inputEl.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					submit();
				}
			});
			window.setTimeout(() => text.inputEl.focus(), 0);
		});
		new Setting(contentEl).addButton((b) =>
			b.setButtonText('Save').setCta().onClick(submit),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
