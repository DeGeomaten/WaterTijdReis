import { goto } from "$app/navigation";
import type { MapContext } from "./mapContext.svelte";
import { isBaseMapType, type MapDefaultState } from "$lib/types/map";

export const defaultState = {
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
} satisfies MapDefaultState;

export function applyStateFromURL(ctx: MapContext) {
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
	ctx.activeMap.jumpTo({ center: [lng, lat], zoom });

	const yearParam = q.get("period");
	if (yearParam) {
		const [ys, ye] = yearParam.split("_");
		ctx.historic.filter.yearStart = parseInt(ys) || defaultState.yearStart;
		ctx.historic.filter.yearEnd = parseInt(ye) || defaultState.yearEnd;
	}

	const ed = q.get("editie");
	if (ed === "All" || ed === null) {
		ctx.historic.filter.edition = "All";
	} else {
		const parsedEd = parseInt(ed, 10);
		if (!isNaN(parsedEd) && parsedEd >= 1 && parsedEd <= 5) {
			ctx.historic.filter.edition = parsedEd as 1 | 2 | 3 | 4 | 5;
		} else {
			ctx.historic.filter.edition = defaultState.edition;
		}
	}

	ctx.historic.filter.bis = q.get("bis") === "1";
	const rawType = q.get("type");
	if (rawType === "WVE" || rawType === "HWP") {
		ctx.historic.filter.type = rawType;
	} else {
		ctx.historic.filter.type = defaultState.type;
	}

	const rawBaseMap = q.get("achtergrondkaart");
	if (isBaseMapType(rawBaseMap)) {
		ctx.layerOptions.baseMap = rawBaseMap;
	} else {
		ctx.layerOptions.baseMap = defaultState.baseMap;
	}

	ctx.layerOptions.protoMapsWaterInFront = q.get("pwf") === "1";
	ctx.layerOptions.protoMapsLabelsInFront = q.get("plf") === "1";
	ctx.layerOptions.historicMapsOpacity = parseInt(q.get("opacity") ?? "") || defaultState.historicMapsOpacity;

	ctx.historic.selectedMapId = q.get("blad");
	ctx.historic.pinnedMapId = q.get("pinned");
}

export function syncStateToURL(ctx: MapContext) {
	if (!ctx.maplibreLoaded) return;

	const params = new URLSearchParams();
	const center = ctx.activeMap.getCenter();
	const zoom = ctx.activeMap.getZoom();

	const setIfChanged = <T extends { toString(): string } | null | undefined>(
		key: string,
		value: T,
		defaultValue: T
	) => {
		if (value !== defaultValue && value !== null && value !== undefined) {
			params.set(key, String(value));
		}
	};

	if (center.lat.toFixed(3) !== defaultState.lat.toFixed(3) || center.lng.toFixed(3) !== defaultState.lng.toFixed(3)) {
		params.set("c", `${center.lat.toFixed(3)}_${center.lng.toFixed(3)}`);
	}
	setIfChanged("zoom", zoom.toFixed(2), defaultState.zoom.toFixed(2));

	if (
		ctx.historic.filter.yearStart !== defaultState.yearStart ||
		Math.round(ctx.historic.filter.yearEnd) !== defaultState.yearEnd
	) {
		params.set("period", `${ctx.historic.filter.yearStart}_${Math.round(ctx.historic.filter.yearEnd)}`);
	}
	setIfChanged("editie", ctx.historic.filter.edition, defaultState.edition);
	setIfChanged("bis", ctx.historic.filter.bis ? "1" : "0", defaultState.bis ? "1" : "0");
	if (ctx.historic.filter.type) params.set("type", ctx.historic.filter.type);

	if (ctx.historic.selectedMap) params.set("blad", ctx.historic.selectedMap.id);
	if (ctx.historic.pinnedMap) params.set("pinned", ctx.historic.pinnedMap.id);

	setIfChanged("achtergrondkaart", ctx.layerOptions.baseMap, defaultState.baseMap);
	setIfChanged(
		"pwf",
		ctx.layerOptions.protoMapsWaterInFront ? "1" : "0",
		defaultState.protoMapsWaterInFront ? "1" : "0"
	);
	setIfChanged(
		"plf",
		ctx.layerOptions.protoMapsLabelsInFront ? "1" : "0",
		defaultState.protoMapsLabelsInFront ? "1" : "0"
	);
	setIfChanged("opacity", ctx.layerOptions.historicMapsOpacity, defaultState.historicMapsOpacity);

	goto(`?${params.toString()}`, {
		replaceState: true,
		noScroll: true,
		keepFocus: true,
	});
}
