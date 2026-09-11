import { WarpedMap, WarpedMapEvent, WarpedMapEventType } from "@allmaps/render";
import type { GeoJsonProperties, Geometry, Feature, Polygon } from "geojson";

export type HistoricMap = {
	id: string;
	manifestId: string;
	warpedMap?: WarpedMap;
	label: string;
	polygon: Polygon;
	yearStart: number;
	yearEnd: number;
	edition: number;
	bis: boolean;
	number: number;
	position: string;
	x: number;
	y: number;
	type: string | undefined;
};

export type Filter = {
	yearStart: number;
	yearEnd: number;
	edition: "All" | 1 | 2 | 3 | 4 | 5;
	bis: boolean;
	type: undefined | "WVE" | "HWP";
};
