<script lang="ts">
	import { Gradient } from "phosphor-svelte";

	interface Props {
		value?: number;
		onchange?: (val: number) => void;
	}

	let { value = $bindable(50), onchange }: Props = $props();

	let trackEl = $state<HTMLDivElement | null>(null);
	let sliderElement = $state<HTMLDivElement | null>(null);
	let dragging = $state(false);
	let hasFocus = $state(false);

	function updateFromEvent(e: PointerEvent) {
		if (!trackEl) return;
		const rect = trackEl.getBoundingClientRect();

		const clientX = e.clientX;

		const px = Math.min(Math.max(clientX - rect.left, 0), rect.width);
		value = Math.round((px / rect.width) * 100);

		if (onchange) onchange(value);
	}

	function onPointerMove(e: PointerEvent) {
		if (dragging) updateFromEvent(e);
	}

	function onPointerUp() {
		dragging = false;
		if (onchange) onchange(value);

		window.removeEventListener("pointermove", onPointerMove as EventListener);
		window.removeEventListener("pointerup", onPointerUp);
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;

		dragging = true;
		updateFromEvent(e);

		window.addEventListener("pointermove", onPointerMove as EventListener);
		window.addEventListener("pointerup", onPointerUp);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
			e.preventDefault();
			value = Math.max(0, value - 5);
			if (onchange) onchange(value);
		} else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
			e.preventDefault();
			value = Math.min(100, value + 5);
			if (onchange) onchange(value);
		}
	}

	$effect(() => {
		return () => {
			window.removeEventListener("pointermove", onPointerMove as EventListener);
			window.removeEventListener("pointerup", onPointerUp);
		};
	});
</script>

<div class="flex flex-col gap-0 select-none">
	<div class="text-wtr-blue text-sm font-[600]">
		<Gradient color="var(--color-wtr-pink)" size="20" class="mr-1 inline" />
		{value}%
	</div>

	<div
		bind:this={sliderElement}
		class="
            group relative flex h-6
            cursor-pointer items-center
            outline-none active:scale-[0.99]
        "
		style="touch-action: none"
		onpointerdown={onPointerDown}
		onkeydown={handleKeyDown}
		onfocus={() => (hasFocus = true)}
		onblur={() => (hasFocus = false)}
		tabindex="0"
		role="slider"
		aria-valuenow={value}
		aria-valuemin="0"
		aria-valuemax="100"
		aria-label="Doorzichtigheid"
	>
		<div bind:this={trackEl} class="relative h-2 w-full rounded-full bg-black/13">
			<div class="bg-wtr-blue absolute top-0 left-0 h-full rounded-full" style:width={`${value}%`}></div>

			<div
				class="
                    bg-wtr-blue shadow-wtr-blue/33 absolute top-1/2 h-4.5
                    w-4.5 -translate-y-1/2 rounded-full shadow-[2px_2px_8px]
                    transition-transform duration-300
                    {dragging ? 'scale-90' : ''}
                    {hasFocus ? 'ring-wtr-pink ring-2 ring-offset-2' : ''}
                "
				style:left={`calc(${value}% - 9px)`}
			></div>
		</div>
	</div>
</div>
