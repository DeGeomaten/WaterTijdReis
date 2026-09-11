import type { Filter, HistoricMap } from "$lib/types/historicmap";
import type { MapContext } from "./mapContext.svelte";
import { WarpedMapLayer } from "@allmaps/maplibre";
import { addOutlineLayers } from "./mapLayers.svelte";
import * as turf from "@turf/turf";
import type { MapLayerMouseEvent, GeoJSONSource } from "maplibre-gl";
import type { MapView } from "$lib/types/map";
import { HistoricMapSeries } from "./HistoricMapSeries.svelte";

const WATERSTAATSKAARTEN_URL = "maps-sorted-by-edition.json";
const WATERSTAATSKAARTEN_SPRITE_JSON = "/sprites/regular-sheets-128.json";
const WATERSTAATSKAARTEN_SPRITE_IMG = "/sprites/regular-sheets-128.jpg";

export class HistoricMapsContext {
	mapContext: MapContext;
	warpedMapLayer: WarpedMapLayer = new WarpedMapLayer();

	series = $state<HistoricMapSeries[]>([]);

	// -------------------------------------------------------------
	// For backwards compatibility: HistoricMapsContext supports series, the UI does not (yet), as 'waterstaatskaarten' is now the only series:
	// here, filter is a reference to the 'waterstaatskaarten'-series filter, and mapsById, visibleMaps, and mapsByNumber are aggregated across 'all' series.
	// -------------------------------------------------------------
	get filter(): Filter {
		return (
			this.series[0]?.filter ?? {
				yearStart: 1865,
				yearEnd: 1983,
				edition: "All",
				bis: false,
				type: undefined,
			}
		);
	}

	get mapsLoaded(): boolean {
		return this.series.length > 0 && this.series.every((s) => s.mapsLoaded);
	}

	mapsById: Map<string, HistoricMap> = $derived.by(() => {
		const aggregated = new Map<string, HistoricMap>();
		for (const s of this.series) {
			for (const [id, map] of s.mapsById) {
				aggregated.set(id, map);
			}
		}
		return aggregated;
	});

	visibleMaps: Map<string, HistoricMap> = $derived.by(() => {
		const aggregated = new Map<string, HistoricMap>();
		for (const s of this.series) {
			for (const [id, map] of s.visibleMaps) {
				aggregated.set(id, map);
			}
		}
		return aggregated;
	});

	mapsByNumber: Map<number, HistoricMap[]> = $derived.by(() => {
		const grouped = new Map<number, HistoricMap[]>();
		for (const sheet of this.mapsById.values()) {
			const list = grouped.get(sheet.number) ?? [];
			list.unshift(sheet);
			grouped.set(sheet.number, list);
		}
		return grouped;
	});

	#mapIdsInViewport = $state<string[]>([]);

	mapsInViewport = $derived.by(() => {
		const maps = new Map<string, HistoricMap>();
		for (const id of this.#mapIdsInViewport) {
			const mapData = this.mapsById.get(id);
			if (mapData) maps.set(id, mapData);
		}
		return maps;
	});

	visibleMapsInViewport = $derived.by(() => {
		const maps = new Map<string, HistoricMap>();
		for (const id of this.#mapIdsInViewport) {
			if (this.visibleMaps.has(id)) {
				const mapData = this.mapsById.get(id);
				if (mapData) maps.set(id, mapData);
			}
		}
		return maps;
	});

	// Selected (by double clicking / clicking a thumbnail / etc.) and pinned maps,
	// this works by having a single 'source-of-truth', the HistoricMap IDs; selectedMap/pinnedMap is derived from this ID and setHistoricMapView is called by the $effect in the constructor
	selectedMapId: string | null = $state(null);
	pinnedMapId: string | null = $state(null);

	selectedMap: HistoricMap | null = $derived(
		this.selectedMapId ? (this.mapsById.get(this.selectedMapId) ?? null) : null
	);
	pinnedMap: HistoricMap | null = $derived(this.pinnedMapId ? (this.mapsById.get(this.pinnedMapId) ?? null) : null);
	pinnedMapView: MapView | null = $state(null);

	hoveredHistoricMap = $state<HistoricMap | null>(null);
	clickedHistoricMap = $state<HistoricMap | null>(null);

	#hoveredFeatureId = $state<number | null>(null);
	#clickedFeatureId = $state<number | null>(null);

