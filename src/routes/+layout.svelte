<script lang="ts">
	import { onMount } from "svelte";
	import "../app.css";
	import { UmamiAnalytics, trackPageView } from "@lukulent/svelte-umami";
	import { env } from "$env/dynamic/public";

	let { children } = $props();

	const websiteID = env.PUBLIC_UMAMI_WEBSITE_ID;
	const srcURL = env.PUBLIC_UMAMI_SRC;

	onMount(() => {
		trackPageView();
	});
</script>

{@render children()}

{#if websiteID && srcURL}
	<UmamiAnalytics
		{websiteID}
		{srcURL}
		configuration={{
			"data-auto-track": false,
		}}
	/>
{/if}
