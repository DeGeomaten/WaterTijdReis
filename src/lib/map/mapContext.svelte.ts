import maplibregl from "maplibre-gl";
import type { LngLatLike, Map as MaplibreMap } from "maplibre-gl";
import * as pmtiles from "pmtiles";
import { addBackgroundLayers, addUserLocationCircle } from "./mapLayers.svelte";
import { basemapStyle, LABELS_LAYERS } from "$lib/map/basemap";
import { goto } from "$app/navigation";
import { HistoricMapsContext } from "./historicMapsContext.svelte";
import { getValidUserLocation } from "$lib/utils/userLocation";
import { addGemeentegrenzenLayer, addWaterschapsgrenzenLayer } from "$lib/map/mapLayers.svelte";

const defaultState = {
	zoom: 6.5,
	lat: 51.75,
	lng: 5.5,
	yearStart: 1865,
	yearEnd: 1983,
	edition: "All",
	bis: false,
	type: undefined,
	selectedSheetId: null,
	pinnedSheetId: null,
	baseMap: "none",
	protoMapsWaterInFront: false,
	protoMapsLabelsInFront: false,
	historicMapsOpacity: 100,
};

type LayerOptions = {
	baseMap: "none" | "protomaps" | "ahn" | "satelliet";
	protoMapsWaterInFront: boolean;
	protoMapsLabelsInFront: boolean;
	historicMapsOpacity: number;
	overlay: "none" | "waterschapsgrenzen" | "gemeentegrenzen";
};

export class MapContext {
	map: MaplibreMap | null = $state(null);
	maplibreLoaded: boolean = $state(false);

	historic: HistoricMapsContext = new HistoricMapsContext(this);

	viewportPolygon: GeojsonPolygon | null = $state(null);

	savedMapViews: MapView[] = $state([]);
	savedLayerVisibility: Record<string, "visible" | "none"> | null = null;

	userLocationActive: boolean = $state(false);
	userLocationTimeout: ReturnType<typeof setTimeout> | null = null;

	gridVisible: boolean = $state(false);
	sheetIndexVisible: boolean = $state(false);

	layerOptions = $state<LayerOptions>({
		baseMap: "none",
		protoMapsWaterInFront: false,
		protoMapsLabelsInFront: false,
		historicMapsOpacity: 100,
		overlay: "none",
	});

	toastContent: string = $state("");

	constructor() {
		// URL Sync
		$effect(() => {
			this.historic.filter.yearStart;
			this.historic.filter.yearEnd;
			this.historic.filter.edition;
			this.historic.filter.bis;
			this.historic.filter.type;
			this.layerOptions.baseMap;
			this.layerOptions.protoMapsWaterInFront;
			this.layerOptions.protoMapsLabelsInFront;
			this.layerOptions.historicMapsOpacity;
			this.historic.selectedMap;
			this.historic.pinnedMap;

			this.syncStateToURL();
		});

		// Basemap & opacity sync
		$effect(() => {
			if (!this.maplibreLoaded || this.historic.selectedMap) return;

			const isProtomaps = this.layerOptions.baseMap === "protomaps";

			this.setProtomapsVisiblity(isProtomaps);
			if (isProtomaps) {
				this.setProtomapsWaterInFront(this.layerOptions.protoMapsWaterInFront);
				this.setProtoMapsLabelsInFront(this.layerOptions.protoMapsLabelsInFront);
			}

			this.setAHNVisibility(this.layerOptions.baseMap === "ahn");
			this.setSatellietVisibility(this.layerOptions.baseMap === "satelliet");

			if (this.historic.warpedMapLayer) {
				this.historic.warpedMapLayer.setLayerOptions({
					opacity: this.layerOptions.historicMapsOpacity / 100,
				});
			}
		});

		// Overlays sync
		$effect(() => {
			if (!this.maplibreLoaded || !this.map) return;

			this.updateOverlays(this.layerOptions.overlay);
		});
	}

	get activeMap(): maplibregl.Map {
		if (!this.map) {
			throw new Error("MapContext: Maplibre is not initialized yet. Call init() first.");
		}
		return this.map;
	}

	resetState() {
		if (!this.maplibreLoaded || !this.historic.mapsLoaded) return;
		this.restoreView();

		this.activeMap.easeTo({
			center: [defaultState.lng, defaultState.lat],
			zoom: defaultState.zoom,
			pitch: 0,
			bearing: 0,
		});

		this.layerOptions.historicMapsOpacity = defaultState.historicMapsOpacity;
	}

