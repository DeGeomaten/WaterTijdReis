<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import * as turf from "@turf/turf";
	import { draw, fade } from "svelte/transition";

	const mapContext = getContext<MapContext>("mapContext");

	let previewHistoricMap = $derived.by(() => {
		const visibleMaps = mapContext.historic.visibleMapsInViewport;
		if (visibleMaps && visibleMaps.size === 1) {
			return visibleMaps.values().next().value;
		}
		return null;
	});

	let activeHistoricMap = $derived.by(() => {
		return (
			mapContext.historic.clickedHistoricMap ||
			mapContext.historic.selectedMap ||
			previewHistoricMap ||
			(mapContext.sheetIndexVisible ? mapContext.historic.hoveredHistoricMap : null)
		);
	});

	let width: number = $state(160);
	let height: number = $state(200);

	let polygons = $derived.by(() => {
		if (!mapContext.historic.mapsLoaded || !mapContext.historic.visibleMaps) return [];

		const mapArray = Array.from(mapContext.historic.visibleMaps.values());
		return mapArray.map((i) => ({
			id: i.id,
			type: "Feature" as const,
			geometry: turf.toMercator(structuredClone(i.polygon)),
		}));
	});

	let viewBox = $derived.by(() => {
		if (!polygons.length) return [0, 0, 160, 200];

		const bbox = turf.bbox({
			type: "FeatureCollection",
			features: polygons,
		});

		const viewWidth = bbox[2] - bbox[0] || 1;
		const viewHeight = bbox[3] - bbox[1] || 1;
		const paddingX = viewWidth * 0.075;
		const paddingY = viewHeight * 0.075;

		return [bbox[0] - paddingX, bbox[1] - paddingY, viewWidth + paddingX * 2, viewHeight + paddingY * 2];
	});

	let scaleFactor = $derived(viewBox[2] / width || 1);

	function getPolygonFill(polyId: string): string {
		const isActive = activeHistoricMap?.id === polyId;
		if (isActive) return "#ff44aaaa";

		const isVisibleInViewport =
			!mapContext.historic.selectedMap && mapContext.historic.visibleMapsInViewport?.has(polyId);

		return isVisibleInViewport ? "#ff44aa44" : "#ff44aa11";
	}

	let viewport = $derived.by(() => {
		if (!mapContext.viewportPolygon) return null;
		return turf.toMercator(mapContext.viewportPolygon);
	});

	let viewportRect = $derived.by(() => {
		if (!viewport || mapContext.historic.selectedMap) return null;

		const minXClamp = viewBox[0] + scaleFactor * 2;
		const minYClamp = viewBox[1] + scaleFactor * 2;
		const maxXClamp = viewBox[0] + viewBox[2] - 4 * scaleFactor;
		const maxYClamp = viewBox[1] + viewBox[3] - 4 * scaleFactor;

		const clipped = (viewport.geometry.coordinates[0] as [number, number][]).map(([x, y]) => [
			Math.min(Math.max(x, minXClamp), maxXClamp),
			Math.min(Math.max(y, minYClamp), maxYClamp),
		]);

		const xs = clipped.map((c) => c[0]);
		const ys = clipped.map((c) => c[1]);

		const x = Math.min(...xs);
		const y = Math.min(...ys);

		return {
			x,
			y,
			width: Math.max(...xs) - x,
			height: Math.max(...ys) - y,
		};
	});

	let arrowPaths = $derived.by(() => {
		if (!activeHistoricMap) return null;

		const targetPoly = polygons.find((p) => p.id === activeHistoricMap.id);
		const centerPoint = targetPoly ? turf.centerOfMass(targetPoly).geometry.coordinates : [0, 0];

		const x1 = centerPoint[0];
		const y1 = centerPoint[1];
		const x2 = viewBox[0] + viewBox[2] / 2;
		const y2 = viewBox[1] - viewBox[3] * 0.03;

		const strokeWidth = scaleFactor * 2;
		const angle = Math.atan2(y2 - y1, x2 - x1);
		const ah = strokeWidth * 5;

		const leftX = x2 - ah * Math.cos(angle) + ah * 0.5 * Math.sin(angle);
		const leftY = y2 - ah * Math.sin(angle) - ah * 0.5 * Math.cos(angle);

		const rightX = x2 - ah * Math.cos(angle) - ah * 0.5 * Math.sin(angle);
		const rightY = y2 - ah * Math.sin(angle) + ah * 0.5 * Math.cos(angle);

		return {
			strokeWidth,
			leftArm: `M ${x1} ${y1} L ${x2} ${y2} L ${leftX} ${leftY}`,
			rightArm: `M ${x1} ${y1} L ${x2} ${y2} L ${rightX} ${rightY}`,
		};
	});

	function getProjectedPoints(coordinates: [number, number][]): string {
		return coordinates.map((coord) => coord.join(",")).join(" ");
	}
</script>

{#if mapContext.historic.visibleMaps && mapContext.historic.visibleMaps.size}
	<svg
		{width}
		{height}
		viewBox={viewBox.join(" ")}
		class="drop-shadow-wtr-blue/50 pointer-events-none absolute bottom-32 left-2 z-[998] origin-bottom-left scale-80 touch-none drop-shadow-[1px_1px_0px] transition-transform duration-300 hover:scale-100 sm:right-8"
	>
		<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})">
			<!-- POLYGONS -->
			{#each polygons as poly (poly.id)}
				<polygon
					points={getProjectedPoints(poly.geometry.coordinates[0])}
					fill={getPolygonFill(poly.id)}
					stroke="#ff44aa"
					stroke-width={scaleFactor * 1.33}
					class="transition-fill duration-250"
				/>
			{/each}

			<!-- VIEWPORT RECTANGLE -->
			{#if viewportRect}
				<rect
					x={viewportRect.x}
					y={viewportRect.y}
					width={viewportRect.width}
					height={viewportRect.height}
					fill="none"
					class="stroke-wtr-blue/30"
					stroke-width={scaleFactor * 4}
					rx={scaleFactor * 2}
					ry={scaleFactor * 2}
				/>
			{/if}

			<!-- ARROW POINTING TO ACTIVE MAP -->
			{#if arrowPaths}
				<g out:fade={{ duration: 250 }}>
					{#key activeHistoricMap?.id}
						<path
							in:draw={{ duration: 250 }}
							fill="none"
							stroke="var(--color-wtr-lighter-blue)"
							stroke-width={arrowPaths.strokeWidth}
							d={arrowPaths.leftArm}
						/>
						<path
							in:draw={{ duration: 250 }}
							fill="none"
							stroke="var(--color-wtr-lighter-blue)"
							stroke-width={arrowPaths.strokeWidth}
							d={arrowPaths.rightArm}
						/>
					{/key}
				</g>
			{/if}
		</g>
	</svg>
{/if}
