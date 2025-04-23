import type { WarpedMap } from '@allmaps/render';
import { writable } from 'svelte/store';

export const mapHoveredInTimeline = writable<WarpedMap | null>(null);
export const mapHoveredInTimelineX = writable<number | null>(null);
export const mapHoveredInTimelineY = writable<number | null>(null);