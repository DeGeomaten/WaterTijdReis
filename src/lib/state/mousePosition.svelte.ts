export const mousePosition = $state({
	x: Infinity,
	y: Infinity,
});

let ticking = false;

export function updateMousePosition(e: PointerEvent) {
	if (!ticking) {
		requestAnimationFrame(() => {
			mousePosition.x = e.clientX;
			mousePosition.y = e.clientY;
			ticking = false;
		});
		ticking = true;
	}
}
