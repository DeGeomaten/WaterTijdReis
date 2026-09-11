<script lang="ts">
	import { spriteStore } from "../../utils/spriteSheet.svelte";

	let { id, height = undefined, width = undefined, className = "" } = $props();

	id = id.replace("-b", "");

	let sprite = $derived.by(() => {
		if (spriteStore.loading) return null;
		return spriteStore.getSprite(id);
	});

	let dimensions = $derived.by(() => {
		if (!sprite) {
			return {
				refWidth: width ? (typeof width === "number" ? `${width}px` : width) : `${128}px`,
				refHeight: height ? (typeof height === "number" ? `${height}px` : height) : `${104}px`,
				scaleFactor: 1,
				isReady: false,
			};
		}

		const originalWidth = sprite.width;
		const originalHeight = sprite.height;

		const targetWidthNumber = typeof width === "number" ? width : undefined;
		const targetHeightNumber = typeof height === "number" ? height : undefined;

		let scaleW = 0;
		let scaleH = 0;

		if (targetWidthNumber !== undefined) {
			scaleW = targetWidthNumber / originalWidth;
		}
		if (targetHeightNumber !== undefined) {
			scaleH = targetHeightNumber / originalHeight;
		}

		const validScales: number[] = [];

		if (scaleW > 0) {
			validScales.push(scaleW);
		}
		if (scaleH > 0) {
			validScales.push(scaleH);
		}

		let scaleFactor: number;

		if (validScales.length === 0) {
			scaleFactor = 1;
		} else {
			scaleFactor = Math.min(...validScales);
		}

		const finalWidthNumber = originalWidth * scaleFactor;
		const finalHeightNumber = originalHeight * scaleFactor;

		const refWidth = typeof width === "string" && width ? width : `${finalWidthNumber}px`;
		const refHeight = typeof height === "string" && height ? height : `${finalHeightNumber}px`;

		return {
			refWidth,
			refHeight,
			scaleFactor,
			isReady: true,
		};
	});

	let styleString = $derived.by(() => {
		if (!sprite || !dimensions.isReady) return "";

		const { refWidth, refHeight, scaleFactor } = dimensions;

		const scaledBackgroundX = sprite.x * scaleFactor;
		const scaledBackgroundY = sprite.y * scaleFactor;

		const totalSheetWidth = sprite.sheetWidth;
		const totalSheetHeight = sprite.sheetHeight;

		const scaledSheetWidth = totalSheetWidth * scaleFactor;
		const scaledSheetHeight = totalSheetHeight * scaleFactor;

		return [
			`width: ${refWidth}`,
			`height: ${refHeight}`,
			`background-image: url('${sprite.sourceImageUrl}')`,
			`background-position: -${scaledBackgroundX}px -${scaledBackgroundY}px`,
			`background-size: ${scaledSheetWidth}px ${scaledSheetHeight}px`,
			`background-repeat: no-repeat`,
		].join(";");
	});
</script>

<div class="thumbnail-wrapper {className}">
	{#if spriteStore.loading || !sprite}
		<div
			class="placeholder {spriteStore.loading ? 'loading' : 'error'}"
			style:width={dimensions.refWidth}
			style:height={dimensions.refHeight}
			title={!sprite ? "Kaart niet gevonden" : undefined}
		>
			{spriteStore.loading ? "Laden..." : "?"}
		</div>
	{:else}
		<div class="sprite-image" style={styleString} role="img" aria-label="Kaart thumbnail"></div>
	{/if}
</div>

<style>
	.thumbnail-wrapper {
		display: inline-block;
		overflow: hidden;
		background-color: #f0f0f0;
	}

	.sprite-image {
		display: block;
		background-repeat: no-repeat;
	}

	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
		font-size: 14px;
	}

	.loading {
		background-color: #e0e0e0;
		animation: pulse 1.5s infinite ease-in-out;
	}

	@keyframes pulse {
		0% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.6;
		}
	}
</style>
