import type { App } from 'obsidian';
import type { PackNote, PackSource } from '../types';

export function collectNotes(_app: App, _source: PackSource): Promise<PackNote[]> {
	throw new Error('not implemented');
}
