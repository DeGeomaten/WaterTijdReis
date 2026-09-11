<script lang="ts">
	import { fly } from "svelte/transition";

	interface Props {
		content?: string;
		children?: import("svelte").Snippet;
	}

	let { content = "", children }: Props = $props();

	const VISIBLE_TIME = 2500;
	let visible = $state(false);

	$effect(() => {
		if (content || children) {
			visible = true;

			const timeout = setTimeout(() => {
				visible = false;
			}, VISIBLE_TIME);

			return () => clearTimeout(timeout);
		}
	});
</script>

{#if visible}
	<div
		class="
            text-wtr-blue border-wtr-blue/7 bg-wtr-lighter-blue/13 fixed bottom-42
            left-1/2 z-999 -translate-x-1/2
            rounded-[8px] border-2 px-4 py-2
            text-center text-[14px] font-[500]
            shadow-[0_2px_2px_rgba(0,0,0,0.05)] shadow-lg backdrop-blur-md
        "
		role="status"
		aria-live="polite"
		transition:fly={{ y: 20, duration: 250 }}
	>
		{#if children}
			{@render children()}
		{:else}
			{content}
		{/if}
	</div>
{/if}
