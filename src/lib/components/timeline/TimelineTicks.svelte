<script lang="ts">
	let {
		width,
		height,
		pixelsPerYear,
		startYearInt,
		endYearInt,
		minYear,
		maxYear,
		selectedYear = $bindable(),
		filterStartYear,
		editions = [],
		hasMoved,
		getX,
	}: {
		width: number;
		height: number;
		pixelsPerYear: number;
		startYearInt: number;
		endYearInt: number;
		minYear: number;
		maxYear: number;
		selectedYear: number;
		filterStartYear: number;
		editions?: any[];
		hasMoved: boolean;
		getX: (year: number) => number;
	} = $props();

	const timelineTickColor = "#eef";

	let ticks = $derived.by(() => {
		let major = "",
			medium = "",
			minor = "";
		const hMajor = 10;
		const hMedium = 10 - 5 * Math.max(0, (9 - pixelsPerYear) / 2);
		const hMinor = 5;

		for (let year = startYearInt; year <= endYearInt; year++) {
			const x = getX(year);
			if (year % 25 === 0) {
				major += `M${x},0 L${x},${hMajor} `;
			} else if (year % 5 === 0 && pixelsPerYear > 7) {
				medium += `M${x},0 L${x},${hMedium} `;
			} else if (pixelsPerYear > 3) {
				minor += `M${x},0 L${x},${hMinor} `;
			}
		}
		return { major, medium, minor };
	});

	function handleYearClick(year: number) {
		if (year >= minYear && year <= maxYear) {
			selectedYear = year;
		}
	}
</script>

<svg class="pointer-events-none absolute inset-0 z-999 h-full w-full cursor-grab">
	<defs>
		<filter id="hardShadow" x="-50%" y="-50%" width="200%" height="200%">
			<feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="1" />
		</filter>
	</defs>

	{#if filterStartYear > minYear}
		{@const x = getX(filterStartYear)}
		<line
			x1={x}
			y1={0}
			x2={x}
			y2={height}
			stroke="var(--color-wtr-subtle-blue)"
			stroke-width={2}
			stroke-dasharray="4 2"
		/>
	{/if}

	<rect
		x="0"
		y="0"
		{width}
		{height}
		fill="transparent"
		style="cursor: pointer; pointer-events: auto;"
		onclick={(e) => {
			if (hasMoved) return;
			const rect = e.currentTarget.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const clickedYear = Math.round(startYearInt + (clickX / width) * (endYearInt - startYearInt));
			handleYearClick(clickedYear);
		}}
	/>

	{#if pixelsPerYear > 3}
		<path d={ticks.minor} stroke-width="1.5" class="stroke-wtr-subtle-blue/53" opacity={1 - (5 - pixelsPerYear) / 2} />
	{/if}
	{#if pixelsPerYear > 7}
		<path d={ticks.medium} stroke-width="1.5" class="stroke-wtr-subtle-blue/53" opacity={1 - (9 - pixelsPerYear) / 2} />
	{/if}

	<path d={ticks.major} class="stroke-wtr-subtle-blue/53" stroke-width="1.5" />

	{#each { length: endYearInt - startYearInt + 1 } as _, i (i)}
		{@const year = startYearInt + i}
		{@const x = getX(year)}

		{#if year % 25 === 0}
			<text
				x={x - 14}
				y={22}
				font-size="12"
				font-weight="700"
				fill={timelineTickColor}
				onclick={() => handleYearClick(year)}
				style="cursor: pointer; pointer-events: auto;">{year}</text
			>
		{:else if year % 5 === 0 && pixelsPerYear > 7}
			<text
				x={x - 14}
				y={22}
				font-size="12"
				fill={timelineTickColor}
				opacity={1 - (9 - pixelsPerYear) / 2}
				onclick={() => handleYearClick(year)}
				style="cursor: pointer; pointer-events: auto;">{year}</text
			>
		{:else if pixelsPerYear > 35}
			<text
				x={x - 14}
				y={22}
				font-size="12"
				fill={timelineTickColor}
				opacity={1 - (38 - pixelsPerYear) / 3}
				onclick={() => handleYearClick(year)}
				style="cursor: pointer; pointer-events: auto;">{year}</text
			>
		{/if}
	{/each}

	{#each editions as ed, i (i)}
		{@const lineY = i % 2 === 0 ? 110 : 108}
		{@const start = getX(ed.yearStart)}
		{@const middle = getX((ed.yearStart + ed.yearEnd) / 2)}
		{@const end = getX(ed.yearEnd)}
		<g filter="url(#hardShadow)">
			<line
				x1={start}
				y1={lineY}
				x2={start}
				y2={lineY - 5}
				class="stroke-wtr-subtle-blue/53"
				stroke-width="1"
				opacity="0.4"
			/>
			<line
				x1={start}
				y1={lineY}
				x2={middle - 25}
				y2={lineY}
				class="stroke-wtr-subtle-blue/53"
				stroke-width="1"
				opacity="0.4"
			/>
			<line
				x1={middle + 25}
				y1={lineY}
				x2={end}
				y2={lineY}
				class="stroke-wtr-subtle-blue/53"
				stroke-width="1"
				opacity="0.4"
			/>
			<text
				x={middle}
				y={lineY + 4}
				font-size="12"
				font-weight="600"
				class="fill-wtr-subtle-blue/53"
				text-anchor="middle"
				style="pointer-events: none;">{ed.name}</text
			>
			<line
				x1={end}
				y1={lineY}
				x2={end}
				y2={lineY - 5}
				class="stroke-wtr-subtle-blue/53"
				stroke-width="1"
				opacity="0.4"
			/>
		</g>
	{/each}
</svg>
