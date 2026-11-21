import { getAllTags } from 'obsidian';
import type { App, CachedMetadata, TFile } from 'obsidian';
import type { PackNote, PackSource } from '../types';

function isMarkdownFile(f: unknown): f is TFile {
	return (
		typeof f === 'object' &&
		f !== null &&
		(f as { extension?: unknown }).extension === 'md' &&
		typeof (f as { path?: unknown }).path === 'string'
	);
}

function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#/, '').toLowerCase();
}

function normalizeFolder(path: string): string {
	const trimmed = path.trim().replace(/\/+$/, '');
	return trimmed === '' ? '/' : trimmed;
}

function filesInFolder(app: App, folderPath: string): TFile[] {
	const normalized = normalizeFolder(folderPath);
	if (normalized !== '/') {
		const folder = app.vault.getAbstractFileByPath(normalized);
		if (!folder || !('children' in folder)) {
			throw new Error(`Folder not found: "${folderPath}"`);
		}
	}
	const prefix = normalized === '/' ? '' : normalized + '/';
	return app.vault
		.getMarkdownFiles()
		.filter((f) => f.path.startsWith(prefix));
}

function filesWithTag(app: App, tag: string): TFile[] {
	const wanted = normalizeTag(tag);
	if (wanted === '') {
		throw new Error('Tag is empty');
	}
	return app.vault.getMarkdownFiles().filter((f) => {
		const cache = app.metadataCache.getFileCache(f);
		if (!cache) return false;
		const tags = getAllTags(cache) ?? [];
		return tags.some((t) => normalizeTag(t) === wanted);
	});
}

function filesFromLinks(
	app: App,
	notePath: string,
	depth: 0 | 1,
): TFile[] {
	const root = app.vault.getAbstractFileByPath(notePath);
	if (!isMarkdownFile(root)) {
		throw new Error(`Note not found: "${notePath}"`);
	}
	const byPath = new Map<string, TFile>([[root.path, root]]);
	if (depth === 1) {
		const targets = app.metadataCache.resolvedLinks[root.path] ?? {};
		for (const target of Object.keys(targets)) {
			const file = app.vault.getAbstractFileByPath(target);
			if (isMarkdownFile(file)) byPath.set(file.path, file);
		}
	}
	return [...byPath.values()];
}

function stripFrontmatter(content: string, cache: CachedMetadata | null): string {
	const end = cache?.frontmatterPosition?.end.offset;
	if (end !== undefined) {
		return content.slice(end).replace(/^\r?\n/, '');
	}
	const match = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(content);
	return match ? content.slice(match[0].length) : content;
}

function frontmatterOf(cache: CachedMetadata | null): Record<string, unknown> | null {
	if (!cache?.frontmatter) return null;
	const { position: _position, ...rest } = cache.frontmatter as Record<
		string,
		unknown
	>;
	return rest;
}

export async function collectNotes(
	app: App,
	source: PackSource,
): Promise<PackNote[]> {
	let files: TFile[];
	switch (source.kind) {
		case 'folder':
			files = filesInFolder(app, source.path);
			break;
		case 'tag':
			files = filesWithTag(app, source.tag);
			break;
		case 'links':
			files = filesFromLinks(app, source.notePath, source.depth);
			break;
	}

	const sorted = [...files].sort((a, b) =>
		a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
	);
	return Promise.all(
		sorted.map(async (file): Promise<PackNote> => {
			const cache = app.metadataCache.getFileCache(file);
			const content = await app.vault.cachedRead(file);
			return {
				path: file.path,
				title: file.basename,
				frontmatter: frontmatterOf(cache),
				body: stripFrontmatter(content, cache),
			};
		}),
	);
}
