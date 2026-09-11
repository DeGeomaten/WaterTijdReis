<script lang="ts">
	import { browser } from "$app/environment";
	import type { Component } from "svelte";
	import { mousePosition } from "$lib/state/mousePosition.svelte";

	interface Props {
		Icon: Component<any>;
		kbd?: string;
		children?: import("svelte").Snippet;
		onclick?: (e: MouseEvent) => void;
		collapsed?: boolean;
		collapseAfterRender?: boolean;
		collapseAfterRenderDelay?: number;
		openOnHover?: boolean;
		tabindex?: number;
	}

	let {
		Icon,
		kbd = undefined, // Keyboard shortcut to display
		children,
		onclick,
		collapsed = $bindable(false),
		collapseAfterRender = true,
		collapseAfterRenderDelay = 2000,
		openOnHover = true,
		tabindex = undefined,
	}: Props = $props();

	const isTouch = browser && window.matchMedia("(pointer: coarse)").matches;
	let computedKbd = $state(kbd);

	$effect(() => {
		if (kbd && browser) {
			const isApplePlatform = /Mac|iPhone|iPad/.test(navigator.userAgent);
			computedKbd = isApplePlatform ? kbd : kbd.replace("⌘", "Ctrl ");
		}
	});

	let buttonEl = $state<HTMLButtonElement | null>(null);
	let slotEl = $state<HTMLDivElement | null>(null);

	let expandedWidth = $state(0);
	let buttonRect = $state({ left: 0, top: 0, width: 0, height: 0 });
	let hoverdelay: ReturnType<typeof setTimeout> | null = null;

	let mounted: boolean = $state(false);

	$effect(() => {
		if (collapseAfterRender) {
			const timer = setTimeout(() => (collapsed = true), collapseAfterRenderDelay);
			return () => clearTimeout(timer);
		}
	});

	$effect(() => {
		if (!slotEl) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.borderBoxSize?.[0]) {
					expandedWidth = entry.borderBoxSize[0].inlineSize;

					if (!mounted) {
						requestAnimationFrame(() => {
							mounted = true;
						});
					}
				}
			}
		});
		ro.observe(slotEl);
		return () => ro.disconnect();
	});

	function updateRect() {
		if (buttonEl) buttonRect = buttonEl.getBoundingClientRect();
	}

	$effect(() => {
		if (!buttonEl) return;

		const ro = new ResizeObserver(updateRect);
		ro.observe(buttonEl);

		window.addEventListener("scroll", updateRect, { capture: true, passive: true });
		window.addEventListener("resize", updateRect, { passive: true });

		return () => {
			ro.disconnect();
			window.removeEventListener("scroll", updateRect, { capture: true });
			window.removeEventListener("resize", updateRect);
		};
	});

	$effect(() => {
		if (!buttonEl) return;

		const x = mousePosition.x;
		const y = mousePosition.y;

		const centerX = buttonRect.left + buttonRect.width / 2;
		const centerY = buttonRect.top + buttonRect.height / 2;

		const dist = Math.hypot(x - centerX, y - centerY);
		const threshold = 300;

		if (dist < threshold) {
			buttonEl.style.setProperty("--x", `${x - buttonRect.left}px`);
			buttonEl.style.setProperty("--y", `${y - buttonRect.top}px`);
			buttonEl.style.setProperty("--grad-opacity", "1");
		} else {
			buttonEl.style.setProperty("--x", `${-1000}px`);
			buttonEl.style.setProperty("--y", `${-1000}px`);
			buttonEl.style.setProperty("--grad-opacity", "1");
		}
	});
</script>

<button
	bind:this={buttonEl}
	{onclick}
	onmouseenter={() => {
		if (!isTouch && openOnHover) {
			hoverdelay = setTimeout(() => (collapsed = false), 500);
		}
	}}
	onmouseleave={() => {
		if (!isTouch && openOnHover) {
			collapsed = true;
			if (hoverdelay) clearTimeout(hoverdelay);
		}
	}}
	{tabindex}
	class="
        group text-wtr-blue relative
        cursor-pointer rounded-[9px]
        font-[500] backdrop-blur-sm transition-all
        duration-500 ease-out active:scale-95
    "
	style:--grad-opacity="0"
>
	<div
		class="pointer-events-none absolute inset-0 rounded-[9px] transition-opacity duration-500"
		style:opacity="var(--grad-opacity)"
		style:background="radial-gradient(circle at var(--x, 50%) var(--y, 50%), #ff44aa66 0%, #eeeeff88 80%)"
	></div>

	<div class="relative z-10 m-0.5 flex items-center rounded-[8px] bg-white px-2.25 py-2 shadow-lg hover:bg-white/90">
		<Icon
			color="var(--color-wtr-lighter-blue)"
			weight="regular"
			class="drop-shadow-wtr-blue/13 inline h-5.5 w-5.5 drop-shadow-[1px_1px_0] transition-opacity duration-300 group-hover:opacity-100"
		/>

		<div
			class="overflow-hidden transition-[width] duration-300 ease-out"
			style:width="{collapsed ? 0 : expandedWidth}px"
			style:transition={mounted ? undefined : "none"}
		>
			<div
				bind:this={slotEl}
				class="flex origin-left items-center whitespace-nowrap transition-all delay-100 duration-500 ease-out"
				style:width="max-content"
				style:transform={`translateX(${collapsed ? -6 : 0}px) scaleX(${collapsed ? 85 : 100}%)`}
				style:opacity={collapsed ? 0 : 1}
				style:padding={collapsed ? "0px" : "0 4px"}
			>
				<span class="ml-1">
					{@render children?.()}
				</span>

				{#if computedKbd}
					<kbd
						class="
                        border-wtr-subtle-blue ml-1 flex items-center rounded-[4px] border bg-white
                        px-1 font-sans text-[12px] text-[#cce]
                        shadow-[0px_2px_0px_0px_#cce] select-none
                        "
					>
						<span>{computedKbd}</span>
					</kbd>
				{/if}
			</div>
		</div>
	</div>
</button>
