<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import * as turf from "@turf/turf";
	import { ArrowSquareOut, CaretDown, CaretUp, Check, Copy, Info } from "phosphor-svelte";
	import { fade, fly, slide } from "svelte/transition";

	import { registerBacksideMap } from "$lib/utils/allmaps";
	import MapThumbnail from "./HistoricMapThumbnail.svelte";

	const MANIFEST_URL = "https://tu-delft-heritage.github.io/watertijdreis-data/collection.json";

	const mapContext = getContext<MapContext>("mapContext");

	// Global IIIF Collection Manifest
	let manifestCollection = $state<any>(null);
	let editionManifest = $state<any>(null);

	$effect(() => {
		fetch(MANIFEST_URL)
			.then((res) => res.json())
			.then((data) => (manifestCollection = data))
			.catch(console.error);
	});

	let historicMap = $derived.by(() => {
		const visibleMaps = mapContext.historic.visibleMapsInViewport;
		const singleInViewport = visibleMaps && visibleMaps.size === 1 ? visibleMaps.values().next().value : null;

		return (
			mapContext.historic.selectedMap ||
			mapContext.historic.clickedHistoricMap ||
			(mapContext.sheetIndexVisible ? mapContext.historic.hoveredHistoricMap : null) ||
			singleInViewport
		);
	});

	let prevEdition = $state<number | null>(null);
	let prevBis = $state<boolean | null>(null);

	$effect(() => {
		if (!historicMap || !manifestCollection) return;

		if (historicMap.edition !== prevEdition || historicMap.bis !== prevBis) {
			prevEdition = historicMap.edition;
			prevBis = historicMap.bis;

			const label = `Editie ${historicMap.edition}${historicMap.bis ? " BIS" : ""}`;
			const item = manifestCollection.items?.find((i: any) => i?.label?.nl?.[0] === label);

			if (item?.id) {
				fetch(item.id)
					.then((res) => res.json())
					.then((data) => (editionManifest = data))
					.catch(() => (editionManifest = null));
			}
		}
	});

	// Canvas manifest and variants of the historic map
	let canvasManifest = $derived(
		historicMap && editionManifest ? editionManifest.items?.find((i: any) => i.id === historicMap.manifestId) : null
	);

	let variants = $derived.by(() => {
		if (!canvasManifest || !editionManifest) return [];
		const structure = editionManifest.structures?.find((s: any) =>
			s.items?.some((i: any) => i.id === canvasManifest.id)
		);
		if (!structure) return [];
		return structure.items.map((i: any) => editionManifest.items?.find((j: any) => j.id === i.id));
	});

	let mainSheet = $derived.by(() => {
		if (!variants.length) return null;
		const mainVariant = variants.find((i: any) => !getMetadata(i).flat().includes("Type"));
		if (!mainVariant) return null;
		const mapsArray = Array.from(mapContext.historic.mapsById.values());
		return mapsArray.find((i: any) => i.manifestId === mainVariant.id);
	});

	function getMetadata(m = canvasManifest, lang = "nl") {
		if (!m?.metadata) return [];
		return m.metadata.map((i: any) => {
			const label = i.label[lang] ?? i.label.en ?? i.label.none;
			const value = i.value[lang] ?? i.value.en ?? i.value.none;
			return [label?.[0], value?.[0]];
		});
	}

	// For projecting the viewport rectangle on to the thumbnail
	let viewportRect = $derived.by(() => {
		if (!mapContext.viewportPolygon || !historicMap?.geoFullMaskBbox) return null;

		const [minX, minY, maxX, maxY] = historicMap.geoFullMaskBbox;
		const [vMinX, vMinY, vMaxX, vMaxY] = turf.bbox(mapContext.viewportPolygon);

		const width = maxX - minX || 1;
		const height = maxY - minY || 1;

		const left = (vMinX - minX) / width;
		const top = (maxY - vMaxY) / height;
		const right = (vMaxX - minX) / width;
		const bottom = (maxY - vMinY) / height;

		return {
			leftPct: left * 100,
			topPct: top * 100,
			widthPct: (right - left) * 100,
			heightPct: (bottom - top) * 100,
		};
	});

	// For the thumbnail 3D Thumbnail animation
	let isPreviewing = $derived(
		Boolean(
			mapContext.historic.selectedMap ||
				mapContext.historic.clickedHistoricMap ||
				(mapContext.sheetIndexVisible && mapContext.historic.hoveredHistoricMap)
		)
	);

	let thumbnailEl = $state<HTMLElement | null>(null);
	let hasAnimatedIn = $state(false);

	$effect(() => {
		if (!thumbnailEl) return;

		if (isPreviewing && !hasAnimatedIn) {
			requestAnimationFrame(() => {
				if (!thumbnailEl) return;
				thumbnailEl.style.transform = "translate(0px, 0px) rotateX(0deg) scale(100%)";
				thumbnailEl.style.opacity = "1";
				hasAnimatedIn = true;
			});
		} else if (!isPreviewing && hasAnimatedIn) {
			thumbnailEl.style.transform = "translate(-30px, 0px) rotateX(60deg) scale(25%)";
			thumbnailEl.style.opacity = "0";
			hasAnimatedIn = false;
		}
	});

	// UI State
	let sheetInformationVisible = $state(false);
	let copySuccess = $state(false);
	let sheetInformationEl = $state<HTMLElement | null>(null);

	$effect(() => {
		if (!mapContext.historic.selectedMap) {
			sheetInformationVisible = false;
		}
	});

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 1500);
		} catch (e) {
			console.error("Kopiëren mislukt", e);
		}
	}

	async function handleSelectVariant(variant: any) {
		const mapsArray = Array.from(mapContext.historic.mapsById.values());
		const existingMap = mapsArray.find((m: any) => m.manifestId === variant.id);

		if (existingMap) {
			mapContext.historic.changeHistoricMapView(existingMap);
		} else if (mainSheet) {
			await registerBacksideMap(variant, mainSheet, mapContext);
		}

		if (sheetInformationEl) sheetInformationEl.scrollTop = 0;
	}

	// External Links
	let externalLinks = $derived.by(() => {
		if (!canvasManifest || !editionManifest) return null;

		const canvasId = canvasManifest.id;
		const canvasIndex = canvasId.match(/\/p(\d*)$/)?.[1] || "1";
		const imageId = canvasManifest.items?.[0]?.items?.[0]?.body?.service?.[0]?.id;
		const annotationUrl = canvasManifest.annotations?.[0]?.id;

		return {
			homepageUrl: `${editionManifest.rendering?.[0]?.id}?page=${canvasIndex}`,
			theseusUrl: `https://theseus-viewer.netlify.app/embed?iiif-content=${editionManifest.id}&canvas=${canvasId}&collection=${MANIFEST_URL}&panel=navPlace`,
			annotationUrl,
			xyzUrl: annotationUrl
				? `https://allmaps.xyz/{z}/{x}/{y}.png?url=${annotationUrl}&transformation.type=thin-plate-spline`
				: null,
			geoJsonIoUrl: annotationUrl ? `https://geojson.io/#data=data:text/x-url,${annotationUrl}.geojson` : null,
			img1024: imageId ? `${imageId}/full/1024,/0/default.png` : null,
			imgMax: imageId ? `${imageId}/full/max/0/default.png` : null,
		};
	});
