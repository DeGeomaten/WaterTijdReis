<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { ui } from "$lib/state/ui.svelte";
	import { fly } from "svelte/transition";
	import { MagnifyingGlass, MagnifyingGlassMinus, MagnifyingGlassPlus, NavigationArrow, Stack } from "phosphor-svelte";

	import { env } from "$env/dynamic/public";
	import { isApplePlatform } from "$lib/utils/platform";
	import Geocoder from "../geocoder/Geocoder.svelte";
	import { GeocodeEarth } from "$lib/components/geocoder/providers/geocode-earth";
	import LayersModal from "$lib/components/modals/LayersModal.svelte";
	import Button from "$lib/components/ui/Button.svelte";

	const mapContext = getContext<MapContext>("mapContext");

	const geocodeEarthApiKey = env.PUBLIC_GEOCODE_EARTH_API_KEY;

	let scaleWidth = $state(60);
	let scaleText = $state("100 m");

	$effect(() => {
		const map = mapContext.activeMap;
		if (!map) return;

		const updateScale = () => {
			const y = map.getContainer().clientHeight / 2;
			const maxMeters = map.unproject([0, y]).distanceTo(map.unproject([100, y]));

			const pow10 = Math.pow(10, Math.floor(Math.log10(maxMeters)));
			let displayMeters = Math.round(maxMeters / pow10) * pow10;
			if (displayMeters === 0) displayMeters = 1;

			scaleWidth = Math.round((displayMeters / maxMeters) * 100);
			scaleText = displayMeters >= 1000 ? `${displayMeters / 1000} km` : `${displayMeters} m`;
		};

		updateScale();
		map.on("move", updateScale);

		return () => {
			map.off("move", updateScale);
		};
	});

	function handleKeyDown(e: KeyboardEvent) {
		const isApple = isApplePlatform();
		const isModifierPressed = isApple ? e.metaKey : e.ctrlKey;

		const target = e.target as HTMLElement;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
			return;
		}

		if (e.key.toLowerCase() === "k" && isModifierPressed) {
			e.preventDefault();
			ui.openSearch();
		}

		if (e.key.toLowerCase() === "l") {
			ui.toggleLayers();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<Geocoder bind:visible={ui.searchVisible} providers={[new GeocodeEarth(geocodeEarthApiKey)]}></Geocoder>

<LayersModal bind:visible={ui.layersModalVisible}></LayersModal>

<div
	class="
	fixed right-2 flex flex-col items-end gap-2 transition-all duration-300
	{mapContext.historic.selectedMap ? 'bottom-36 sm:bottom-2' : 'bottom-36'}
	"
>
	{#if !mapContext.historic.selectedMap}
		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button tabindex={5} Icon={MagnifyingGlass} kbd="⌘K" onclick={() => ui.openSearch()}>Zoek plaats ...</Button>
		</div>

		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button tabindex={6} Icon={NavigationArrow} onclick={() => mapContext.flyToUserLocation()}
				>Mijn locatie tonen</Button
			>
		</div>

		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button tabindex={7} Icon={Stack} kbd="L" onclick={() => ui.toggleLayers()}>Lagen</Button>
		</div>
	{/if}

	<div
		class={`
			flex w-fit flex-col items-end
			justify-center overflow-hidden rounded-lg
		`}
	>
		<Button Icon={MagnifyingGlassPlus} onclick={() => mapContext.zoomIn()} kbd="+">Inzoomen</Button>
		<div class="relative -top-[2px]">
			<Button Icon={MagnifyingGlassMinus} onclick={() => mapContext.zoomOut()} kbd="-">Uitzoomen</Button>
		</div>
	</div>

	<div
		style:width={scaleWidth + "px"}
		class="border-wtr-blue/66 mt-4 h-2 rounded-b-[4px] border-2 border-t-0 text-right shadow-[1px_1px_0_#eef] transition-all duration-250 text-shadow-[1px_1px_0_#eef]"
	>
		<span class="text-wtr-blue relative -top-4 p-2 text-[12px] font-[600]">{scaleText}</span>
	</div>
</div>
