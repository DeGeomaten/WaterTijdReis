import { writable } from "svelte/store";

export let mapsInViewport = writable<WarpedMap[]>([]);