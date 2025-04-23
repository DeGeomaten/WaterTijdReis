import type { WarpedMap } from '@allmaps/render';
import { writable } from 'svelte/store';

export const timelineHorizontal = writable(false);
export const timelineSize = writable(160);
export const mapHoveredInTimeline = writable<WarpedMap | null>(null);
export const mapClickedInTimeline = writable<WarpedMap | null>(null);
export const mapHoveredInTimelineX = writable<number | null>(null);
export const mapHoveredInTimelineY = writable<number | null>(null);