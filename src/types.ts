export type PackSource =
	| { kind: 'folder'; path: string }
	| { kind: 'tag'; tag: string }
	| { kind: 'links'; notePath: string; depth: 0 | 1 };

export type PackOptions = {
	format: 'markdown' | 'xml';
	includeFrontmatter: boolean;
	includePaths: boolean;
	stripEmbeds: boolean;
	stripImages: boolean;
};

export type PackNote = {
	path: string;
	title: string;
	frontmatter: Record<string, unknown> | null;
	body: string;
};

export type SavedPack = {
	id: string;
	name: string;
	source: PackSource;
	options: PackOptions;
};

export type ModelLimit = { name: string; tokens: number };

export type ContextPackSettings = {
	defaultOptions: PackOptions;
	savedPacks: SavedPack[];
	modelLimits: ModelLimit[];
};

export const DEFAULT_SETTINGS: ContextPackSettings = {
	defaultOptions: {
		format: 'markdown',
		includeFrontmatter: false,
		includePaths: true,
		stripEmbeds: true,
		stripImages: true,
	},
	savedPacks: [],
	modelLimits: [
		{ name: 'Model A (edit me)', tokens: 128000 },
		{ name: 'Model B (edit me)', tokens: 200000 },
	],
};
