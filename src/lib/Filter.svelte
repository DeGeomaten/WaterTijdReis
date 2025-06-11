<script>
  import { filterStore } from '../stores/filterStore.svelte';
  import { Accordion, Popover, Separator, Slider, Checkbox, Label, useId } from "bits-ui";
  import cn from "clsx";
  import { timelineStore } from "../stores/timelineStore.svelte";

  import Check from "phosphor-svelte/lib/Check";
  import Minus from "phosphor-svelte/lib/Minus";
  import Funnel from "phosphor-svelte/lib/Funnel";
  import X from "phosphor-svelte/lib/X"
  import CaretDown from "phosphor-svelte/lib/CaretDown";

  import { fade } from 'svelte/transition';
  import { mapStore } from '../stores/mapStore.svelte';

  let visibleEditions = $derived([]);

  $effect(() => {
    for(let i in mapStore.visibleLayers) 
      mapStore.visibleLayers[i] = visibleEditions.includes(i);

    if(filterStore.yearRange) {
      for(const editie in mapStore.warpedMapLayers) {
        const layer = mapStore.warpedMapLayers[editie];
        if(!layer || !mapStore.visibleLayers[editie]) continue;
        const warpedMapList = layer.renderer.warpedMapList;
        const warpedMaps = Array.from(warpedMapList.warpedMapsById.values());
        const warpedMapYears = warpedMaps.map(m => {
          const metadata = Object.values(mapStore.metadata).flat().find(i => i.mapId == m.mapId);
          if(!metadata) return;
          const year = +metadata.hz || +metadata.bw;
          return { map: m, year }
        })

        // const warpedMapHide = warpedMapYears.filter(m => m.year < filterStore.yearMin || m.year > filterStore.yearMax);
        // const warpedMapShow = warpedMapYears.filter(m => !warpedMapHide.includes(m));
        // console.log(warpedMapHide, warpedMapShow);
        // layer.renderer.warpedMapList.hideMaps(warpedMapHide.map(m => m.mapId));
        // layer.renderer.warpedMapList.showMaps(warpedMapShow.map(m => m.mapId));

        warpedMapYears.forEach(({ map, year }) => {
          if(year > 1800 && year < new Date().getFullYear())
            map.visible = !(year < filterStore.yearRange[0] || year > filterStore.yearRange[1]);
        })
      }
    }
  })
</script>

<link rel="stylesheet" href="https://use.typekit.net/dwr8fxs.css">