	// Grid & ripple-effects
	gridVisible = $state(false);
	#gridResetTimer: ReturnType<typeof setTimeout> | null = null;
	#gridVisibilityTimer: ReturnType<typeof setTimeout> | null = null;
	#rippleResetTimer: ReturnType<typeof setTimeout> | null = null;
	#featureTimeouts: Record<number | string, ReturnType<typeof setTimeout>> = {};
	#clickedMapTimeout: ReturnType<typeof setTimeout> | null = null;
	#fillTimers = new Map<number, ReturnType<typeof setTimeout>>();

	constructor(mapContext: MapContext) {
		this.mapContext = mapContext;

		$effect(() => {
			if (!this.mapsLoaded) return;

			if (this.selectedMap) {
				const view = this.selectedMapId === this.pinnedMapId ? this.pinnedMapView : null;
				this.setHistoricMapView(this.selectedMap, view);
			} else {
				this.mapContext.restoreView();
			}
		});
	}

	async init() {
		this.mapContext.map?.addLayer(this.warpedMapLayer);
		this.warpedMapLayer.setLayerOptions({ visible: false });
		this.warpedMapLayer.getWarpedMapList().options.animatedOptions.push("opacity");

		const defaultSeries = new HistoricMapSeries(
			this,
			"wsk",
			"Waterstaatkaarten",
			WATERSTAATSKAARTEN_URL,
			WATERSTAATSKAARTEN_SPRITE_JSON,
			WATERSTAATSKAARTEN_SPRITE_IMG
		);
		this.series.push(defaultSeries);

		this.#initOutlineSources();

		this.mapContext.map?.on("maptilesloadedfromsprites", () => {
			this.series.forEach((s) => s.applyFilter());
		});

		await Promise.all(this.series.map((s) => s.load()));

		this.mapContext.activeMap.on("click", "map-outlines-fill", (e) => this.handleMapClick(e));
		this.mapContext.activeMap.on("mousemove", "map-outlines-fill", (e) => this.handleMapMouseMove(e));
		this.mapContext.activeMap.on("mouseleave", "map-outlines-fill", () => this.handleMapMouseLeave());
		this.mapContext.activeMap.on("moveend", () => this.updateViewportMaps());

		this.updateViewportMaps();

		await this.warpedMapLayer.renderer?.tileCache.allRequestedTilesLoaded();
	}

