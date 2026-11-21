// Pure module: no Obsidian imports.
import type { ModelLimit } from '../types';

/**
 * Fast token approximation (~4 characters per token, rounded up).
 * This is an estimate, not an exact tokenizer count; real counts vary by model.
 * Runs of whitespace are collapsed first so indentation and blank lines
 * do not inflate the estimate.
 */
export function estimateTokens(text: string): number {
	const normalized = text.replace(/\s+/g, ' ').trim();
	if (normalized === '') return 0;
	return Math.ceil(normalized.length / 4);
}

export function checkLimits(
	tokens: number,
	limits: ModelLimit[],
): { name: string; tokens: number; fits: boolean }[] {
	return limits.map((limit) => ({
		name: limit.name,
		tokens: limit.tokens,
		fits: tokens <= limit.tokens,
	}));
}

function trim1(n: number): string {
	return n.toFixed(1).replace(/\.0$/, '');
}

/** Formats a count like "842", "12.4k" or "1.2M". */
export function formatTokenCount(n: number): string {
	const v = Math.max(0, Math.round(n));
	if (v < 1000) return String(v);
	const k = Math.round(v / 100) / 10; // thousands, one decimal
	if (k < 1000) return `${trim1(k)}k`;
	return `${trim1(v / 1_000_000)}M`;
}
