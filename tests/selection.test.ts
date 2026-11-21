import { describe, expect, it } from 'vitest';

import { collectNotes } from '../src/core/selection';

type Spec = {
	content: string;
	cache?: Record<string, unknown>;
};

function makeApp(files: Record<string, Spec>, resolved: Record<string, Record<string, number>> = {}) {
	const tfiles = Object.keys(files).map((path) => ({
		path,
		extension: 'md',
		basename: path.split('/').pop()!.replace(/\.md$/, ''),
	}));
	const folders = new Set<string>();
	for (const p of Object.keys(files)) {
		const parts = p.split('/');
		for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join('/'));
	}
	return {
		vault: {
			getMarkdownFiles: () => tfiles,
			getAbstractFileByPath: (p: string) =>
				tfiles.find((f) => f.path === p) ??
				(folders.has(p) ? { path: p, children: [] } : p === 'img.png' ? { path: p, extension: 'png' } : null),
			cachedRead: async (f: { path: string }) => files[f.path]!.content,
		},
		metadataCache: {
			getFileCache: (f: { path: string }) => files[f.path]!.cache ?? null,
			resolvedLinks: resolved,
		},
	} as never;
}

const fm = (end: number) => ({
	frontmatter: { tags: ['alpha'], position: {} },
	frontmatterPosition: { end: { offset: end } },
});
const FM = '---\ntags: [alpha]\n---';

describe('collectNotes', () => {
	const app = makeApp(
		{
			'b/two.md': { content: 'two' },
			'a/one.md': { content: `${FM}\nbody one`, cache: fm(FM.length) },
			'a/sub/three.md': { content: 'three', cache: { tags: [{ tag: '#Beta' }] } },
			'root.md': { content: 'root' },
		},
		{ 'root.md': { 'a/one.md': 2, 'b/two.md': 1, 'missing.md': 1, 'img.png': 1 } },
	);

	it('folder is recursive and sorted', async () => {
		const notes = await collectNotes(app, { kind: 'folder', path: 'a' });
		expect(notes.map((n) => n.path)).toEqual(['a/one.md', 'a/sub/three.md']);
	});

	it('strips frontmatter and returns it without position', async () => {
		const [n] = await collectNotes(app, { kind: 'folder', path: 'a/' });
		expect(n!.body).toBe('body one');
		expect(n!.frontmatter).toEqual({ tags: ['alpha'] });
		expect(n!.title).toBe('one');
	});

	it('null frontmatter when absent', async () => {
		const [n] = await collectNotes(app, { kind: 'folder', path: 'b' });
		expect(n!.frontmatter).toBeNull();
	});

	it('tag matches frontmatter and inline, case-insensitive, with or without #', async () => {
		expect((await collectNotes(app, { kind: 'tag', tag: 'ALPHA' })).map((n) => n.path)).toEqual(['a/one.md']);
		expect((await collectNotes(app, { kind: 'tag', tag: '#beta' })).map((n) => n.path)).toEqual(['a/sub/three.md']);
	});

	it('links depth 0 and 1, skipping unresolved/non-markdown', async () => {
		expect((await collectNotes(app, { kind: 'links', notePath: 'root.md', depth: 0 })).map((n) => n.path)).toEqual(['root.md']);
		expect((await collectNotes(app, { kind: 'links', notePath: 'root.md', depth: 1 })).map((n) => n.path)).toEqual([
			'a/one.md',
			'b/two.md',
			'root.md',
		]);
	});

	it('throws for missing folder or note', async () => {
		await expect(collectNotes(app, { kind: 'folder', path: 'nope' })).rejects.toThrow(/Folder not found/);
		await expect(collectNotes(app, { kind: 'links', notePath: 'nope.md', depth: 1 })).rejects.toThrow(/Note not found/);
	});
});