	init(containerId: string) {
		const protocol = new pmtiles.Protocol();
		maplibregl.addProtocol("pmtiles", protocol.tile);

		const style = basemapStyle("nl");
		style.layers.forEach((layer) => {
			layer.layout = {
				...layer.layout,
				visibility: "none",
			};
		});

		this.map = new maplibregl.Map({
			container: containerId,
			style,
			center: [defaultState.lng, defaultState.lat],
			zoom: defaultState.zoom,
			minZoom: 5.5,
			maxZoom: 16,
			maxPitch: 0,
			minPitch: 0,
			maxBounds: [
				[-12, 47],
				[22, 57],
			],
			bearing: 0,
			dragRotate: false,
			touchPitch: false,
			touchRotate: false,
			attributionControl: false,
			preserveDrawingBuffer: true,
		});
		this.map.dragRotate.disable();
		this.map.keyboard.disable();
		this.map.touchZoomRotate.disableRotation();
		this.map.doubleClickZoom.disable();

		this.map.on("load", async () => {
			addBackgroundLayers(this.activeMap);

			await this.historic.init();

			addUserLocationCircle(this.activeMap);

			this.updateViewport();
			this.activeMap.on("move", () => this.updateViewport());
			this.activeMap.on("moveend", () => this.syncStateToURL());

			this.applyStateFromURL();

			this.maplibreLoaded = true;
		});
	}

