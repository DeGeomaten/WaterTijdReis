<script>
	let { year } = $props();
</script>

<div class="pointer-events-none absolute -top-1.5 left-1/2 z-[1000] -translate-x-1/2">
	<svg width="80" height="120" viewBox="0 0 80 120" fill="var(--color-wtr-subtle-blue)" class="drop-shadow-md">
		<line x1="40" y1="0" x2="40" y2="120" stroke="var(--color-wtr-subtle-blue)" stroke-width="1" />

		<rect x="18" y="0" width="48" height="20" rx="3" />

		<path d="M 20 0 L 10 10 L 20 20 Z" />

		<path d="M 33 20 L 40 26 L 47 20 Z" />

		<text x="40" y="15" fill="var(--color-wtr-blue)" font-size="14" font-weight="600" text-anchor="middle">
			{year}
		</text>
	</svg>
</div>
