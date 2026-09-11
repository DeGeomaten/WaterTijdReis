const activeAnimations = {};

export function animateFeatureOpacity(map, id, prop, endVal, duration, callback) {
	const animKey = `${id}-${prop}`;

	if (activeAnimations[animKey]) {
		cancelAnimationFrame(activeAnimations[animKey]);
	}

	const startTime = performance.now();

	const currentState = map.getFeatureState({ source: "map-outlines", id: id });
	const startVal = currentState?.[prop] !== undefined ? currentState[prop] : 0;

	if (Math.abs(startVal - endVal) < 0.01) {
		delete activeAnimations[animKey];
		if (callback) callback();
		return;
	}

	function frame(currentTime) {
		const elapsed = currentTime - startTime;
		let progress = elapsed / duration;
		if (progress > 1) progress = 1;

		const currentVal = startVal + (endVal - startVal) * progress;

		map.setFeatureState({ source: "map-outlines", id }, { [prop]: currentVal });

		if (progress < 1) {
			activeAnimations[animKey] = requestAnimationFrame(frame);
		} else {
			delete activeAnimations[animKey];
			if (callback) callback();
		}
	}

	activeAnimations[animKey] = requestAnimationFrame(frame);
}
