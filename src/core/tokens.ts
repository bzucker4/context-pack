import type { ModelLimit } from '../types';

export function estimateTokens(_text: string): number {
	throw new Error('not implemented');
}

export function checkLimits(
	_tokens: number,
	_limits: ModelLimit[],
): { name: string; tokens: number; fits: boolean }[] {
	throw new Error('not implemented');
}
