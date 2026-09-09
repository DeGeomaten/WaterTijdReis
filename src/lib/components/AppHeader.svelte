<script lang="ts">
	import { getContext } from "svelte";
	import { ui } from "$lib/state/ui.svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { ShareFat, Info } from "phosphor-svelte";
	import ShareModal from "./modals/ShareModal.svelte";
	import Button from "./ui/Button.svelte";
	import AboutModal from "./modals/AboutModal.svelte";

	const mapContext = getContext<MapContext>("mapContext");
</script>

<AboutModal bind:visible={ui.aboutModalVisible}></AboutModal>

<ShareModal bind:visible={ui.shareModalVisible}></ShareModal>

<header
	class="text-wtr-blue absolute top-2 left-2 z-999 flex items-center gap-1 rounded-[8px] bg-white p-4 shadow-lg sm:top-5 sm:left-5"
>
	<button onclick={() => mapContext.resetState()}>
		<h1 class="mr-1 flex inline cursor-pointer gap-[1px] text-[20px] font-[700] text-shadow-[2px_2px_0_#eef]">
			{#each "Watertijdreis".split("") as letter, i (`${i}-${letter}`)}
				<span
					class="inline-block will-change-[transform,text-shadow,color]"
					class:wave={mapContext.historic.mapsLoaded}
					class:wave-loading={!mapContext.historic.mapsLoaded}
					style:animation=""
					style:animation-delay={i * 100 + "ms"}
				>
					{letter}
				</span>
			{/each}
		</h1>
	</button>

	<Button tabindex={1} onclick={() => ui.toggleAbout()} Icon={Info}>Over</Button>
	<Button tabindex={2} onclick={() => ui.toggleShare()} Icon={ShareFat}>Delen</Button>
</header>

<style>
	.wave {
		animation: wave 1000ms ease-in-out infinite alternate;
	}

	.wave-loading {
		animation: wave-loading 600ms ease-in-out infinite alternate;
	}

	@keyframes wave-loading {
		0% {
			color: var(--color-wtr-blue);
			opacity: 0;
		}
		100% {
			color: var(--color-wtr-blue);
			opacity: 1;
		}
	}

	@keyframes wave {
		0% {
			transform: translateY(0px);
			color: var(--color-wtr-lighter-blue);
			text-shadow: 1px 1px 0 #aaf;
		}
		100% {
			transform: translateY(-2.1px);
			color: var(--color-wtr-blue);
		}
	}
</style>