</script>

{#if historicMap}
	<div
		class="from-wtr-blue/50 to-wtr-blue/50 sm:from-wtr-blue fixed right-2 bottom-2 left-2 z-[1000] overflow-hidden rounded-lg bg-gradient-to-r from-[270px] shadow-lg transition-all duration-300 sm:top-auto sm:to-transparent sm:to-[calc(50%-30px)]
		{sheetInformationVisible || mapContext.historic.selectedMap
			? 'bg-wtr-blue w-auto sm:w-87'
			: 'w-auto sm:w-[calc(100vh-16px)]'}"
		style:max-height={sheetInformationVisible ? "60vh" : "120px"}
		style:pointer-events={mapContext.historic.selectedMap ? "auto" : "none"}
		transition:fade={{ duration: 300 }}
	>
		<!-- HEADBAR HEADER -->
		<div class="relative z-20 flex h-30 items-stretch gap-3 bg-inherit">
			<div class="pointer-events-none flex-shrink-0 p-4 pr-1" style="transform-style: preserve-3d; perspective: 100px">
				<div
					bind:this={thumbnailEl}
					onclick={() => {
						if (historicMap && !mapContext.historic.selectedMap) {
							mapContext.historic.setHistoricMapView(historicMap);
						}
					}}
					class="pointer-events-auto relative block h-22 w-fit origin-[10%_100%] cursor-pointer overflow-hidden rounded-sm opacity-0 shadow-md transition-all duration-500 will-change-transform"
					style="transform: translate(-30px, 0px) rotateX(60deg) scale(25%);"
				>
					{#if canvasManifest && getMetadata(canvasManifest).flat().includes("Achterkant")}
						{@const imageService =
							canvasManifest.items?.[0]?.items?.[0]?.body?.service?.[0]?.id ||
							canvasManifest.items?.[0]?.items?.[0]?.body?.id}
						<img alt="" class="block h-full w-auto object-cover" src="{imageService}/full/,256/0/default.jpg" />
					{:else}
						<MapThumbnail id={historicMap.id} height={88} />
					{/if}

					{#if viewportRect}
						<div
							class="border-wtr-blue/40 pointer-events-none absolute rounded-sm border-[4px]"
							style="left: {viewportRect.leftPct}%; top: {viewportRect.topPct}%; width: {viewportRect.widthPct}%; height: {viewportRect.heightPct}%;"
						></div>
					{/if}
				</div>
			</div>

			{#key historicMap.id}
				<div
					class="flex w-full flex-shrink-1 flex-col items-start justify-center gap-1 pr-4"
					in:fly={{ x: -15, duration: 200 }}
				>
					<button
						type="button"
						onclick={() => {
							if (!mapContext.historic.selectedMap) mapContext.historic.setHistoricMapView(historicMap);
						}}
						class="text-wtr-subtle-blue pointer-events-auto line-clamp-2 max-w-50 text-left text-base font-bold transition-colors hover:underline"
					>
						{mainSheet?.label || historicMap.label || "..."}
					</button>

					<p class="text-wtr-subtle-blue text-sm font-medium">
						{historicMap.yearEnd} &middot; Editie {historicMap.edition}{historicMap.bis ? " BIS" : ""}
					</p>

					{#if mapContext.historic.selectedMap}
						<button
							type="button"
							transition:slide={{ duration: 200 }}
							onclick={() => (sheetInformationVisible = !sheetInformationVisible)}
							class="text-wtr-subtle-blue border-wtr-subtle-blue/20 bg-wtr-subtle-blue/10 hover:bg-wtr-subtle-blue/20 mt-2 flex items-center gap-1.5 rounded-lg border-2 px-3 py-1 text-xs font-semibold shadow-md transition-colors"
						>
							<Info size={18} />
							<span>{sheetInformationVisible ? "Sluiten" : "Openen"}</span>
							{#if sheetInformationVisible}
								<CaretDown size={18} weight="bold" />
							{:else}
								<CaretUp size={18} />
							{/if}
						</button>
					{/if}
				</div>
			{/key}
		</div>

		<!-- METADATA & EXTRA PANELS -->
		{#if sheetInformationVisible}
			<div
				bind:this={sheetInformationEl}
				transition:slide={{ duration: 300 }}
				class="scrollable border-wtr-subtle-blue/10 flex max-h-[calc(60vh-120px)] flex-col gap-4 overflow-y-auto border-t p-4"
			>
				<!-- METADATA LIST -->
				<div>
					<ul class="text-wtr-subtle-blue space-y-1 text-sm">
						<li class="bg-wtr-subtle-blue/10 rounded-md px-3 py-1.5">
							<span class="font-semibold opacity-60">Bladtitel: </span>
							<span class="font-medium">{historicMap.label}</span>
						</li>

						{#each getMetadata(canvasManifest) as [label, value], i (i)}
							<li class="bg-wtr-subtle-blue/10 rounded-md px-3 py-1.5">
								<span class="font-semibold opacity-60">{label}: </span>
								<span class="font-medium">{value}</span>
							</li>
						{/each}
					</ul>
				</div>

				<!-- VARIANTS / BIJBLADEN -->
				{#if variants.length > 1}
					<div>
						<h3 class="text-wtr-subtle-blue mb-2 text-base font-semibold">Bijbladen</h3>
						<div class="flex flex-col gap-1">
							{#each variants as variant, i (i)}
								{@const metadata = getMetadata(variant)}
								{@const rawType = metadata.find((i) => i[0] === "Type")?.[1] || "Hoofdblad (voorkant)"}
								{@const displayType = rawType.replace("Achterkant", "Hoofdblad (achterkant)")}

								{@const mapsArray = Array.from(mapContext.historic.mapsById.values())}
								{@const variantMap = mapsArray.find((m: any) => m.manifestId === variant.id)}

								{@const imageService =
									variant.items?.[0]?.items?.[0]?.body?.service?.[0]?.id || variant.items?.[0]?.items?.[0]?.body?.id}
								{@const isCurrent = canvasManifest?.id === variant.id}

								{#if imageService}
									<button
										type="button"
										onclick={() => handleSelectVariant(variant)}
										class="hover:bg-wtr-subtle-blue/10 flex cursor-pointer items-center gap-2 rounded-md p-2 text-left transition-colors {isCurrent
											? 'bg-wtr-subtle-blue/20 ring-wtr-pink ring-1'
											: ''}"
									>
										<div class="bg-wtr-subtle-blue/10 h-14 w-fit flex-shrink-0 overflow-hidden rounded-sm shadow-md">
											{#if !displayType.toLowerCase().includes("achterkant") && variantMap}
												<MapThumbnail id={variantMap.id} height={56} />
											{:else}
												<img
													src="{imageService}/full/,256/0/default.jpg"
													alt={displayType}
													class="block h-full w-auto object-cover"
												/>
											{/if}
										</div>

										<span class="text-wtr-subtle-blue text-xs font-semibold">
											{displayType}
										</span>
									</button>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<!-- EXTERNAL LINKS -->
				{#if externalLinks}
					<div>
						<h3 class="text-wtr-subtle-blue mb-2 text-base font-semibold">Externe links</h3>
						<div class="bg-wtr-subtle-blue/10 flex flex-col gap-2 rounded-md p-3 text-xs">
							<a
								href={externalLinks.homepageUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-wtr-pink flex items-center gap-1.5 hover:underline"
							>
								<ArrowSquareOut size={16} /> Universiteitsbibliotheek Utrecht
							</a>

							<a
								href={externalLinks.theseusUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-wtr-pink flex items-center gap-1.5 hover:underline"
							>
								<ArrowSquareOut size={16} /> Open in Theseus
							</a>

							{#if externalLinks.annotationUrl}
								<a
									href="https://viewer.allmaps.org/?url={externalLinks.annotationUrl}"
									target="_blank"
									rel="noopener noreferrer"
									class="text-wtr-pink flex items-center gap-1.5 hover:underline"
								>
									<ArrowSquareOut size={16} /> Open in Allmaps Viewer
								</a>

								{#if externalLinks.xyzUrl}
									<button
										type="button"
										onclick={() => copyToClipboard(externalLinks.xyzUrl)}
										class="text-wtr-pink flex items-center gap-1.5 text-left hover:underline"
									>
										{#if copySuccess}
											<Check size={16} /> XYZ tile URL gekopieerd
										{:else}
											<Copy size={16} /> Kopiëer XYZ tile URL
										{/if}
									</button>
								{/if}

								<a
									href={externalLinks.geoJsonIoUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-wtr-pink flex items-center gap-1.5 hover:underline"
								>
									<ArrowSquareOut size={16} /> Open in geojson.io
								</a>
							{/if}

							{#if externalLinks.img1024}
								<a
									href={externalLinks.img1024}
									target="_blank"
									rel="noopener noreferrer"
									class="text-wtr-pink flex items-center gap-1.5 hover:underline"
								>
									<ArrowSquareOut size={16} /> Download beeld (1024px)
								</a>
							{/if}
							{#if externalLinks.imgMax}
								<a
									href={externalLinks.imgMax}
									target="_blank"
									rel="noopener noreferrer"
									class="text-wtr-pink flex items-center gap-1.5 hover:underline"
								>
									<ArrowSquareOut size={16} /> Download beeld (origineel formaat)
								</a>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