	syncStateToURL() {
		if (!this.maplibreLoaded) return;

		const params = new URLSearchParams();
		const center = this.activeMap.getCenter();
		const zoom = this.activeMap.getZoom();

		const setIfChanged = (key: string, value: any, defaultValue: any) => {
			if (value !== defaultValue) params.set(key, String(value));
		};

		if (
			center.lat.toFixed(3) !== defaultState.lat.toFixed(3) ||
			center.lng.toFixed(3) !== defaultState.lng.toFixed(3)
		) {
			params.set("c", `${center.lat.toFixed(3)}_${center.lng.toFixed(3)}`);
		}
		setIfChanged("zoom", zoom.toFixed(2), defaultState.zoom.toFixed(2));

		if (
			this.historic.filter.yearStart !== defaultState.yearStart ||
			Math.round(this.historic.filter.yearEnd) !== defaultState.yearEnd
		) {
			params.set("period", `${this.historic.filter.yearStart}_${Math.round(this.historic.filter.yearEnd)}`);
		}
		setIfChanged("editie", this.historic.filter.edition, defaultState.edition);
		setIfChanged("bis", this.historic.filter.bis ? "1" : "0", defaultState.bis ? "1" : "0");
		if (this.historic.filter.type) params.set("type", this.historic.filter.type);

		if (this.historic.selectedMap) params.set("blad", this.historic.selectedMap.id);
		if (this.historic.pinnedMap) params.set("pinned", this.historic.pinnedMap.id);

		setIfChanged("achtergrondkaart", this.layerOptions.baseMap, defaultState.baseMap);
		setIfChanged(
			"pwf",
			this.layerOptions.protoMapsWaterInFront ? "1" : "0",
			defaultState.protoMapsWaterInFront ? "1" : "0"
		);
		setIfChanged(
			"plf",
			this.layerOptions.protoMapsLabelsInFront ? "1" : "0",
			defaultState.protoMapsLabelsInFront ? "1" : "0"
		);
		setIfChanged("opacity", this.layerOptions.historicMapsOpacity, defaultState.historicMapsOpacity);

		goto(`?${params.toString()}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
		});
	}

	applyStateFromURL() {
		const q = new URLSearchParams(window.location.search);
		if (window.location.hash.startsWith("#/")) return;

		let lat = defaultState.lat;
		let lng = defaultState.lng;
		const centerParam = q.get("c");
		if (centerParam) {
			const [latStr, lngStr] = centerParam.split("_");
			if (latStr && lngStr) {
				lat = parseFloat(latStr) || defaultState.lat;
				lng = parseFloat(lngStr) || defaultState.lng;
			}
		}
		const zoom = parseFloat(q.get("zoom") ?? "") || defaultState.zoom;
		this.activeMap.jumpTo({ center: [lng, lat], zoom });

		const yearParam = q.get("period");
		if (yearParam) {
			const [ys, ye] = yearParam.split("_");
			this.historic.filter.yearStart = parseInt(ys) || defaultState.yearStart;
			this.historic.filter.yearEnd = parseInt(ye) || defaultState.yearEnd;
		}

		const ed = q.get("editie");
		this.historic.filter.edition = ed === "All" || ed === null ? "All" : (Number(ed) as any);
		this.historic.filter.bis = q.get("bis") === "1";
		this.historic.filter.type = (q.get("type") as any) || defaultState.type;

		this.layerOptions.baseMap = (q.get("achtergrondkaart") as any) || defaultState.baseMap;
		this.layerOptions.protoMapsWaterInFront = q.get("pwf") === "1";
		this.layerOptions.protoMapsLabelsInFront = q.get("plf") === "1";
		this.layerOptions.historicMapsOpacity = parseInt(q.get("opacity") ?? "") || defaultState.historicMapsOpacity;

		const bladId = q.get("blad");
		const pinnedId = q.get("pinned");

		// TODO: watch for when maps are loaded!!
		if (bladId) setTimeout(() => (this.historic.selectedMap = this.historic.mapsById.get(bladId) || null), 500);
		if (pinnedId) setTimeout(() => (this.historic.pinnedMap = this.historic.mapsById.get(pinnedId) || null), 500);
	}

	zoomIn() {
		if (!this.activeMap) return;
		this.activeMap.zoomIn({ duration: 250 });
	}

	zoomOut() {
		if (!this.activeMap) return;
		this.activeMap.zoomOut({ duration: 250 });
	}

	flyToFeature(feature) {
		const { geometry, bbox } = feature;
		if (bbox) {
			const [minLng, minLat, maxLng, maxLat] = bbox;
			this.activeMap.fitBounds(
				[
					[minLng, minLat],
					[maxLng, maxLat],
				],
				{ padding: 40, maxZoom: 12, duration: 250 }
			);
		} else if (geometry?.type === "Point") {
			const [lng, lat] = geometry.coordinates;

			this.activeMap.flyTo({
				center: [lng, lat],
				zoom: 12,
				speed: 0.8,
				curve: 1.4,
				essential: true,
				duration: 250,
			});
		}
	}

	updateOverlays(overlay: "none" | "waterschapsgrenzen" | "gemeentegrenzen") {
		if (!this.map) return;

		if (overlay !== "waterschapsgrenzen") {
			if (this.map.getLayer("overlay-waterschapsgrenzen")) {
				this.map.removeLayer("overlay-waterschapsgrenzen");
			}
			if (this.map.getSource("pdok-waterschapsgrenzen")) {
				this.map.removeSource("pdok-waterschapsgrenzen");
			}
		}

		if (overlay !== "gemeentegrenzen") {
			if (this.map.getLayer("overlay-gemeentegrenzen")) {
				this.map.removeLayer("overlay-gemeentegrenzen");
			}
			if (this.map.getSource("pdok-gemeentegrenzen")) {
				this.map.removeSource("pdok-gemeentegrenzen");
			}
		}

		if (overlay === "waterschapsgrenzen" && !this.map.getSource("pdok-waterschapsgrenzen")) {
			addWaterschapsgrenzenLayer(this.map);
		}
		if (overlay === "gemeentegrenzen" && !this.map.getSource("pdok-gemeentegrenzen")) {
			addGemeentegrenzenLayer(this.map);
		}
	}

	setAHNVisibility(visible: boolean) {
		if (!this.maplibreLoaded) return;
		if (!this.activeMap.getLayer("dsm-05-layer")) return;
		this.activeMap.setLayoutProperty("dsm-05-layer", "visibility", visible ? "visible" : "none");
	}

	setSatellietVisibility(visible: boolean) {
		if (!this.maplibreLoaded) return;
		if (!this.activeMap.getLayer("satelliet-layer")) return;
		this.activeMap.setLayoutProperty("satelliet-layer", "visibility", visible ? "visible" : "none");
	}

	setProtomapsVisiblity(visible: boolean) {
		if (!this.maplibreLoaded) return;

		const layers = this.activeMap.getStyle().layers || [];
		layers.forEach((layer) => {
			if (layer.source === "protomaps" || layer.type === "background") {
				this.activeMap.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
			}
		});
	}

	setProtomapsWaterInFront(visible: boolean) {
		if (!this.maplibreLoaded) return;

		const waterLayers = ["water", "water_stream", "water_river"];

		waterLayers.forEach((layerId) => {
			if (this.activeMap.getLayer(layerId)) {
				this.activeMap.moveLayer(layerId, visible ? "map-outlines-labels" : "landuse_pedestrian");
			}
		});
	}

	setProtoMapsLabelsInFront(visible: boolean) {
		if (!this.maplibreLoaded) return;

		LABELS_LAYERS.forEach((layerId) => {
			if (this.activeMap.getLayer(layerId)) {
				this.activeMap.moveLayer(layerId, visible ? "map-outlines-labels" : "satelliet-layer");
			}
		});
	}

	saveMapView(push = true) {
		const view = {
			center: this.activeMap.getCenter(),
			zoom: this.activeMap.getZoom(),
			bearing: this.activeMap.getBearing(),
			pitch: this.activeMap.getPitch(),
		};
		if (push) this.savedMapViews.push(view);
		return view;
	}

	restoreView(view = this.savedMapViews.pop(), options = { duration: 500 }) {
		if (!this.activeMap || !view || !this.historic.warpedMapLayer) return;
		const { center, zoom, bearing, pitch } = view;
		this.activeMap.easeTo({ center, zoom, bearing, pitch, ...options });

		const optionsByMapId = new Map();
		optionsByMapId.set(this.historic.selectedMap?.id, {
			visible: false,
			transformationType: "thinPlateSpline",
			applyMask: true,
		});
		this.historic.warpedMapLayer.setMapsOptionsByMapId(optionsByMapId);

		if (this.savedLayerVisibility) {
			for (const layerId in this.savedLayerVisibility) {
				this.activeMap.setLayoutProperty(layerId, "visibility", this.savedLayerVisibility[layerId]);
			}
			this.savedLayerVisibility = null;
		}

		this.historic.setSheetIndexVisibility(false);

		if (this.historic.selectedMap) {
			this.historic.warpedMapLayer?.setMapOptions(this.historic.selectedMap?.id, {
				transformationType: "thinPlateSpline",
				applyMask: true,
			});
			this.historic.selectedMap = null;
		}

		this.historic.applyFilter(this.historic.filter);
	}

	setLabelVisibility(visible = true) {
		if (!this.maplibreLoaded) return;

		this.activeMap.setPaintProperty("map-outlines-numbers", "text-opacity", !visible ? +this.sheetIndexVisible : 0);

		this.activeMap.setPaintProperty("map-outlines-labels", "text-opacity-transition", {
			duration: 300,
		});
		this.activeMap.setPaintProperty("map-outlines-labels", "text-opacity", visible ? 1 : 0);
	}

	updateViewport() {
		const bounds = this.activeMap.getBounds();
		this.viewportPolygon = {
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[bounds.getWest(), bounds.getNorth()],
						[bounds.getEast(), bounds.getNorth()],
						[bounds.getEast(), bounds.getSouth()],
						[bounds.getWest(), bounds.getSouth()],
						[bounds.getWest(), bounds.getNorth()],
					],
				],
			},
			properties: {},
		};
	}

	animateFeatureOpacity(
		featureId: number | string,
		stateKey: string,
		targetOpacity: number,
		duration: number,
		callback?: () => void
	) {
		if (!this.map) return;

		const startOpacity = (this.map.getFeatureState({ source: "map-outlines", id: featureId })[stateKey] as number) || 0;
		const startTime = performance.now();

		const animate = (now: number) => {
			const progress = Math.min((now - startTime) / duration, 1);
			const currentOpacity = startOpacity + (targetOpacity - startOpacity) * progress;

			this.map?.setFeatureState({ source: "map-outlines", id: featureId }, { [stateKey]: currentOpacity });

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else if (callback) {
				callback();
			}
		};

		requestAnimationFrame(animate);
	}

	async flyToUserLocation() {
		try {
			const { lat, lng } = await getValidUserLocation();

			this.#setUserLocationMarker(lat, lng);
			this.userLocationActive = true;

			this.flyToFeature({
				geometry: { type: "Point", coordinates: [lng, lat] },
				properties: { label: "Your location" },
			});

			if (this.userLocationTimeout) clearTimeout(this.userLocationTimeout);
			this.userLocationTimeout = setTimeout(() => {
				this.#animateUserLocationMarker(0, 6);

				setTimeout(() => {
					this.#clearUserLocationMarker();
					this.userLocationActive = false;
					this.userLocationTimeout = null;
				}, 400);
			}, 2500);
		} catch (err: any) {
			if (err.message === "OUT_OF_BOUNDS") {
				alert("Je bent te ver buiten Nederland!");
			} else {
				console.error(err);
				alert("Kon locatie niet bepalen.");
			}
		}
	}

	#setUserLocationMarker(lat: number, lng: number) {
		const source = this.activeMap?.getSource("user-location") as maplibregl.GeoJSONSource;
		if (!source) return;

		source.setData({
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					geometry: { type: "Point", coordinates: [lng, lat] },
					properties: {},
				},
			],
		});

		this.#animateUserLocationMarker(1, 10);
	}

	#animateUserLocationMarker(opacity: number, radius: number) {
		if (!this.activeMap) return;
		this.activeMap.setPaintProperty("user-location", "circle-opacity", opacity);
		this.activeMap.setPaintProperty("user-location", "circle-stroke-opacity", opacity);
		this.activeMap.setPaintProperty("user-location", "circle-radius", radius);
	}

	#clearUserLocationMarker() {
		const source = this.activeMap?.getSource("user-location") as maplibregl.GeoJSONSource;
		source?.setData({ type: "FeatureCollection", features: [] });
	}
}
