import { Notice } from 'obsidian';
import { collectNotes } from '../core/selection';
import { formatPack } from '../core/formatter';
import { checkLimits, estimateTokens, formatTokenCount } from '../core/tokens';
import type ContextPackPlugin from '../main';
import type { PackNote, PackOptions, PackSource } from '../types';

export interface PackResult {
	notes: PackNote[];
	text: string;
	tokens: number;
	checks: { name: string; tokens: number; fits: boolean }[];
}

export async function buildPack(
	plugin: ContextPackPlugin,
	source: PackSource,
	options: PackOptions,
): Promise<PackResult> {
	const notes = await collectNotes(plugin.app, source);
	const text = formatPack(notes, options);
	const tokens = estimateTokens(text);
	return {
		notes,
		text,
		tokens,
		checks: checkLimits(tokens, plugin.settings.modelLimits),
	};
}

export function describeResult(result: PackResult): string {
	const n = result.notes.length;
	return `${n} ${n === 1 ? 'note' : 'notes'}, ~${formatTokenCount(result.tokens)} tokens`;
}

export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (err) {
		new Notice(`Could not copy to clipboard: ${errorMessage(err)}`);
		return false;
	}
}

/** Build a pack and copy it straight to the clipboard, reporting via Notices. */
export async function buildAndCopy(
	plugin: ContextPackPlugin,
	source: PackSource,
	options: PackOptions,
): Promise<void> {
	try {
		const result = await buildPack(plugin, source, options);
		if (result.notes.length === 0) {
			new Notice('No notes matched this source.');
			return;
		}
		if (await copyText(result.text)) {
			new Notice(`Copied context pack: ${describeResult(result)}`);
		}
	} catch (err) {
		new Notice(errorMessage(err));
	}
}
