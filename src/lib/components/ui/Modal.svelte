<script lang="ts">
	import { X } from "phosphor-svelte";
	import { fly } from "svelte/transition";
	import { tick } from "svelte";

	interface Props {
		visible: boolean;
		title?: string;
		opacity?: number;
		children?: import("svelte").Snippet;
	}

	let { visible = $bindable(), title, children, opacity = 100 }: Props = $props();

	let modalElement = $state<HTMLDivElement | null>(null);
	let firstFocusableElement = $state<HTMLElement | null>(null);
	let lastFocusableElement = $state<HTMLElement | null>(null);
	let clickStartedOnBackdrop = false;

	function close() {
		visible = false;
	}

	function handleGlobalKeyDown(e: KeyboardEvent) {
		if (!visible) return;

		if (e.key === "Escape") {
			close();
			return;
		}

		if (e.key === "Tab" && modalElement) {
			if (e.shiftKey) {
				if (document.activeElement === firstFocusableElement) {
					e.preventDefault();
					lastFocusableElement?.focus();
				}
			} else {
				if (document.activeElement === lastFocusableElement) {
					e.preventDefault();
					firstFocusableElement?.focus();
				}
			}
		}
	}

	function updateFocusableElements() {
		if (!modalElement) return;

		const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const focusableElements = modalElement.querySelectorAll<HTMLElement>(focusableSelectors);

		if (focusableElements.length > 0) {
			firstFocusableElement = focusableElements[0];
			lastFocusableElement = focusableElements[focusableElements.length - 1];
		}
	}

	$effect(() => {
		if (visible && modalElement) {
			updateFocusableElements();
			tick().then(() => {
				firstFocusableElement?.focus();
			});
		}
	});
</script>

<svelte:window onkeydown={handleGlobalKeyDown} />

{#if visible}
	<div
		class="bg-wtr-blue/66 fixed inset-0 z-2000 flex items-center justify-center bg-[url('/wave_pattern.png')] bg-size-[32px]"
		style:opacity={opacity + "%"}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onmousedown={(e) => (clickStartedOnBackdrop = e.target === e.currentTarget)}
		onclick={(e) => {
			if (e.target === e.currentTarget && clickStartedOnBackdrop) {
				close();
			}

			clickStartedOnBackdrop = false;
		}}
		onkeydown={(e) => {
			if (e.target === e.currentTarget && e.key === "Enter") close();
		}}
		transition:fly={{ y: -5, duration: 250 }}
	>
		<div
			bind:this={modalElement}
			class="
                relative z-10
                flex max-h-[90vh] w-[90vw]
                max-w-120 flex-col items-center
                rounded-[8px] border border-gray-200 bg-white shadow-lg
            "
			transition:fly={{ y: -20, duration: 250 }}
		>
			<button
				onclick={close}
				type="button"
				class="bg-wtr-pink/13 absolute top-4 right-4 rounded-[8px] p-2 opacity-50 transition-opacity hover:opacity-100"
				aria-label="Sluit venster"
			>
				<X size="24" color="var(--color-wtr-pink)" weight="bold" />
			</button>

			<div class="flex h-full w-full flex-col items-center overflow-auto overflow-x-hidden py-8">
				{#if title}
					<h1 class="text-wtr-blue w-full text-center text-[22px] font-[700]">{title}</h1>
				{/if}

				<div class="text-wtr-blue mt-2 p-8">
					{@render children?.()}
				</div>
			</div>
		</div>
	</div>
{/if}