<style>
	@import url("https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap");
	@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");
	
	@import "tailwindcss";
	@plugin "tailwindcss-animate";
	
	@custom-variant dark (&:is(.dark *));
	
	@font-face {
		font-family: "Cal Sans";
		font-style: normal;
		font-weight: 600;
		font-display: swap;
		src: url("/CalSans-SemiBold.woff2") format("woff2");
	}
	
	:root {
		/* Colors */
		--background: hsl(0 0% 100%);
		--background-alt: hsl(0 0% 100%);
		--foreground: hsl(0 0% 9%);
		--foreground-alt: hsl(0 0% 32%);
		--muted: hsl(240 5% 96%);
		--muted-foreground: hsla(0 0% 9% / 0.4);
		--border: hsl(240 6% 10%);
		--border-input: hsla(240 6% 10% / 0.17);
		--border-input-hover: hsla(240 6% 10% / 0.4);
		--border-card: hsla(240 6% 10% / 0.1);
		--dark: hsl(240 6% 10%);
		--dark-10: hsla(240 6% 10% / 0.1);
		--dark-40: hsla(240 6% 10% / 0.4);
		--dark-04: hsla(240 6% 10% / 0.04);
		--accent: hsl(204 94% 94%);
		--accent-foreground: hsl(204 80% 16%);
		--destructive: hsl(347 77% 50%);
		--tertiary: hsl(37.7 92.1% 50.2%);
		--line: hsl(0 0% 100%);
	
		/* black */
		--contrast: hsl(0 0% 0%);
	
		/* Shadows */
		--shadow-mini: 0px 1px 0px 1px rgba(0, 0, 0, 0.04);
		--shadow-mini-inset: 0px 1px 0px 0px rgba(0, 0, 0, 0.04) inset;
		--shadow-popover: 0px 7px 12px 3px hsla(var(--dark-10));
		--shadow-kbd: 0px 2px 0px 0px rgba(0, 0, 0, 0.07);
		--shadow-btn: 0px 1px 0px 1px rgba(0, 0, 0, 0.03);
		--shadow-card: 0px 2px 0px 1px rgba(0, 0, 0, 0.04);
		--shadow-date-field-focus: 0px 0px 0px 3px rgba(24, 24, 27, 0.17);
	}
	
	.dark {
		/* Colors */
		--background: hsl(0 0% 5%);
		--background-alt: hsl(0 0% 8%);
		--foreground: hsl(0 0% 95%);
		--foreground-alt: hsl(0 0% 70%);
		--muted: hsl(240 4% 16%);
		--muted-foreground: hsla(0 0% 100% / 0.4);
		--border: hsl(0 0% 96%);
		--border-input: hsla(0 0% 96% / 0.17);
		--border-input-hover: hsla(0 0% 96% / 0.4);
		--border-card: hsla(0 0% 96% / 0.1);
		--dark: hsl(0 0% 96%);
		--dark-40: hsl(0 0% 96% / 0.4);
		--dark-10: hsl(0 0% 96% / 0.1);
		--dark-04: hsl(0 0% 96% / 0.04);
		--accent: hsl(204 90% 90%);
		--accent-foreground: hsl(204 94% 94%);
		--destructive: hsl(350 89% 60%);
		--line: hsl(0 0% 9.02%);
		--tertiary: hsl(61.3 100% 82.2%);
		/* white */
		--contrast: hsl(0 0% 100%);
	
		/* Shadows */
		--shadow-mini: 0px 1px 0px 1px rgba(0, 0, 0, 0.3);
		--shadow-mini-inset: 0px 1px 0px 0px rgba(0, 0, 0, 0.5) inset;
		--shadow-popover: 0px 7px 12px 3px hsla(0deg 0% 0% / 30%);
		--shadow-kbd: 0px 2px 0px 0px rgba(255, 255, 255, 0.07);
		--shadow-btn: 0px 1px 0px 1px rgba(0, 0, 0, 0.2);
		--shadow-card: 0px 2px 0px 1px rgba(0, 0, 0, 0.4);
		--shadow-date-field-focus: 0px 0px 0px 3px rgba(244, 244, 245, 0.1);
	}
	
	@theme inline {
		--color-background: var(--background);
		--color-background-alt: var(--background-alt);
		--color-foreground: var(--foreground);
		--color-foreground-alt: var(--foreground-alt);
		--color-muted: var(--muted);
		--color-muted-foreground: var(--muted-foreground);
		--color-border: var(--border-card);
		--color-border-input: var(--border-input);
		--color-border-input-hover: var(--border-input-hover);
		--color-border-card: var(--border-card);
		--color-dark: var(--dark);
		--color-dark-10: var(--dark-10);
		--color-dark-40: var(--dark-40);
		--color-dark-04: var(--dark-04);
		--color-accent: var(--accent);
		--color-accent-foreground: var(--accent-foreground);
		--color-destructive: var(--destructive);
		--color-tertiary: var(--tertiary);
		--color-line: var(--line);
		--color-contrast: var(--contrast);
	
		--shadow-mini: var(--shadow-mini);
		--shadow-mini-inset: var(--shadow-mini-inset);
		--shadow-popover: var(--shadow-popover);
		--shadow-kbd: var(--shadow-kbd);
		--shadow-btn: var(--shadow-btn);
		--shadow-card: var(--shadow-card);
		--shadow-date-field-focus: var(--shadow-date-field-focus);
	
		--text-xxs: 10px;
	
		--radius-card: 16px;
		--radius-card-lg: 20px;
		--radius-card-sm: 10px;
		--radius-input: 9px;
		--radius-button: 5px;
		--radius-5px: 5px;
		--radius-9px: 9px;
		--radius-10px: 10px;
		--radius-15px: 15px;
	
		--spacing-input: 3rem;
		--spacing-input-sm: 2.5rem;
	
		--breakpoint-desktop: 1440px;
	
		--animate-accordion-down: accordion-down 0.2s ease-out;
		--animate-accordion-up: accordion-up 0.2s ease-out;
		--animate-caret-blink: caret-blink 1s ease-out infinite;
		--animate-scale-in: scale-in 0.2s ease;
		--animate-scale-out: scale-out 0.15s ease;
		--animate-fade-in: fade-in 0.2s ease;
		--animate-fade-out: fade-out 0.15s ease;
		--animate-enter-from-left: enter-from-left 0.2s ease;
		--animate-enter-from-right: enter-from-right 0.2s ease;
		--animate-exit-to-left: exit-to-left 0.2s ease;
		--animate-exit-to-right: exit-to-right 0.2s ease;
	
		--font-sans: "Inter", "sans-serif";
		--font-mono: "Source Code Pro", "monospace";
		--font-alt: "Courier", "sans-serif";
		--font-display: "ivypresto-display", "sans-serif";
	
		@keyframes accordion-down {
			from {
				height: 0;
			}
			to {
				height: var(--bits-accordion-content-height);
			}
		}
	
		@keyframes accordion-up {
			from {
				height: var(--bits-accordion-content-height);
			}
			to {
				height: 0;
			}
		}
	
		@keyframes caret-blink {
			0%,
			70%,
			100% {
				opacity: 1;
			}
			20%,
			50% {
				opacity: 0;
			}
		}
	
		@keyframes enter-from-right {
			from {
				opacity: 0;
				transform: translateX(200px);
			}
			to {
				opacity: 1;
				transform: translateX(0);
			}
		}
	
		@keyframes enter-from-left {
			from {
				opacity: 0;
				transform: translateX(-200px);
			}
			to {
				opacity: 1;
				transform: translateX(0);
			}
		}
	
		@keyframes exit-to-right {
			from {
				opacity: 1;
				transform: translateX(0);
			}
			to {
				opacity: 0;
				transform: translateX(200px);
			}
		}
	
		@keyframes exit-to-left {
			from {
				opacity: 1;
				transform: translateX(0);
			}
			to {
				opacity: 0;
				transform: translateX(-200px);
			}
		}
	
		@keyframes scale-in {
			from {
				opacity: 0;
				transform: rotateX(-10deg) scale(0.9);
			}
			to {
				opacity: 1;
				transform: rotateX(0deg) scale(1);
			}
		}
	
		@keyframes scale-out {
			from {
				opacity: 1;
				transform: rotateX(0deg) scale(1);
			}
			to {
				opacity: 0;
				transform: rotateX(-10deg) scale(0.95);
			}
		}
	
		@keyframes fade-in {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
	
		@keyframes fade-out {
			from {
				opacity: 1;
			}
			to {
				opacity: 0;
			}
		}
	}
	
	@layer base {
		*,
		::after,
		::before,
		::backdrop,
		::file-selector-button {
			border-color: var(--color-border-card, currentColor);
		}
	
		* {
			@apply border-border;
		}
		html {
			-webkit-text-size-adjust: 100%;
			font-variation-settings: normal;
			scrollbar-color: var(--bg-muted);
		}
	
		body {
			@apply bg-background text-foreground;
			font-feature-settings:
				"rlig" 1,
				"calt" 1;
		}
	
		::selection {
			background: #fdffa4;
			color: black;
		}
	}
	
	@layer components {
		*:not(body):not(.focus-override) {
			outline: none !important;
			&:focus-visible {
				@apply focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-1;
			}
		}
	
		.link {
			@apply hover:text-foreground/80 focus-visible:ring-foreground focus-visible:ring-offset-background rounded-xs focus-visible:outline-hidden inline-flex items-center gap-1 font-medium underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-offset-2;
		}
	}

	.filter-container {
		position: fixed;
		left: 0px;
		padding: 20px 10px;
		z-index: 100;
	}
</style>

<div class="filter-container" style:bottom={timelineStore.size + 'px'}>
  <Popover.Root>
    <Popover.Trigger
      class="rounded-[4px] outline-2 outline-[#4466ff22] bg-[#224] text-[#fff] shadow-mini hover:border-4-[#ffffff44] inline-flex h-10 select-none items-center justify-center whitespace-nowrap px-[21px] text-[14px] font-medium transition-all hover:cursor-pointer active:scale-[0.98]"
    >
      <Funnel class="size-[12px]"/>
      <span class="relative left-[4px]">Filter kaarten</span>

    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content
        class="relative left-[10px] z-1000 outline-2 outline-[#4466ff22] bg-background shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-in-from-bottom-[-20px] data-[state=open]:slide-in-from-bottom-[20px] data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-30 w-full max-w-[328px] rounded-[4px] p-4"
        side="top"
        sideOffset={8}
      >
        <div class="flex items-center">
            <div
              class="mr-3 flex size-12 items-center justify-center rounded-full"
            >
            <Funnel class="size-[18px]"/>
            </div>
            <div class="flex flex-col">
              <h4 class="text-[17px] font-semibold leading-5 tracking-[-0.01em]">
                Filter kaarten
              </h4>
              <p class="text-muted-foreground text-sm font-medium">
                Filter de kaarten
              </p>
            </div>
          </div>
            <Separator.Root class="bg-dark-10 -mx-4 mb-6 mt-[17px] block h-px" />
            <Checkbox.Group
              class="flex flex-col gap-3"
              bind:value={visibleEditions}
              name="notifications"
            >
              <Checkbox.GroupLabel class="text-foreground-alt text-sm font-medium">
                Waterstaatskaartedities
              </Checkbox.GroupLabel>
                <div class="flex flex-col gap-2.5">
                  {@render MyCheckbox({ label: "1e editie", value: "editie_1" })}
                  <!-- {@render MyCheckbox({ label: "1e editie (BIS)", value: "editie_1bis" })} -->
                  {@render MyCheckbox({ label: "2e editie", value: "editie_2" })}
                  <!-- {@render MyCheckbox({ label: "2e editie (BIS)", value: "editie_2bis" })} -->
                  {@render MyCheckbox({ label: "3e editie", value: "editie_3" })}
                  <!-- {@render MyCheckbox({ label: "3e editie (BIS)", value: "editie_3bis" })} -->
                  {@render MyCheckbox({ label: "4e editie", value: "editie_4" })}
                  <!-- {@render MyCheckbox({ label: "4e editie (BIS)", value: "editie_4bis" })} -->
                  {@render MyCheckbox({ label: "5e editie", value: "editie_5" })}
                </div>
            </Checkbox.Group>
            <div class="flex items-center pb-2 pt-8">
              <div class="mr-2 flex items-center">
                <div class="relative mr-2">
            <Slider.Root type="multiple" min={filterStore.yearMin} max={filterStore.yearMax} bind:value={filterStore.yearRange} class="relative flex w-full mb-5 touch-none select-none items-center">
              <span class="bg-[#88a] relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full">
                <Slider.Range class="bg-foreground absolute h-full" />
              </span>
              <Slider.Thumb index={0}
                class={cn(
                  "border-border-input bg-background hover:border-dark-40 focus-visible:ring-foreground dark:bg-foreground dark:shadow-card focus-visible:outline-hidden data-active:scale-[0.98] data-active:border-dark-40 block size-[25px] cursor-pointer rounded-full border shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                )}
              />
              <Slider.Thumb index={1}
                class={cn(  
                  "border-border-input bg-background hover:border-dark-40 focus-visible:ring-foreground dark:bg-foreground dark:shadow-card focus-visible:outline-hidden data-active:scale-[0.98] data-active:border-dark-40 block size-[25px] cursor-pointer rounded-full border shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                )}
              />

              <Slider.Tick index={0} />
              <Slider.Tick index={1} />
            </Slider.Root>
            <input
            id="yearStart" 
            min={filterStore.yearMin} max={filterStore.yearMax}
            class="h-input rounded-10px border-border-input bg-background text-foreground w-[119px] border pl-10 pr-2 text-base sm:text-sm"
            type="number"
            bind:value={filterStore.yearRange[0]}
            name="name"
              />
            <span>-</span>
            <input
            id="yearEnd"
            min={filterStore.yearMin} max={filterStore.yearMax}
            class="h-input rounded-10px border-border-input bg-background text-foreground w-[119px] border pl-10 pr-2 text-base sm:text-sm"
            type="number"
            bind:value={filterStore.yearRange[1]}
            name="name"
              />
                </div>
              </div>
            </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>

  {#if filterStore.yearRange[0] > filterStore.yearMin || filterStore.yearRange[0] < filterStore.yearEnd}
    <button transition:fade class="rounded-[4px] outline-2 outline-[#4466ff22] bg-[#fff] text-[#224] shadow-mini hover:border-4-[#ffffff44] inline-flex h-10 select-none items-center justify-center whitespace-nowrap px-[21px] text-[15px] font-medium transition-all hover:cursor-pointer active:scale-[0.98]">
    <span class="relative right-2 hover:text-[#f55]"><X size="14"/></span>
      [{filterStore.yearRange[0]} - {filterStore.yearRange[1]}]
    </button>
  {/if}

  <!-- <div class="inline-flex">
    <ArrowRightIcon size="12"/> 
    <span class="top-[-4]">102 kaarten</span>
  </div> -->
</div>

{#snippet MyCheckbox({ value, label, disabled })}
  {@const id = useId()}
  <div class="flex items-center">
    <Checkbox.Root
      {id} {disabled}
      aria-labelledby="{id}-label"
      class="border-muted bg-foreground data-[state=unchecked]:border-border-input data-[state=unchecked]:bg-background data-[state=unchecked]:hover:border-dark-40 peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]"
      name="hello"
      {value}
    >
      {#snippet children({ checked, indeterminate })}
        <div class="text-background inline-flex items-center justify-center">
          {#if indeterminate}
            <Minus class="size-[15px]" weight="bold" />
          {:else if checked}
            <Check class="size-[15px]" weight="bold" />
          {/if}
        </div>
      {/snippet}
    </Checkbox.Root>
    <Label.Root
      id="{id}-label"
      for={id}
      class="pl-3 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {label} 
	 	{#if mapStore.metadata[value.replace('-', '_')]}
		<span class="text-[#888]">
	  ({mapStore.metadata[value.replace('-', '_')].filter(i => {
      const year = +i.hz || +i.bw;
      return year >= filterStore.yearRange[0] && year <= filterStore.yearRange[1]
      
    }).length + mapStore.metadata[value.replace('-', '_')].filter(i => {
      const year = +i.hz || +i.bw;
      return !(year > 1800 && year < new Date().getFullYear())
    }).length} kaarten)
		</span>
	  {/if}
    </Label.Root>
  </div>
{/snippet}