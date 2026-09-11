import type { HistoricMap } from "$lib/types/historicmap";

export function transformToIIIFInfoJson(item: any) {
	const { id, width, height, tiles } = item.resource;
	return {
		"@context": "http://iiif.io/api/image/2/context.json",
		"@id": id,
		profile: "http://iiif.io/api/image/2/level2.json",
		protocol: "http://iiif.io/api/image",
		width,
		height,
		tiles,
	};
}

export async function registerBacksideMap(
	canvasManifest: any,
	mainSheet: HistoricMap,
	mapContext: any
): Promise<HistoricMap | null> {
	const { id, height, width } = canvasManifest;
	const mainWarpedMap = mapContext.historic.warpedMapLayer.getWarpedMap(mainSheet.id);
	if (!mainWarpedMap) return null;

	const [minLng, minLat, maxLng, maxLat] = mainWarpedMap.geoFullMaskBbox;

	const annotation = {
		"@context": "https://schemas.allmaps.org/map/2/context.json",
		type: "GeoreferencedMap",
		id,
		resource: {
			id: canvasManifest.items[0]?.items[0]?.body?.service[0]?.id,
			width,
			height,
			type: "ImageService2",
			tiles: [{ width: 256, height: 256, scaleFactors: [1, 2, 4, 8, 16, 32] }],
		},
		gcps: [
			{ resource: [0, 0], geo: [minLng + 0.5, maxLat] },
			{ resource: [width, 0], geo: [maxLng + 0.5, maxLat] },
			{ resource: [width, height], geo: [maxLng + 0.5, minLat] },
			{ resource: [0, height], geo: [minLng + 0.5, minLat] },
		],
		resourceMask: [
			[0, height],
			[width, height],
			[width, 0],
			[0, 0],
		],
		transformation: { type: "straight" },
	};

	await mapContext.historic.warpedMapLayer.addGeoreferencedMap(annotation);

	const warpedMap = mapContext.historic.warpedMapLayer.getWarpedMap(id);
	const coordinates = [warpedMap?.geoMask.concat([warpedMap?.geoMask[0]])];

	const backsideMap: HistoricMap = {
		...mainSheet,
		id,
		manifestId: id,
		polygon: { type: "Polygon", coordinates },
		type: "Achterkant",
		geoFullMaskBbox: warpedMap?.geoFullMaskBbox,
	};

	mapContext.historic.mapsById.set(id, backsideMap);
	mapContext.historic.changeHistoricMapView(backsideMap);

	return backsideMap;
}
