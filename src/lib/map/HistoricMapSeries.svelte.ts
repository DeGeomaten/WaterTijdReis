import { SvelteMap } from "svelte/reactivity";
import type { Filter, HistoricMap } from "$lib/types/historicmap";
import { transformToIIIFInfoJson } from "$lib/utils/allmaps";
import { calculateFilteredMapIds } from "./HistoricMapFilter";
import type { HistoricMapsContext } from "./historicMapsContext.svelte";

export class HistoricMapSeries {
	id: string;
	name: string;
	url: string;
	spriteJsonUrl: string;
	spriteImageUrl: string;
	context: HistoricMapsContext;

	enabled = $state(true);
	mapsLoaded = $state(false);

	mapsById = new SvelteMap<string, HistoricMap>();
	visibleMaps = new SvelteMap<string, HistoricMap>();

	mapsByNumber: Map<number, HistoricMap[]> = $derived.by(() => {
		if (!this.mapsLoaded) return new Map<number, HistoricMap[]>();
		const grouped = new Map<number, HistoricMap[]>();
		for (const sheet of this.mapsById.values()) {
			const list = grouped.get(sheet.number) ?? [];
			list.unshift(sheet);
			grouped.set(sheet.number, list);
		}
		return grouped;
	});

	filter: Filter = $state({
		yearStart: 1865,
		yearEnd: 1983,
		edition: "All",
		bis: false,
		type: undefined,
	});

	constructor(
		context: HistoricMapsContext,
		id: string,
		name: string,
		url: string,
		spriteJsonUrl: string,
		spriteImageUrl: string
	) {
		this.id = id;
		this.name = name;
		this.url = url;
		this.context = context;
		this.spriteJsonUrl = spriteJsonUrl;
		this.spriteImageUrl = spriteImageUrl;

		$effect.root(() => {
			if (this.mapsLoaded) {
				if (this.enabled) this.applyFilter();
				else this.#hideAll();
			}
		});
	}

	async load() {
		if (!this.context.mapContext.map || !this.context.warpedMapLayer) return;

		try {
			const res = await fetch(this.url);
			const data = await res.json();

			const imageInfos = data.map(transformToIIIFInfoJson);
			this.context.warpedMapLayer.addImageInfos(imageInfos);

			const loadPromises = data.map(async (item: any) => {
				const id = await this.context.warpedMapLayer!.addGeoreferencedMap(item);
				const warpedMap = this.context.warpedMapLayer!.getWarpedMap(id);

				this.mapsById.set(id, {
					id,
					manifestId: item.resource.partOf[0].id,
					polygon: {
						type: "Polygon",
						coordinates: [warpedMap?.geoMask.concat([warpedMap?.geoMask[0]])],
					},
					geoFullMaskBbox: warpedMap?.geoFullMaskBbox,
					...item._meta,
				});
			});

			await Promise.all(loadPromises);

			await this.#loadSprites();

			this.mapsLoaded = true;
		} catch (error) {
			console.error(`HistoricMapSeries (${this.name}): Fout tijdens het laden:`, error);
		}
	}

	async #loadSprites() {
		try {
			const spriteJson = await fetch(this.spriteJsonUrl).then((r) => r.json());
			const fullImageUrl = this.spriteImageUrl.startsWith("http")
				? this.spriteImageUrl
				: `${window.location.origin}${this.spriteImageUrl}`;

			this.context.warpedMapLayer?.addSprites(spriteJson, fullImageUrl, [3072, 3078]);
		} catch (error) {
			console.error(`HistoricMapSeries (${this.name}): Fout tijdens laden sprites:`, error);
		}
	}

	applyFilter(filter: Filter = this.filter) {
		if (!this.mapsLoaded || !this.enabled || this.context.selectedMap) return;

		const { mapsToColor, mapsToDesaturate, mapsToHide, adjustedYearEnd } = calculateFilteredMapIds(
			this.mapsByNumber,
			filter
		);

		this.filter.yearEnd = adjustedYearEnd;

		const mapOptionsByMapId = new Map();
		const defaultOptions = { applyMask: true, transformationType: "thinPlateSpline", saturation: 1 };

		mapsToColor.forEach((id) => mapOptionsByMapId.set(id, { ...defaultOptions, visible: true }));
		mapsToHide.forEach((id) => mapOptionsByMapId.set(id, { ...defaultOptions, visible: false }));
		mapsToDesaturate.forEach((id) => mapOptionsByMapId.set(id, { ...defaultOptions, visible: true, saturation: 0 }));

		this.context.warpedMapLayer?.setMapsOptionsByMapId(mapOptionsByMapId);

		mapsToHide.forEach((id) => this.visibleMaps.delete(id));
		[...mapsToColor, ...mapsToDesaturate].forEach((id) => {
			const historicMap = this.mapsById.get(id);
			if (historicMap) this.visibleMaps.set(id, historicMap);
		});

		this.context.updateMapOutlines();
		this.context.mapContext.toastContent = `Je ziet nu kaarten van ${Math.round(filter.yearEnd)} en ouder`;
	}

	#hideAll() {
		const mapOptionsByMapId = new Map();
		this.mapsById.keys().forEach((id) => {
			mapOptionsByMapId.set(id, { visible: false });
			this.visibleMaps.delete(id);
		});
		this.context.warpedMapLayer?.setMapsOptionsByMapId(mapOptionsByMapId);
		this.context.updateMapOutlines();
	}
}
