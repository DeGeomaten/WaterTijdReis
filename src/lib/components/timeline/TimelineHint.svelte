<script lang="ts">
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { HandGrabbing } from "phosphor-svelte";

	const HINT_KEY = "timeline_hint_shown";
	let showHint = $state(false);

	export function hideHint() {
		if (showHint) {
			showHint = false;
			localStorage.setItem(HINT_KEY, "true");
		}
	}

	onMount(() => {
		if (typeof window !== "undefined" && !localStorage.getItem(HINT_KEY)) {
			showHint = true;
			const timer = setTimeout(hideHint, 8000);
			return () => clearTimeout(timer);
		}
	});
</script>

{#if showHint}
	<div
		class="to-wtr-blue absolute inset-0 z-2000 flex flex-col items-center justify-center bg-gradient-to-b from-transparent"
		onpointerenter={hideHint}
		onmousedown={hideHint}
		onwheel={hideHint}
		transition:fade={{ duration: 500 }}
	>
		<div class="hand-animation">
			<HandGrabbing size={25} color="#fff" class="drop-shadow-wtr-blue drop-shadow-[1px_1px_0]" />
		</div>
		<p class="text-wtr-subtle-blue mt-4 text-[14px] font-semibold text-shadow-[1px_1px_0_#000]">
			Sleep de tijdlijn om door de tijd te reizen
		</p>
	</div>
{/if}

<style>
	@keyframes wiggle {
		0%,
		100% {
			transform: translateX(0);
		}
		20%,
		60% {
			transform: translateX(-50px);
		}
		40%,
		80% {
			transform: translateX(50px);
		}
	}
	.hand-animation {
		animation: wiggle 4s ease-in-out infinite;
	}
</style>
