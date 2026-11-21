import { describe, expect, it } from 'vitest';
import { formatPack } from '../src/core/formatter';
import type { PackNote, PackOptions } from '../src/types';

const base: PackOptions = {
	format: 'markdown',
	includeFrontmatter: false,
	includePaths: false,
	stripEmbeds: false,
	stripImages: false,
};
const note = (over: Partial<PackNote> = {}): PackNote => ({
	path: 'a/One.md',
	title: 'One',
	frontmatter: null,
	body: 'hello',
	...over,
});

describe('markdown', () => {
	it('returns empty string for no notes', () => {
		expect(formatPack([], base)).toBe('');
		expect(formatPack([], { ...base, format: 'xml' })).toBe('');
	});

	it('renders heading and body, separated by ---', () => {
		const out = formatPack([note(), note({ title: 'Two', body: 'bye' })], base);
		expect(out).toBe('## One\n\nhello\n\n---\n\n## Two\n\nbye');
	});

	it('includes path and frontmatter when enabled', () => {
		const out = formatPack(
			[note({ frontmatter: { tags: ['x', 'y'], n: 2, title: 'A: b' } })],
			{ ...base, includePaths: true, includeFrontmatter: true },
		);
		expect(out).toBe(
			'## One\n\nPath: a/One.md\n\n```yaml\ntags:\n  - x\n  - y\nn: 2\ntitle: "A: b"\n```\n\nhello',
		);
	});

	it('omits frontmatter block when frontmatter is null', () => {
		const out = formatPack([note()], { ...base, includeFrontmatter: true });
		expect(out).not.toContain('```yaml');
	});

	it('collapses 3+ blank lines into 2', () => {
		const out = formatPack([note({ body: 'a\n\n\n\n\nb' })], base);
		expect(out).toContain('a\n\n\nb');
		expect(out).not.toContain('\n\n\n\n');
	});
});

describe('strip options', () => {
	const body = 'A ![[Other note]] B ![[pic.PNG|200]] C ![alt](http://x/y.png) D';
	it('stripEmbeds removes all ![[...]] embeds', () => {
		const out = formatPack([note({ body })], { ...base, stripEmbeds: true });
		expect(out).toContain('A  B  C ![alt](http://x/y.png) D');
	});
	it('stripImages removes md images and image embeds only', () => {
		const out = formatPack([note({ body })], { ...base, stripImages: true });
		expect(out).toContain('A ![[Other note]] B  C  D');
	});
	it('leaves wikilinks alone', () => {
		const out = formatPack([note({ body: 'see [[X]]' })], { ...base, stripEmbeds: true, stripImages: true });
		expect(out).toContain('see [[X]]');
	});
});

describe('xml', () => {
	const xml: PackOptions = { ...base, format: 'xml', includePaths: true };
	it('wraps notes in <context> with body in CDATA (unescaped)', () => {
		const out = formatPack([note({ body: 'a < b & c' })], xml);
		expect(out).toBe(
			'<context>\n<note path="a/One.md" title="One">\n<body><![CDATA[a < b & c]]></body>\n</note>\n</context>',
		);
	});
	it('escapes attribute values', () => {
		const out = formatPack([note({ path: 'a&b/<x>.md', title: 'He said "hi" & \'bye\'' })], xml);
		expect(out).toContain('path="a&amp;b/&lt;x&gt;.md"');
		expect(out).toContain('title="He said &quot;hi&quot; &amp; &apos;bye&apos;"');
	});
	it('includes frontmatter child when enabled', () => {
		const out = formatPack([note({ frontmatter: { a: 1 } })], { ...xml, includeFrontmatter: true });
		expect(out).toContain('<frontmatter><![CDATA[a: 1]]></frontmatter>');
	});
	it('splits ]]> inside the body', () => {
		const out = formatPack([note({ body: 'x ]]> y' })], xml);
		expect(out).toContain('<![CDATA[x ]]]]><![CDATA[> y]]>');
		expect(out).not.toMatch(/\]\]>[^<]/);
	});
	it('applies strip options to the body', () => {
		const out = formatPack([note({ body: 'a ![[n]] ![i](u)' })], { ...xml, stripEmbeds: true, stripImages: true });
		expect(out).toContain('<![CDATA[a]]>');
	});
});
