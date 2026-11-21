// Pure module: no Obsidian imports, so it can be unit tested in Node.
import type { PackNote, PackOptions } from '../types';

const IMAGE_EXT = '(?:png|jpe?g|gif|webp|svg)';
const IMAGE_EMBED = new RegExp(
	`!\\[\\[[^\\]\\n]*?\\.${IMAGE_EXT}(?:[|#][^\\]\\n]*)?\\]\\]`,
	'gi',
);
const ANY_EMBED = /!\[\[[^\]\n]*\]\]/g;
const MD_IMAGE = /!\[[^\]\n]*\]\([^)\n]*\)/g;

function cleanBody(body: string, options: PackOptions): string {
	let out = body;
	if (options.stripImages) {
		out = out.replace(MD_IMAGE, '').replace(IMAGE_EMBED, '');
	}
	if (options.stripEmbeds) {
		out = out.replace(ANY_EMBED, '');
	}
	return out.replace(/^(?:[ \t]*\r?\n)+/, '').replace(/\s+$/, '');
}

function collapseBlankLines(text: string): string {
	// 3 or more blank lines become 2.
	return text.replace(/\n(?:[ \t]*\r?\n){3,}/g, '\n\n\n');
}

const PLAIN_YAML = /^[A-Za-z_][\w ./-]*$/;
const YAML_RESERVED = /^(?:true|false|null|yes|no|on|off|~)$/i;

function yamlScalar(value: unknown): string {
	if (value === null || value === undefined) return 'null';
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (typeof value === 'string') {
		if (
			value !== '' &&
			PLAIN_YAML.test(value) &&
			!YAML_RESERVED.test(value) &&
			value === value.trim()
		) {
			return value;
		}
		return JSON.stringify(value);
	}
	return JSON.stringify(value);
}

function yamlLines(value: unknown, indent: string): string[] {
	if (Array.isArray(value)) {
		if (value.length === 0) return [`${indent}[]`];
		const lines: string[] = [];
		for (const item of value) {
			if (item !== null && typeof item === 'object') {
				const inner = yamlLines(item, indent + '  ');
				lines.push(`${indent}-`, ...inner);
			} else {
				lines.push(`${indent}- ${yamlScalar(item)}`);
			}
		}
		return lines;
	}
	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return [`${indent}{}`];
		const lines: string[] = [];
		for (const [key, val] of entries) {
			const k = yamlScalar(key);
			if (val !== null && typeof val === 'object') {
				const empty = Array.isArray(val) ? val.length === 0 : Object.keys(val).length === 0;
				if (empty) {
					lines.push(`${indent}${k}: ${Array.isArray(val) ? '[]' : '{}'}`);
				} else {
					lines.push(`${indent}${k}:`, ...yamlLines(val, indent + '  '));
				}
			} else {
				lines.push(`${indent}${k}: ${yamlScalar(val)}`);
			}
		}
		return lines;
	}
	return [`${indent}${yamlScalar(value)}`];
}

function toYaml(frontmatter: Record<string, unknown>): string {
	return yamlLines(frontmatter, '').join('\n');
}

function escapeAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function cdata(text: string): string {
	return `<![CDATA[${text.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

function formatMarkdown(notes: PackNote[], options: PackOptions): string {
	return notes
		.map((note) => {
			const parts: string[] = [`## ${note.title}`];
			if (options.includePaths) parts.push(`Path: ${note.path}`);
			if (options.includeFrontmatter && note.frontmatter !== null) {
				parts.push('```yaml\n' + toYaml(note.frontmatter) + '\n```');
			}
			const body = cleanBody(note.body, options);
			if (body !== '') parts.push(body);
			return parts.join('\n\n');
		})
		.join('\n\n---\n\n');
}

function formatXml(notes: PackNote[], options: PackOptions): string {
	const noteXml = notes.map((note) => {
		const attrs = [
			...(options.includePaths ? [`path="${escapeAttr(note.path)}"`] : []),
			`title="${escapeAttr(note.title)}"`,
		].join(' ');
		const children: string[] = [];
		if (options.includeFrontmatter && note.frontmatter !== null) {
			children.push(`<frontmatter>${cdata(toYaml(note.frontmatter))}</frontmatter>`);
		}
		children.push(`<body>${cdata(cleanBody(note.body, options))}</body>`);
		return `<note ${attrs}>\n${children.join('\n')}\n</note>`;
	});
	return `<context>\n${noteXml.join('\n')}\n</context>`;
}

export function formatPack(notes: PackNote[], options: PackOptions): string {
	if (notes.length === 0) return '';
	const raw =
		options.format === 'xml'
			? formatXml(notes, options)
			: formatMarkdown(notes, options);
	return collapseBlankLines(raw);
}
