<script lang="ts">
	import { getContext } from "svelte";
	import { Spring } from "svelte/motion";
	import type { MapContext } from "$lib/map/mapContext.svelte";

	import TimelinePointer from "./TimelinePointer.svelte";
	import HistoricMapThumbnailStack from "./HistoricMapThumbnailStack.svelte";
	import TimelineSettings from "./TimelineSettings.svelte";
	import TimelineTicks from "./TimelineTicks.svelte";
	import TimelineHint from "./TimelineHint.svelte";
	import type { HistoricMap } from "$lib/types/historicmap";

	let { visible }: { visible: boolean } = $props();
	const mapContext = getContext<MapContext>("mapContext");

	let width = $state(0);
	let height = $state(120);
	let pixelsPerYear = $state(50);

	// Gesture states
	let pointerCache = new Map<number, PointerEvent>();
	let prevDiff = -1;
	let lastX = 0;
	let pointerDownX = 0;
	let pointerDownY = 0;
	let hasMoved = $state(false);

	let hintComponent: ReturnType<typeof TimelineHint> | null = $state(null);

	const FILTER_UPDATES_PER_SEC = 4;
	const MIN_ZOOM = 5;
	const MAX_ZOOM = 200;
	const MIN_YEAR = 1600;
	const MAX_YEAR = 2300;

	let view = new Spring(
		{
			start: mapContext.historic.filter.yearEnd - 10,
			end: mapContext.historic.filter.yearEnd + 10,
		},
		{ stiffness: 0.1, damping: 0.5 }
	);

	$effect(() => {
		if (width > 0 && pixelsPerYear > 0) {
			const halfRange = width / 2 / pixelsPerYear;
			const newStart = Math.max(mapContext.historic.filter.yearEnd - halfRange, MIN_YEAR);
			const newEnd = Math.min(mapContext.historic.filter.yearEnd + halfRange, MAX_YEAR);

			view.set({ start: newStart, end: newEnd });
		}
	});

	function getX(year: number) {
		return ((year - view.current.start) / (view.current.end - view.current.start)) * width;
	}

	let startYearInt = $derived(Math.floor(view.current.start));
	let endYearInt = $derived(Math.ceil(view.current.end));

	let filteredMaps = $derived(
		mapContext.historic.mapsById
			.values()
			.filter(
				(map) => mapContext.historic.filter.edition === "All" || mapContext.historic.filter.edition === map.edition
			)
			.filter((map) => mapContext.historic.filter.bis || !map.bis)
			.filter((map) => mapContext.historic.filter.type === map.type)
			.toArray()
	);

	let mapsByYear = $derived.by(() => {
		if (!mapContext.historic.mapsLoaded) return {};
		const res: Record<number, HistoricMap[]> = {};
		for (const map of filteredMaps) (res[map.yearEnd] ??= []).push(map);
		return res;
	});

	type Edition = {
		name: string;
		edition: number;
		bis: boolean;
		yearStart: number;
		yearEnd: number;
	};

	let editions = $derived.by(() => {
		if (!mapContext.historic.mapsLoaded) return [];
		const editionMap = new Map<string, Edition>();
		for (const map of filteredMaps) {
			const key = `${map.edition}-${map.bis}`;
			let ed = editionMap.get(key);
			if (!ed) {
				ed = {
					name: `Editie ${map.edition}${map.bis ? " (bis)" : ""}`,
					edition: map.edition,
					bis: map.bis,
					yearStart: map.yearEnd,
					yearEnd: map.yearEnd,
				};
				editionMap.set(key, ed);
			} else {
				ed.yearStart = Math.min(map.yearEnd, ed.yearStart);
				ed.yearEnd = Math.max(map.yearEnd, ed.yearEnd);
			}
		}
		return Array.from(editionMap.values());
	});

	let yearsWithMaps = $derived([...Object.keys(mapsByYear)].map(Number).sort((a, b) => a - b));
	let minHistoricMapYear = $derived(
		yearsWithMaps.length ? Math.min(...yearsWithMaps) : mapContext.historic.filter.yearEnd
	);
	let maxHistoricMapYear = $derived(
		yearsWithMaps.length ? Math.max(...yearsWithMaps) : mapContext.historic.filter.yearEnd
	);

	function getCacheDiff() {
		const pointers = Array.from(pointerCache.values());
		if (pointers.length !== 2) return -1;
		return Math.hypot(pointers[0].clientX - pointers[1].clientX, pointers[0].clientY - pointers[1].clientY);
	}

	let filterUpdateInterval: ReturnType<typeof setInterval> | null = null;
	let scheduledFilterUpdate: (() => void) | null = null;

	function onpointerdown(e: PointerEvent) {
		e.preventDefault();
		pointerCache.set(e.pointerId, e);

		if (pointerCache.size === 1) {
			lastX = e.clientX;
			pointerDownX = e.clientX;
			pointerDownY = e.clientY;
			hasMoved = false;
		} else if (pointerCache.size === 2) {
			prevDiff = getCacheDiff();
		}

		filterUpdateInterval = setInterval(() => {
			if (scheduledFilterUpdate) scheduledFilterUpdate();
		}, 1000 / FILTER_UPDATES_PER_SEC);

		mapContext.setLabelVisibility(true);
		hintComponent?.hideHint();
	}

	function onWindowPointerMove(e: PointerEvent) {
		if (!pointerCache.has(e.pointerId)) return;
		e.preventDefault();
		pointerCache.set(e.pointerId, e);

		if (pointerCache.size === 2) {
			const curDiff = getCacheDiff();
			if (prevDiff > 0 && curDiff > 0) {
				const scale = curDiff / prevDiff;
				pixelsPerYear = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pixelsPerYear * scale));
			}
			prevDiff = curDiff;
		} else if (pointerCache.size === 1) {
			const dx = lastX - e.clientX;
			if (Math.abs(e.clientX - pointerDownX) > 5 || Math.abs(pointerDownY - e.clientY) > 5) {
				hasMoved = true;
			}

			const currentRange = view.current.end - view.current.start;
			const yearDelta = (dx / width) * currentRange;

			const selectedYear = Math.min(
				Math.max(mapContext.historic.filter.yearEnd + yearDelta, minHistoricMapYear - 1),
				maxHistoricMapYear + 1
			);

			if (Math.floor(selectedYear) !== mapContext.historic.filter.yearEnd) {
				scheduledFilterUpdate = () => mapContext.historic.applyFilter();
			}
			mapContext.historic.filter.yearEnd = selectedYear;
			lastX = e.clientX;
		}
	}

	function onWindowPointerUp(e: PointerEvent) {
		if (pointerCache.size === 0) return;
		pointerCache.delete(e.pointerId);

		if (pointerCache.size < 2) prevDiff = -1;
		if (pointerCache.size === 1) {
			const remainingPointer = pointerCache.values().next().value;
			if (remainingPointer) lastX = remainingPointer.clientX;
		}
		if (pointerCache.size === 0) {
			const selectedYear = Math.round(mapContext.historic.filter.yearEnd);
			mapContext.historic.filter.yearEnd = selectedYear;

			if (scheduledFilterUpdate) scheduledFilterUpdate();
			if (filterUpdateInterval) clearInterval(filterUpdateInterval);
		}

		mapContext.setLabelVisibility(false);
	}

	function onwheel(e: WheelEvent) {
		e.preventDefault();
		const zoom = 1 + Math.min(Math.max(e.deltaY / 100, -0.08), 0.08);
		pixelsPerYear = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pixelsPerYear / zoom));
	}
