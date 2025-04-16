import { writable } from "svelte/store";
import { WarpedMapLayer } from "@allmaps/maplibre";

export const warpedMapLayers: Record<number, WarpedMapLayer> = {
    1: new WarpedMapLayer("warped-map-1"),
    2: new WarpedMapLayer("warped-map-2"),
    3: new WarpedMapLayer("warped-map-3"),
    4: new WarpedMapLayer("warped-map-4"),
    5: new WarpedMapLayer("warped-map-5"),
};