import { writable } from 'svelte/store';
import type { Map } from 'maplibre-gl';

export const mapInstance = writable<Map | null>(null);