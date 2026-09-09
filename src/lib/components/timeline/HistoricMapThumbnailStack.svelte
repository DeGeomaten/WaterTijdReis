<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { scale } from "svelte/transition";
	import MapThumbnail from "$lib/components/map/HistoricMapThumbnail.svelte";
	import type { HistoricMap } from "$lib/types/historicmap";

	let { maps, x, selectedYear } = $props<{
		maps: HistoricMap[];
		x: number;
		selectedYear: number;
	}>();

	const mapContext = getContext<MapContext>("mapContext");

	const mapWidth = 40;
	const Z_DEPTH = 2;

	const containerStyle = $derived(`
        transform: 
            translateX(${x - mapWidth / 2}px) 
            translateY(${75}px)
            rotateX(60deg);
        transform-style: preserve-3d;
    `);

	function getMapStyle(id: string) {
		const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

		const rotation = (hash % 20) - 10;
		const hue = 44;
		const sat = 46 + (hash % 20);
		const light = 70 + (hash % 20);

		return {
			rotation,
			color: `hsl(${hue}deg, ${sat}%, ${light}%)`,
		};
	}
</script>

<div class="absolute" style={containerStyle}>
	{#each maps as map, index (map.id)}
		{@const visible = mapContext.historic.mapsInViewport.has(map.id)}
		{@const style = getMapStyle(map.id)}
		{@const showContent = selectedYear + 0.5 > map.yearEnd && visible}

		<div
			class="absolute h-8 w-10 origin-bottom shadow-[0_6px_6px_rgba(0,0,0,0.1)]"
			style:background-color={visible ? style.color : "transparent"}
			style:border={visible ? "" : "1px solid #eeeeff44"}
			style="
                transform: 
                    translateZ({index * Z_DEPTH}px)
                    rotateZ({style.rotation}deg);
                transition: opacity 0.5s;
            "
		>
			{#if showContent}
				<div transition:scale={{ duration: 200 }} class="h-full w-full">
					<MapThumbnail id={map.id} height={32}></MapThumbnail>
				</div>
			{/if}
		</div>
	{/each}
</div>
