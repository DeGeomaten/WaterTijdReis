import type { LngLat } from "maplibre-gl";

export type BaseMapType = "none" | "protomaps" | "ahn" | "satelliet";
export type OverlayType = "none" | "waterschapsgrenzen" | "gemeentegrenzen";

export type MapView = {
	center: LngLat;
	zoom: number;
	bearing: number;
	pitch: number;
};

export function isBaseMapType(value: string | null): value is BaseMapType {
	return value === "none" || value === "protomaps" || value === "ahn" || value === "satelliet";
}

export type LayerOptions = {
	baseMap: BaseMapType;
	protoMapsWaterInFront: boolean;
	protoMapsLabelsInFront: boolean;
	historicMapsOpacity: number;
	overlay: OverlayType;
};

export type MapDefaultState = {
	zoom: number;
	lat: number;
	lng: number;
	yearStart: number;
	yearEnd: number;
	edition: "All" | 1 | 2 | 3 | 4 | 5;
	bis: boolean;
	type: undefined | "WVE" | "HWP";
	selectedSheetId: string | null;
	pinnedSheetId: string | null;
	baseMap: BaseMapType;
	protoMapsWaterInFront: boolean;
	protoMapsLabelsInFront: boolean;
	historicMapsOpacity: number;
};
