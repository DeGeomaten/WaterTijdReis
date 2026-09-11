<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { MagnifyingGlass } from "phosphor-svelte";
	import { debounce } from "lodash-es";
	import type { GeojsonPoint } from "@allmaps/types";
	import { slide, fly } from "svelte/transition";

	type GeocoderGeoJsonFeature = {
		geometry: GeojsonPoint;
		properties: {
			provider: string;
			label: string;
			alt?: string;
		};
	};

	let { providers, visible = $bindable() } = $props();

	const mapContext = getContext<MapContext>("mapContext");

	let inputEl: HTMLInputElement | undefined = $state();
	let listEl: HTMLUListElement | undefined = $state();
	let inputValue = $state("");
	let featuresByProviderIndex: GeocoderGeoJsonFeature[][] = $state([]);
	let selectedFeatureIndex: number = $state(0);
	let firstResultsFetched: boolean = $state(false);

	let dialogElement = $state<HTMLDivElement>();
	let firstFocusableElement = $state<HTMLElement>();
	let lastFocusableElement = $state<HTMLElement>();

	let features: GeocoderGeoJsonFeature[] = $derived(dedupeFeatures(featuresByProviderIndex.flat(1)));

	function dedupeFeatures(features: GeocoderGeoJsonFeature[]) {
		const seen = new Map<string, GeocoderGeoJsonFeature>();

		for (const f of features) {
			const key = [
				f.properties.label
					.toLowerCase()
					.normalize("NFD")
					.replace(/\p{Diacritic}/gu, ""),
				Math.round(f.geometry.coordinates[0] * 1e5),
				Math.round(f.geometry.coordinates[1] * 1e5),
			].join("|");

			if (!seen.has(key)) {
				seen.set(key, f);
			}
		}

		return Array.from(seen.values());
	}

	const DEBOUNCE_WAIT_MS = 200;
	const DEBOUNCE_OPTIONS = {
		leading: false,
		trailing: true,
	};

	const getFeatures = debounce(
		async (text: string) => {
			if (!text || text.length < 2) {
				featuresByProviderIndex = [];
				return;
			}

			const promises = providers.map(async (provider) => {
				try {
					const results = await provider.getFeatures(text);
					return results.map((feature) => ({
						...feature,
						properties: {
							...feature.properties,
							provider: provider.name,
							label: cleanLabel(feature.properties.label),
						},
					}));
				} catch (e) {
					console.error(e);
					return [];
				}
			});

			featuresByProviderIndex = await Promise.all(promises);
			firstResultsFetched = true;
			selectedFeatureIndex = 0;
		},
		DEBOUNCE_WAIT_MS,
		DEBOUNCE_OPTIONS
	);

	$effect(() => {
		getFeatures(inputValue);
	});

	$effect(() => {
		if (visible) {
			inputEl?.focus();

			requestAnimationFrame(() => {
				updateFocusableElements();
			});
		} else {
			inputValue = "";
			firstResultsFetched = false;
			featuresByProviderIndex = [];
		}
	});

	function cleanLabel(label: string): string {
		return label.replace(/,\s*(nederland|the netherlands)$/i, "");
	}

	function confirmSelection(feature: GeocoderGeoJsonFeature) {
		mapContext.flyToFeature(feature);
		visible = false;
	}

	function scrollSelectedIntoView(index: number) {
		if (!listEl) return;
		const selectedEl = listEl.children[index] as HTMLElement;
		if (selectedEl) {
			selectedEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		e.stopPropagation();
		e.stopImmediatePropagation();

		if (e.key === "Escape") {
			visible = false;
			return;
		}

		if (features.length === 0) return;

		if (e.key === "Enter") {
			e.preventDefault();
			confirmSelection(features[selectedFeatureIndex]);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedFeatureIndex = Math.min(selectedFeatureIndex + 1, features.length - 1);
			scrollSelectedIntoView(selectedFeatureIndex);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedFeatureIndex = Math.max(selectedFeatureIndex - 1, 0);
			scrollSelectedIntoView(selectedFeatureIndex);
		}
	}

	function close() {
		visible = false;
	}

	function updateFocusableElements() {
		if (!dialogElement) return;

		const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const focusableElements = dialogElement.querySelectorAll(focusableSelectors);

		if (focusableElements.length > 0) {
			firstFocusableElement = focusableElements[0] as HTMLElement;
			lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;
		}
	}

	function trapFocus(e: KeyboardEvent) {
		if (!visible || e.key !== "Tab") return;

		if (e.shiftKey) {
			// Shift + Tab
			if (document.activeElement === firstFocusableElement) {
				e.preventDefault();
				lastFocusableElement?.focus();
			}
		} else {
			// Tab
			if (document.activeElement === lastFocusableElement) {
				e.preventDefault();
				firstFocusableElement?.focus();
			}
		}
	}
</script>

<svelte:document onkeydown={trapFocus} />

{#if visible}
	<div
		bind:this={dialogElement}
		class="fixed inset-0 z-1000 flex items-center justify-center"
		role="dialog"
		aria-modal="true"
	>
		<button
			type="button"
			class="bg-wtr-blue/66 absolute inset-0 cursor-default bg-[url('/wave_pattern.png')] bg-size-[32px]"
			aria-label="Sluit venster"
			onclick={(e) => {
				e.stopPropagation();
				close();
			}}
			transition:fly={{ y: -5, duration: 250 }}
		></button>

		<div
			class="
				absolute top-10 z-10 flex
				w-[94vw]
				flex-col overflow-hidden
				rounded-[8px] border-gray-200
				bg-white shadow-lg sm:top-1/4 sm:w-[600px] sm:max-w-[90vw]"
			transition:fly={{ y: -20, duration: 250 }}
		>
			<div class="border-wtr-subtle-blue relative w-full border-b">
				<div class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
					<MagnifyingGlass size="24" color="var(--color-wtr-pink)"></MagnifyingGlass>
				</div>

				<input
					bind:this={inputEl}
					bind:value={inputValue}
					onkeydown={handleKeydown}
					class="
						focus-ring-0 text-wtr-blue w-full bg-transparent px-4 py-4
						pr-12 pl-12 text-[18px] font-[500]
						placeholder:text-[#88a] focus:outline-none sm:text-[20px]
					"
					type="search"
					enterkeyhint="search"
					spellcheck="false"
					autocomplete="off"
					placeholder="Zoek een locatie..."
				/>
			</div>

			{#if inputValue !== ""}
				<ul
					bind:this={listEl}
					transition:slide={{ duration: 200 }}
					class="
						text-wtr-blue relative max-h-[50vh] w-full
						overflow-y-auto bg-white sm:max-h-[60vh]"
				>
					{#if features.length > 0}
						{#each features as feature, i (i)}
							<li class="w-full">
								<button
									type="button"
									id="geo-item-{i}"
									class="
										group flex w-full cursor-pointer items-center justify-between px-4
										py-3 text-left text-[16px] transition-colors
										duration-75 focus:outline-none
										{i === selectedFeatureIndex ? 'bg-wtr-subtle-blue/53 underline' : ''}
									"
									onmouseenter={() => (selectedFeatureIndex = i)}
									onclick={() => confirmSelection(feature)}
								>
									<div class="flex min-w-0 flex-col">
										<span class="truncate leading-tight font-medium">
											{feature.properties.label}
										</span>
										{#if feature.properties.alt}
											<span class="truncate text-[13px] text-gray-500">
												{feature.properties.alt}
											</span>
										{/if}
									</div>
								</button>
							</li>
						{/each}
					{:else}
						<li class="px-4 py-8 text-center text-sm text-gray-500">
							{#if firstResultsFetched}
								Geen resultaten gevonden voor "{inputValue}"
							{:else}
								Aan het zoeken...
							{/if}
						</li>
					{/if}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<style>
	input[type="search"]::-webkit-search-cancel-button {
		-webkit-appearance: none;
		appearance: none;
	}
</style>
