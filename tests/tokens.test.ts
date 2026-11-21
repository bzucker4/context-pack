import { describe, expect, it } from 'vitest';
import { checkLimits, estimateTokens, formatTokenCount } from '../src/core/tokens';

describe('estimateTokens', () => {
	it('returns 0 for empty or whitespace-only text', () => {
		expect(estimateTokens('')).toBe(0);
		expect(estimateTokens(' \n\t  ')).toBe(0);
	});
	it('is ceil(chars / 4)', () => {
		expect(estimateTokens('abcd')).toBe(1);
		expect(estimateTokens('abcde')).toBe(2);
		expect(estimateTokens('a'.repeat(400))).toBe(100);
	});
	it('does not inflate on long whitespace runs', () => {
		expect(estimateTokens('abcd' + ' '.repeat(1000) + 'efgh')).toBe(estimateTokens('abcd efgh'));
		expect(estimateTokens('a\n\n\n\n\n\nb')).toBe(estimateTokens('a b'));
	});
});

describe('checkLimits', () => {
	const limits = [
		{ name: 'small', tokens: 100 },
		{ name: 'big', tokens: 1000 },
	];
	it('preserves order and computes fits', () => {
		expect(checkLimits(500, limits)).toEqual([
			{ name: 'small', tokens: 100, fits: false },
			{ name: 'big', tokens: 1000, fits: true },
		]);
	});
	it('treats equal as fitting', () => {
		expect(checkLimits(100, limits)[0]!.fits).toBe(true);
	});
	it('handles empty limits', () => {
		expect(checkLimits(5, [])).toEqual([]);
	});
});

describe('formatTokenCount', () => {
	it.each([
		[0, '0'],
		[842, '842'],
		[999, '999'],
		[1000, '1k'],
		[12400, '12.4k'],
		[12449, '12.4k'],
		[999_949, '999.9k'],
		[999_950, '1M'],
		[1_200_000, '1.2M'],
		[15_000_000, '15M'],
	])('%d -> %s', (n, expected) => {
		expect(formatTokenCount(n)).toBe(expected);
	});
});
