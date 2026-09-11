import maplibregl from "maplibre-gl";
import type { Map as MaplibreMap } from "maplibre-gl";
import * as pmtiles from "pmtiles";
import { addBackgroundLayers, addUserLocationCircle } from "./mapLayers.svelte";
import { basemapStyle, LABELS_LAYERS } from "$lib/map/basemap";
import { HistoricMapsContext } from "./historicMapsContext.svelte";
import { getValidUserLocation } from "$lib/utils/userLocation";
import { addGemeentegrenzenLayer, addWaterschapsgrenzenLayer } from "$lib/map/mapLayers.svelte";

import { type LayerOptions, type MapView } from "$lib/types/map";
import type { Feature } from "geojson";
import { applyStateFromURL, syncStateToURL, defaultState } from "./urlStateManager";

export class MapContext {
	map: MaplibreMap | null = $state(null);
	maplibreLoaded: boolean = $state(false);

	historic: HistoricMapsContext = new HistoricMapsContext(this);

	viewportPolygon: Feature | null = $state(null);

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
		$effect(() => {
			syncStateToURL(this);
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
		this.historic.selectedMapId = null;
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

		const protoStyle = basemapStyle("nl");

		this.map = new maplibregl.Map({
			container: containerId,
			style: {
				version: 8,
				glyphs: protoStyle.glyphs,
				sprite: protoStyle.sprite,
				sources: {},
				layers: [],
			},
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
			attributionControl: false,
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
			this.activeMap.on("moveend", () => syncStateToURL(this));

			applyStateFromURL(this);

			this.maplibreLoaded = true;
		});
	}

	zoomIn() {
		if (!this.activeMap) return;
		this.activeMap.zoomIn({ duration: 250 });
	}

	zoomOut() {
		if (!this.activeMap) return;
		this.activeMap.zoomOut({ duration: 250 });
	}

	flyToFeature(feature: Feature) {
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

	private protomapsLoaded = false;

	setProtomapsVisiblity(visible: boolean) {
		if (!this.maplibreLoaded) return;

		if (visible && !this.protomapsLoaded) {
			this.loadProtomaps();
			this.protomapsLoaded = true;
			return;
		}

		if (this.protomapsLoaded) {
			const layers = this.activeMap.getStyle().layers || [];
			layers.forEach((layer) => {
				if (layer.source === "protomaps" || layer.id.startsWith("protomaps-")) {
					this.activeMap.setLayoutProperty(layer.id, "visibility", visible ? "visible" : "none");
				}
			});
		}
	}

	private loadProtomaps() {
		const style = basemapStyle("nl");

		if (style.glyphs && !this.activeMap.getStyle().glyphs) {
			this.activeMap.setGlyphs(style.glyphs);
		}

		Object.entries(style.sources).forEach(([sourceId, sourceConfig]) => {
			if (!this.activeMap.getSource(sourceId)) {
				this.activeMap.addSource(sourceId, sourceConfig as maplibregl.SourceSpecification);
			}
		});

		const existingLayers = this.activeMap.getStyle().layers || [];
		const firstExistingLayerId = existingLayers.length > 0 ? existingLayers[0].id : undefined;

		style.layers.forEach((layer) => {
			if (!this.activeMap.getLayer(layer.id)) {
				this.activeMap.addLayer(layer as maplibregl.LayerSpecification, firstExistingLayerId);
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
			this.historic.selectedMapId = null;
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
				type: "Feature",
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
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			if (errorMessage === "OUT_OF_BOUNDS") {
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