	#initOutlineSources() {
		const emptyFeatureCollection = { type: "FeatureCollection", features: [] };
		this.mapContext.map?.addSource("map-outlines", { type: "geojson", data: emptyFeatureCollection });
		this.mapContext.map?.addSource("map-labels", { type: "geojson", data: emptyFeatureCollection });
		addOutlineLayers(this.mapContext);
	}

	applyFilter(filter: Filter = this.filter) {
		this.series.forEach((s) => s.applyFilter(filter));
	}

	setHistoricMapView(historicMap: HistoricMap, view?: MapView | null) {
		if (!this.mapsLoaded) return;

		this.#clickedFeatureId = null;
		this.setSheetIndexVisibility(false);

		this.#isolateHistoricMapLayer(historicMap.id);
		this.mapContext.saveMapView();
		this.#zoomToHistoricMap(historicMap, view);
	}

	#isolateHistoricMapLayer(selectedId: string) {
		this.mapContext.savedLayerVisibility = {};
		const layers = this.mapContext.activeMap.getStyle().layers;

		for (const layer of layers) {
			if (!layer.id.includes("warped-map-layer-")) {
				const visibility = this.mapContext.activeMap.getLayoutProperty(layer.id, "visibility") as "visible" | "none";
				this.mapContext.savedLayerVisibility[layer.id] = visibility || "visible";

				if (visibility !== "none") {
					this.mapContext.activeMap.setLayoutProperty(layer.id, "visibility", "none");
				}
			}
		}

		this.warpedMapLayer.setLayerOptions({ opacity: 1 });
		const mapsToHide = Array.from(this.visibleMaps.keys()).filter((id) => id !== selectedId);

		this.warpedMapLayer.setMapsOptions(mapsToHide, { visible: false });
		this.warpedMapLayer.setMapOptions(selectedId, {
			visible: true,
			transformationType: "straight",
			saturation: 1,
			opacity: 1,
			applyMask: false,
		});
	}

	#zoomToHistoricMap(historicMap: HistoricMap, view?: MapView | null) {
		if (view) {
			this.mapContext.activeMap.easeTo(view);
			return;
		}

		const bbox = this.warpedMapLayer.getMapsBbox([historicMap.id], {
			projection: { definition: "EPSG:4326" },
		});

		if (bbox) {
			const [minX, minY, maxX, maxY] = bbox;
			this.mapContext.activeMap.fitBounds(
				[
					[minX, minY],
					[maxX, maxY],
				],
				{ padding: 88, speed: 2, curve: 1.8, essential: true }
			);
		}
	}

	changeHistoricMapView(historicMap: HistoricMap) {
		if (!this.mapsLoaded) return;

		const optionsByMapId = new Map();

		if (this.selectedMapId) {
			optionsByMapId.set(this.selectedMapId, {
				visible: false,
				transformationType: "thinPlateSpline",
				applyMask: true,
			});
		}

		optionsByMapId.set(historicMap.id, {
			visible: true,
			transformationType: "straight",
			saturation: 1,
			applyMask: false,
		});

		this.warpedMapLayer.setMapsOptionsByMapId(optionsByMapId, undefined, { animate: false });

		const bbox = this.warpedMapLayer.getMapsBbox([historicMap.id], {
			projection: { definition: "EPSG:4326" },
		});

		if (bbox) {
			const [minX, minY, maxX, maxY] = bbox;
			this.mapContext.activeMap.fitBounds(
				[
					[minX, minY],
					[maxX, maxY],
				],
				{ padding: 50, animate: false }
			);
		}

		this.selectedMapId = historicMap.id;
	}

	updateViewportMaps() {
		const reference = this.warpedMapLayer.renderer?.mapsInViewport;
		if (reference) {
			this.#mapIdsInViewport = Array.from(reference);
		}
	}

	updateMapOutlines() {
		const map = this.mapContext.activeMap;
		const mapsArray = Array.from(this.visibleMaps.values());

		const polygons = mapsArray.map((historicMap, index) => ({
			type: "Feature" as const,
			id: index,
			geometry: historicMap.polygon,
			properties: {
				id: historicMap.id,
			},
		}));

		const points = mapsArray.map((historicMap, index) => ({
			type: "Feature" as const,
			id: index,
			geometry: turf.centerOfMass(historicMap.polygon).geometry,
			properties: {
				year: historicMap.yearEnd,
				num: `${historicMap.number}.${historicMap.position}`,
			},
		}));

		const outlinesSource = map.getSource("map-outlines") as GeoJSONSource | undefined;
		outlinesSource?.setData({ type: "FeatureCollection", features: polygons });

		const labelsSource = map.getSource("map-labels") as GeoJSONSource | undefined;
		labelsSource?.setData({ type: "FeatureCollection", features: points });
	}

	handleMapClick(e: MapLayerMouseEvent) {
		const clickedLngLat = e.lngLat;
		const feature = e.features?.[0];
		if (!feature) return;

		const mapId = feature.properties?.id;
		const historicMap = this.mapsById.get(mapId) || null;

		if (this.#shouldOpenImmediately(historicMap)) {
			this.selectedMapId = historicMap?.id ?? null;
			return;
		}

		this.setGridVisibility(true, clickedLngLat);

		if (this.#rippleResetTimer) clearTimeout(this.#rippleResetTimer);
		this.#rippleResetTimer = setTimeout(() => {
			this.setGridVisibility(false, clickedLngLat);
		}, 1500);

		this.#handleMapSelection(historicMap, Number(feature.id));
		this.#triggerFillFlashAnimation(Number(feature.id));
	}

	handleMapMouseMove(e: MapLayerMouseEvent) {
		const feature = e.features?.[0];
		if (!feature) return;

		if (this.#hoveredFeatureId !== null && this.#hoveredFeatureId !== feature.id) {
			this.mapContext.activeMap.setFeatureState(
				{ source: "map-outlines", id: this.#hoveredFeatureId },
				{ hover: false }
			);
		}

		this.#hoveredFeatureId = Number(feature.id);
		this.mapContext.activeMap.setFeatureState({ source: "map-outlines", id: this.#hoveredFeatureId }, { hover: true });

		const mapId = feature.properties?.id;
		this.hoveredHistoricMap = this.mapsById.get(mapId) || null;
	}

	handleMapMouseLeave() {
		if (this.#hoveredFeatureId !== null) {
			this.mapContext.activeMap.setFeatureState(
				{ source: "map-outlines", id: this.#hoveredFeatureId },
				{ hover: false }
			);
		}

		this.#hoveredFeatureId = null;
		this.hoveredHistoricMap = null;
	}

	extendClickedMapTimeout(delay = 2500) {
		if (!this.#clickedMapTimeout) return;
		clearTimeout(this.#clickedMapTimeout);
		this.#clickedMapTimeout = setTimeout(() => (this.#clickedFeatureId = null), delay);
	}

	setGridVisibility(isVisible: boolean, centerLngLat = { lng: 5.63, lat: 52.16 }, rippleScale = 3, speed = 300) {
		if (this.mapContext.sheetIndexVisible && !isVisible) return;

		const source = this.mapContext.activeMap.getSource("map-outlines") as any;
		if (!source || !source._data) return;
		const allFeatures = source._data.features;

		if (this.#gridVisibilityTimer) clearTimeout(this.#gridVisibilityTimer);
		this.#gridVisibilityTimer = setTimeout(() => (this.gridVisible = isVisible), 100);

		if (isVisible && this.#gridResetTimer) {
			clearTimeout(this.#gridResetTimer);
			this.#gridResetTimer = null;
		}

		const hoverFillOpacity = isVisible ? 0.1 : 0;

		this.mapContext.activeMap.setPaintProperty("map-outlines-fill", "fill-opacity", [
			"max",
			["coalesce", ["feature-state", "animated-fill-opacity"], 0],
			["case", ["boolean", ["feature-state", "hover"], false], hoverFillOpacity, 0],
		]);

		allFeatures.forEach((feature: any) => {
			const id = feature.id;
			if (id === undefined) return;

			if (this.#featureTimeouts[id]) {
				clearTimeout(this.#featureTimeouts[id]);
				delete this.#featureTimeouts[id];
			}

			if (!isVisible) {
				this.mapContext.animateFeatureOpacity(id, "animated-stroke-opacity", 0, 500);
				return;
			}

			const [x, y] = feature.geometry.coordinates[0][0];
			const dx = centerLngLat.lng - x;
			const dy = centerLngLat.lat - y;
			const distance = Math.sqrt(dx ** 2 + dy ** 2);

			const delay = distance * speed;
			const targetOpacity = Math.max(0, 0.5 - distance / rippleScale);

			this.#featureTimeouts[id] = setTimeout(() => {
				this.mapContext.animateFeatureOpacity(id, "animated-stroke-opacity", targetOpacity, 500);
				delete this.#featureTimeouts[id];
			}, delay);
		});
	}

	setSheetIndexVisibility(visible = !this.mapContext.sheetIndexVisible) {
		this.mapContext.sheetIndexVisible = visible;
		this.setGridVisibility(visible, { lng: 5.63, lat: 52.16 }, 100, 150);

		const isMapSelected = !!this.selectedMap;
		const visibilityStyle = !isMapSelected || visible ? "visible" : "none";

		const layers = ["map-outlines-numbers", "map-outlines-stroke", "map-outlines-fill"];
		layers.forEach((layerId) => {
			this.mapContext.activeMap.setLayoutProperty(layerId, "visibility", visibilityStyle);
		});

		this.mapContext.activeMap.setPaintProperty("map-outlines-numbers", "text-opacity", visible ? 1 : 0);

		return visible;
	}

	#handleMapSelection(historicMap: HistoricMap | null, featureId: number) {
		this.clickedHistoricMap = historicMap;
		this.#clickedFeatureId = featureId;

		if (this.#gridResetTimer) clearTimeout(this.#gridResetTimer);
		this.#gridResetTimer = setTimeout(() => {
			this.clickedHistoricMap = null;
			this.#clickedFeatureId = null;
		}, 2500);
	}

	#shouldOpenImmediately(historicMap: HistoricMap | null): boolean {
		if (!historicMap) return false;
		if (this.mapContext.sheetIndexVisible) return true;
		return this.clickedHistoricMap?.id === historicMap.id;
	}

	#triggerFillFlashAnimation(featureId: number) {
		if (this.#clickedFeatureId !== null && this.#clickedFeatureId !== featureId) {
			clearTimeout(this.#fillTimers.get(this.#clickedFeatureId));
			this.mapContext.animateFeatureOpacity(this.#clickedFeatureId, "animated-fill-opacity", 0, 300);
		}

		clearTimeout(this.#fillTimers.get(featureId));
		this.#clickedFeatureId = featureId;

		this.mapContext.animateFeatureOpacity(featureId, "animated-fill-opacity", 0.15, 200, () => {
			if (this.#clickedFeatureId !== featureId) {
				this.mapContext.animateFeatureOpacity(featureId, "animated-fill-opacity", 0, 300);
				return;
			}

			this.#fillTimers.set(
				featureId,
				setTimeout(() => {
					this.mapContext.animateFeatureOpacity(featureId, "animated-fill-opacity", 0, 500);
					this.#fillTimers.delete(featureId);
				}, 1000)
			);
		});
	}
}
