<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";

	import { fade, slide } from "svelte/transition";
	import { MapTrifold, FileText, PushPin } from "phosphor-svelte";
	import Toast from "../ui/Toast.svelte";

	const mapContext = getContext<MapContext>("mapContext");

	let rightBtnSelected = $state(false);
	let leftBtnWidth = $state(86);
	let rightBtnWidth = $state(0);

	let pinnedView = $state(null);

	function leftBtnClick() {
		rightBtnSelected = false;
		if (
			mapContext.historic.pinnedMapId &&
			mapContext.historic.selectedMapId &&
			mapContext.historic.pinnedMapId == mapContext.historic.selectedMapId
		)
			pinnedView = mapContext.saveMapView(false);
		mapContext.historic.selectedMapId = null;
		mapContext.historic.setSheetIndexVisibility(false);
	}

	function rightBtnClick() {
		rightBtnSelected = true;

		if (mapContext.historic.clickedHistoricMap && !mapContext.historic.selectedMap) {
			mapContext.historic.extendClickedMapTimeout();
			mapContext.historic.selectedMapId = mapContext.historic.clickedHistoricMap.id;
		} else if (mapContext.historic.pinnedMap && !mapContext.historic.selectedMap) {
			mapContext.historic.extendClickedMapTimeout();
			mapContext.historic.selectedMapId = mapContext.historic.pinnedMapId;
		} else {
			if (!mapContext.historic.setSheetIndexVisibility()) leftBtnClick();
		}
	}

	$effect(() => {
		if (mapContext.historic.selectedMap) rightBtnSelected = true;
		else rightBtnSelected = false;
	});

	let toastMessage = $state("");

	let spaceKeyDown = $state(false);
	let keyboardShortcutVisible = $state(true);

	setTimeout(() => {
		keyboardShortcutVisible = false;
	}, 2000);

	function slideFade(node, params) {
		const s = slide(node, params);
		const f = fade(node, params);

		return {
			duration: Math.max(s.duration, f.duration),
			delay: Math.min(s.delay, f.delay),
			css: (t) => `
				${s.css ? s.css(t) + ";" : ""}
				${f.css ? f.css(t) + ";" : ""}
			`,
		};
	}
</script>

<svelte:document
	onkeydown={(e) => {
		if (e.key == " " && !spaceKeyDown) {
			spaceKeyDown = true;
			rightBtnClick();
		}
		if (e.key == "Escape") {
			leftBtnClick();
		}
	}}
	onkeyup={(e) => {
		if (e.key == " ") {
			spaceKeyDown = false;
			// if (!mapContext.historic.selectedMap) leftBtnClick();
		}
	}}
/>

<div
	class="
        group text-wtr-blue border-wtr-blue/7 bg-wtr-blue/7 fixed top-21 left-2 z-1000 my-3 flex flex-shrink-0
        cursor-pointer items-center justify-center rounded-[9px] border-2
        font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)]
        backdrop-blur-md duration-500
        sm:top-24 sm:left-5
    "
>
	<span
		class="absolute left-0 h-full w-1/2 rounded-[8px] bg-white shadow-md transition-[left,width] duration-300 ease-out"
		style:left={(!rightBtnSelected ? 0 : leftBtnWidth) + "px"}
		style:width={(!rightBtnSelected ? leftBtnWidth : rightBtnWidth) + "px"}
	></span>
	<button
		bind:clientWidth={leftBtnWidth}
		class="z-2 flex cursor-pointer items-center gap-1 rounded-[7px] px-3 py-1.5 transition-[background] duration-300"
		onclick={leftBtnClick}
		tabindex="3"
	>
		<MapTrifold
			size="18"
			color={!rightBtnSelected ? "var(--color-wtr-pink)" : "var(--color-wtr-blue)"}
			class="shrink-0 transition-[fill] duration-500"
		/>
		Kaart
	</button>
	<button
		bind:clientWidth={rightBtnWidth}
		class="z-2 flex max-w-50 cursor-pointer items-center gap-1 rounded-[7px] px-3 py-1.5 transition-[background] duration-300"
		onclick={rightBtnClick}
		tabindex="4"
	>
		<FileText
			size="18"
			color={rightBtnSelected ? "var(--color-wtr-pink)" : "var(--color-wtr-blue)"}
			class="shrink-0 transition-[fill] duration-500"
		/>

		{#if mapContext.historic.selectedMap}
			<span class="truncate">{mapContext.historic.selectedMap.label}</span>
			<span
				role="button"
				tabindex="0"
				class="cursor-pointer"
				onclick={(e) => {
					e.stopPropagation();
					if (mapContext.historic.pinnedMapId) mapContext.historic.pinnedMapId = null;
					else mapContext.historic.pinnedMapId = mapContext.historic.selectedMapId;
				}}
			>
				{#if mapContext.historic.pinnedMap && mapContext.historic.pinnedMapId == mapContext.historic.selectedMapId}
					<PushPin size="18" class="relative -top-[2px] ml-1 inline" weight="fill"></PushPin>
				{:else}
					<PushPin size="18" class="relative -top-[2px] ml-1 inline" weight="regular"></PushPin>
				{/if}
			</span>
		{:else if mapContext.historic.pinnedMap && !mapContext.historic.clickedHistoricMap}
			<span class="truncate">{mapContext.historic.pinnedMap.label}</span>
			<span
				role="button"
				tabindex="0"
				class="cursor-pointer"
				onclick={(e) => {
					e.stopPropagation();
					mapContext.historic.pinnedMapId = null;
				}}
			>
				<PushPin size="18" class="relative -top-[2px] ml-1 inline" weight="fill"></PushPin>
			</span>
		{:else}
			<span class="truncate">
				{mapContext.historic.clickedHistoricMap ? mapContext.historic.clickedHistoricMap.label : "Bladindex"}
			</span>

			{#if keyboardShortcutVisible}
				<kbd
					class="
					border-wtr-subtle-blue ml-1 flex inline items-center rounded-[4px] border bg-white
					px-1 font-sans text-[12px] text-[#cce]
					shadow-[0px_2px_0px_0px_#cce] select-none
					"
					transition:slideFade={{ axis: "x", duration: 300 }}
				>
					<span>Spatie</span>
				</kbd>
			{/if}
		{/if}
	</button>
</div>

<Toast content={toastMessage}></Toast>
