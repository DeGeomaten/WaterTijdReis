import type { Map as MaplibreMap } from "maplibre-gl";
import type { MapContext } from "./mapContext.svelte";

export function addBackgroundLayers(map: MaplibreMap) {
	map.addSource("dsm-05", {
		type: "raster",
		tiles: [
			"https://service.pdok.nl/rws/ahn/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image/png&STYLES=&TRANSPARENT=TRUE&LAYERS=dsm_05m&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}",
		],
		tileSize: 256,
	});
	map.addLayer({
		id: "dsm-05-layer",
		type: "raster",
		source: "dsm-05",
		layout: { visibility: "none" },
	});

	map.addSource("satelliet", {
		type: "raster",
		tiles: [
			"https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?service=WMS&version=1.1.1&request=GetMap&layers=Actueel_ortho25&styles=&format=image/jpeg&transparent=true&height=256&width=256&srs=EPSG:3857&bbox={bbox-epsg-3857}",
		],
		tileSize: 256,
		scheme: "tms",
		minzoom: 6,
		maxzoom: 20,
		attribution: "PDOK",
	});
	map.addLayer({
		id: "satelliet-layer",
		type: "raster",
		source: "satelliet",
		layout: { visibility: "none" },
	});
}

export function addWaterschapsgrenzenLayer(map: MaplibreMap) {
	if (map.getSource("pdok-waterschapsgrenzen")) return;

	map.addSource("pdok-waterschapsgrenzen", {
		type: "raster",
		tiles: [
			"https://service.pdok.nl/hwh/waterschappen-waterschapsgrenzen-imso/wms/v2_0?" +
				"SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0" +
				"&LAYERS=waterschap" +
				"&STYLES=" +
				"&FORMAT=image/png" +
				"&TRANSPARENT=true" +
				"&CRS=EPSG:3857" +
				"&WIDTH=256&HEIGHT=256" +
				"&BBOX={bbox-epsg-3857}",
		],
		tileSize: 256,
	});
	map.addLayer({
		id: "overlay-waterschapsgrenzen",
		type: "raster",
		source: "pdok-waterschapsgrenzen",
		layout: { visibility: "visible" },
	});
}

export function addGemeentegrenzenLayer(map: MaplibreMap) {
	if (map.getSource("pdok-gemeentegrenzen")) return;

	map.addSource("pdok-gemeentegrenzen", {
		type: "raster",
		tiles: [
			"https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0?" +
				"SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0" +
				"&LAYERS=Gemeentegebied" +
				"&STYLES=" +
				"&FORMAT=image/png" +
				"&TRANSPARENT=true" +
				"&CRS=EPSG:3857" +
				"&WIDTH=256&HEIGHT=256" +
				"&BBOX={bbox-epsg-3857}",
		],
		tileSize: 256,
	});
	map.addLayer({
		id: "overlay-gemeentegrenzen",
		type: "raster",
		source: "pdok-gemeentegrenzen",
		layout: { visibility: "visible" },
	});
}

export function addUserLocationCircle(map: MaplibreMap) {
	map.addSource("user-location", {
		type: "geojson",
		data: {
			type: "FeatureCollection",
			features: [],
		},
	});

	map.addLayer({
		id: "user-location",
		type: "circle",
		source: "user-location",
		paint: {
			"circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 22, 20],
			"circle-color": "#f4a",
			"circle-opacity": 0,
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 0, 0, 22, 6],
			"circle-stroke-opacity": 0,

			"circle-opacity-transition": { duration: 400 },
			"circle-radius-transition": { duration: 400 },
			"circle-stroke-width-transition": { duration: 700 },
			"circle-stroke-opacity-transition": { duration: 400 },
		},
	});
}

export function addOutlineLayers(mapContext: MapContext) {
	const map = mapContext.map;
	if (!map) return;

	const labelZoomValues = [5, 6, 6, 9, 7, 12, 8, 15, 9, 17, 10, 18, 12, 22, 14, 26, 15, 28, 20, 28];

	map.addLayer({
		id: "map-outlines-labels",
		type: "symbol",
		source: "map-labels",
		layout: {
			"text-font": ["literal", ["Metropolis Bold"]],
			"text-field": ["to-string", ["get", "year"]],
			"text-size": ["interpolate", ["exponential", 1.2], ["zoom"], ...labelZoomValues],
			"text-allow-overlap": true,
		},
		paint: {
			"text-color": "#65e",
			"text-halo-color": "#eeeeff",
			"text-halo-width": 1,
			"text-opacity": 0,
		},
	});

	map.addLayer({
		id: "map-outlines-numbers",
		type: "symbol",
		source: "map-labels",
		layout: {
			"text-font": ["literal", ["Metropolis Bold"]],
			"text-field": ["to-string", ["get", "num"]],
			"text-size": ["interpolate", ["exponential", 1.2], ["zoom"], ...labelZoomValues],
			"text-allow-overlap": true,
		},
		paint: {
			"text-color": "#65e",
			"text-halo-color": "#eeeeff",
			"text-halo-width": 1,
			"text-opacity-transition": { duration: 1000 },
			"text-opacity": 0,
		},
	});

	map.addLayer({
		id: "map-outlines-fill",
		type: "fill",
		source: "map-outlines",
		paint: {
			"fill-color": "#f4a",
			"fill-opacity": ["coalesce", ["feature-state", "animated-fill-opacity"], 0],
		},
	});

	map.addLayer({
		id: "map-outlines-stroke",
		type: "line",
		source: "map-outlines",
		paint: {
			"line-color": "#f4a",
			"line-width": 1,
			"line-opacity": ["coalesce", ["feature-state", "animated-stroke-opacity"], 0],
		},
	});
}
