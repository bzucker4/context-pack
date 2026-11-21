// Minimal runtime stand-in for the `obsidian` package (types-only in Node).
export function getAllTags(cache: {
	tags?: { tag: string }[];
	frontmatter?: { tags?: string[] };
}): string[] {
	return [
		...(cache.tags ?? []).map((t) => t.tag),
		...(cache.frontmatter?.tags ?? []).map((t) => '#' + t),
	];
}
