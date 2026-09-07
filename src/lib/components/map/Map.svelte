<script lang="ts">
	import { onMount, getContext, setContext } from "svelte";

	import AppHeader from "../AppHeader.svelte";
	import Timeline from "../timeline/Timeline.svelte";
	import Toast from "../ui/Toast.svelte";
	import HistoricMapInfo from "./HistoricMapInfo.svelte";
	import MapControls from "./MapControls.svelte";
	import MapSheetToggle from "./MapSheetToggle.svelte";
	import Minimap from "./Minimap.svelte";

	import "maplibre-gl/dist/maplibre-gl.css";
	import { MapContext } from "../../map/mapContext.svelte";
	import { addGemeentegrenzenLayer, addWaterschapsgrenzenLayer } from "../../map/mapLayers.svelte";
	import { updateMousePosition } from "../../state/mousePosition.svelte";
	import { spriteStore } from "../../utils/spriteSheet.svelte";

	const containerId = "map-container";
	const mapContext = new MapContext();

	setContext("mapContext", mapContext);

	onMount(() => {
		if (!mapContext.map) mapContext.init(containerId);

		spriteStore.init();
	});

	$effect(() => {
		if (!mapContext.maplibreLoaded || mapContext.historic.selectedMap) return;

		mapContext.setProtomapsVisiblity(mapContext.layerOptions.baseMap === "protomaps");
		if (mapContext.layerOptions.baseMap === "protomaps")
			mapContext.setProtomapsWaterInFront(mapContext.layerOptions.protoMapsWaterInFront);
		if (mapContext.layerOptions.baseMap === "protomaps")
			mapContext.setProtoMapsLabelsInFront(mapContext.layerOptions.protoMapsLabelsInFront);

		mapContext.setAHNVisibility(mapContext.layerOptions.baseMap === "ahn");
		mapContext.setSatellietVisibility(mapContext.layerOptions.baseMap === "satelliet");

		if (mapContext.historic.warpedMapLayer)
			mapContext.historic.warpedMapLayer.setLayerOptions({
				opacity: mapContext.layerOptions.historicMapsOpacity / 100,
			});
	});

	$effect(() => {
		if (!mapContext.maplibreLoaded || !mapContext.map) return;

		const { overlay } = mapContext.layerOptions;

		if (overlay !== "waterschapsgrenzen") {
			if (mapContext.map.getLayer("overlay-waterschapsgrenzen")) {
				mapContext.map.removeLayer("overlay-waterschapsgrenzen");
			}
			if (mapContext.map.getSource("pdok-waterschapsgrenzen")) {
				mapContext.map.removeSource("pdok-waterschapsgrenzen");
			}
		}

		if (overlay !== "gemeentegrenzen") {
			if (mapContext.map.getLayer("overlay-gemeentegrenzen")) {
				mapContext.map.removeLayer("overlay-gemeentegrenzen");
			}
			if (mapContext.map.getSource("pdok-gemeentegrenzen")) {
				mapContext.map.removeSource("pdok-gemeentegrenzen");
			}
		}

		if (overlay === "waterschapsgrenzen" && !mapContext.map.getSource("pdok-waterschapsgrenzen")) {
			addWaterschapsgrenzenLayer(mapContext.map);
		}
		if (overlay === "gemeentegrenzen" && !mapContext.map.getSource("pdok-gemeentegrenzen")) {
			addGemeentegrenzenLayer(mapContext.map);
		}
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;

		const key = e.key.toLowerCase();

		if (key === "=") mapContext.zoomIn();
		if (key === "-") mapContext.zoomOut();

		if (mapContext.layerOptions.baseMap === "protomaps") {
			if (key === "w") {
				mapContext.layerOptions.protoMapsWaterInFront = !mapContext.layerOptions.protoMapsWaterInFront;
			}
			if (key === "t") {
				mapContext.layerOptions.protoMapsLabelsInFront = !mapContext.layerOptions.protoMapsLabelsInFront;
			}
		}

		if (e.key === "Escape") {
			mapContext.historic.clickedFeature = null;
			mapContext.historic.setSheetIndexVisibility(false);
		}
	}

	function handlePopState() {
		mapContext.applyStateFromURL();

		const q = new URLSearchParams(window.location.search);
		const bladId = q.get("blad");
		if (bladId) {
			const historicMap = mapContext.historic.mapsById.get(bladId);
			if (historicMap) mapContext.historic.setHistoricMapView(historicMap);
		}
	}

	let clickedMapTimeout = null;

	function extendClickedMapTimeout(delay = 2500) {
		if (!clickedMapTimeout) return;
		clearTimeout(clickedMapTimeout);
		clickedMapTimeout = setTimeout(() => (mapContext.historic.clickedFeature = null), delay);
	}
</script>

<div
	id={containerId}
	class="polka fixed inset-0 h-full w-full bg-[length:25px_25px]"
	style:touch-action="auto"
	style:background-color={mapContext.historic.selectedMap ? "#fffaff" : "#fafaff"}
	style:background-image={`radial-gradient(${mapContext.historic.selectedMap ? "#fef" : "#eef"} 2.5px, transparent 2.5px)`}
></div>

{#if !mapContext.historic.selectedMap}
	<Toast content={mapContext.toastContent}></Toast>
{/if}

<MapSheetToggle {extendClickedMapTimeout}></MapSheetToggle>

{#if mapContext.maplibreLoaded}
	<MapControls />
{/if}

<AppHeader />

<Timeline visible={mapContext.historic.mapsLoaded && !mapContext.historic.selectedMap}></Timeline>

<Minimap></Minimap>
<HistoricMapInfo></HistoricMapInfo>

<svelte:window onpointermove={updateMousePosition} onkeydown={handleKeyDown} onpopstate={handlePopState} />

<style>
	#map-container :global(canvas) {
		outline: none !important;
	}
</style>
