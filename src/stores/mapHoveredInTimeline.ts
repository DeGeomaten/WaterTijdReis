import type { WarpedMap } from '@allmaps/render';
import { writable } from 'svelte/store';

export const mapHoveredInTimeline = writable<WarpedMap | null>(null);