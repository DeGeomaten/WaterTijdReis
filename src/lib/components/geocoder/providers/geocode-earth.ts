import { GeocoderProvider } from "../provider.js";

import type { GeojsonPoint } from "@allmaps/types";

type GeocoderProviderGeoJsonFeature = {
	geometry: GeojsonPoint;
	properties: {
		label: string;
		alt?: string;
	};
};

type GeoJsonFeatureGE = {
	geometry: GeojsonPoint;
	properties: { label: string };
};

export class GeocodeEarth extends GeocoderProvider {
	constructor(akiKey: string) {
		super("Geocode.Earth", akiKey);
	}

	queryFunction(text: string) {
		return (
			`https://api.geocode.earth/v1/autocomplete` +
			`?api_key=${this.apiKey}` +
			`&boundary.country=NLD` +
			`&layers=-venue` +
			`&text=${text}`
		);
	}

	featuresFunction(features: unknown[]) {
		return features as GeoJsonFeatureGE[] as GeocoderProviderGeoJsonFeature[];
	}
}
