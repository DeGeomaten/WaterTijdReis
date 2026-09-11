<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { throttle } from "lodash-es";
	import { MapTrifold, MapPin, Mountains, Camera, EyeSlash, Waves } from "phosphor-svelte";

	import Modal from "$lib/components/ui/Modal.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import Slider from "$lib/components/ui/Slider.svelte";

	let { visible = $bindable() } = $props();

	const mapContext = getContext<MapContext>("mapContext");

	let targetOpacity = $state(mapContext.layerOptions.historicMapsOpacity);
	$effect(() => {
		targetOpacity = mapContext.layerOptions.historicMapsOpacity;
	});

	const updateMapOpacity = throttle((val: number) => {
		mapContext.layerOptions.historicMapsOpacity = val;
	}, 50);

	function handleSliderChange(val: number) {
		targetOpacity = val;
		updateMapOpacity(val);
	}

	let sliderEl: HTMLElement | undefined = $state();
	let sliderPos = $state({ top: 0, left: 0, width: 0 });
	let backgroundVisible = $state(false);

	function showBackground() {
		if (!sliderEl) return;

		backgroundVisible = true;
		const rect = sliderEl.getBoundingClientRect();
		sliderPos = {
			top: rect.top,
			left: rect.left,
			width: rect.width,
		};
	}

	function hideBackground() {
		backgroundVisible = false;
	}

	let baseMapOptions = [
		{ value: "none", label: "Geen achtergrond", icon: EyeSlash },
		{ value: "protomaps", label: "OpenStreetMap", icon: MapTrifold },
		{ value: "satelliet", label: "Satellietbeeld", icon: Camera },
		{ value: "ahn", label: "Hoogtekaart (AHN)", icon: Mountains },
	];

	let overlayLayerOptions = [
		{ value: "none", label: "Geen overlegkaart", icon: EyeSlash },
		{ value: "waterschapsgrenzen", label: "Waterschapsgrenzen (PDOK)", icon: Waves },
		{ value: "gemeentegrenzen", label: "Gemeentegrenzen (PDOK)", icon: MapPin },
	];
</script>

<svelte:window onpointerup={hideBackground} />

<Modal bind:visible title="Lagen" opacity={backgroundVisible ? 0 : 100}>
	<p class="text-[12px] opacity-50">Achtergrondkaart</p>
	<Select
		Icon={MapTrifold}
		options={baseMapOptions}
		value={mapContext.layerOptions.baseMap}
		onchange={(opt) => (mapContext.layerOptions.baseMap = opt.value)}
	/>

	{#if mapContext.layerOptions.baseMap === "protomaps"}
		<div class="text-wtr-blue mt-4 max-w-60 text-[15px] font-[500]">
			<input
				type="checkbox"
				bind:checked={mapContext.layerOptions.protoMapsWaterInFront}
				class="accent-wtr-pink mr-2"
			/>
			Waterlagen vóór historische kaarten
			<kbd
				class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
				><span class="text-foreground-alt text-[12px]">W</span></kbd
			>
			<br />
			<input
				type="checkbox"
				bind:checked={mapContext.layerOptions.protoMapsLabelsInFront}
				class="accent-wtr-pink mr-2"
			/>
			Plaatsnamen vóór historische kaarten
			<kbd
				class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
				><span class="text-foreground-alt text-[12px]">T</span></kbd
			>
		</div>
	{/if}

	<div onpointerdown={showBackground} bind:this={sliderEl}>
		<p class="mt-4 text-[12px] opacity-50">Zichtbaarheid waterstaatskaarten</p>
		<Slider value={targetOpacity} onchange={handleSliderChange} />
	</div>

	<p class="mt-4 text-[12px] opacity-50">Overlegkaart</p>
	<Select
		Icon={MapPin}
		options={overlayLayerOptions}
		value={mapContext.layerOptions.overlay}
		onchange={(opt) => (mapContext.layerOptions.overlay = opt.value)}
	/>
</Modal>

{#if backgroundVisible}
	<div
		class="fixed z-1100 box-content -translate-x-4 -translate-y-4 rounded-[8px] bg-white p-4 shadow-lg"
		style="
			position: fixed;
			top: {sliderPos.top - 16}px;
			left: {sliderPos.left}px;
			width: {sliderPos.width}px;
		"
	>
		<p class="mt-4 text-[12px] text-[#558]">Zichtbaarheid waterstaatskaarten</p>
		<Slider value={targetOpacity} onchange={handleSliderChange} />
	</div>
{/if}