</script>

<svelte:window
	onpointermove={onWindowPointerMove}
	onpointerup={onWindowPointerUp}
	onpointercancel={onWindowPointerUp}
/>

{#if visible}
	<div class="fixed right-2 bottom-2 left-2 z-999 h-30 w-auto cursor-pointer touch-none select-none">
		<TimelineHint bind:this={hintComponent} />

		<TimelinePointer year={Math.ceil((view.current.start + view.current.end) / 2)} />

		<div
			{onpointerdown}
			{onwheel}
			bind:clientWidth={width}
			bind:clientHeight={height}
			class="bg-wtr-blue absolute h-full w-full overflow-hidden rounded-[8px]"
		>
			<div class="absolute top-0 left-1/2 z-998 h-full w-1/2 bg-black/33 backdrop-blur-xs"></div>

			<!-- Fade overlays on the sides -->
			<div
				class="pointer-events-none absolute top-0 left-0 z-1000 h-full w-1/6 bg-gradient-to-r from-[#225] to-transparent"
			></div>
			<div
				class="pointer-events-none absolute top-0 right-0 z-1000 h-full w-1/6 bg-gradient-to-l from-[#225] to-transparent"
			></div>

			<!-- Map Thumbnails Stack -->
			<div class="absolute inset-0 z-1 h-[200px] w-full" style="perspective: 1000px; transform-style: preserve-3d;">
				{#each yearsWithMaps as year (year)}
					{#if year >= startYearInt && year <= endYearInt}
						{@const x = getX(year)}
						<HistoricMapThumbnailStack {x} maps={mapsByYear[year]} selectedYear={mapContext.historic.filter.yearEnd} />
					{/if}
				{/each}
			</div>

			<!-- SVG Ticks & Editions -->
			<TimelineTicks
				{width}
				{height}
				{pixelsPerYear}
				{startYearInt}
				{endYearInt}
				minYear={minHistoricMapYear}
				maxYear={maxHistoricMapYear}
				bind:selectedYear={mapContext.historic.filter.yearEnd}
				filterStartYear={mapContext.historic.filter.yearStart}
				{editions}
				{hasMoved}
				{getX}
			/>
		</div>

		<TimelineSettings minYear={minHistoricMapYear} maxYear={maxHistoricMapYear} />
	</div>
{/if}
