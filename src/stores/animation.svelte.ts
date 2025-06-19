export function lerp(start:number, end: number, factor: 0 | 1 | number): number {
	 const isValidInterpolationFactor = factor >= 0 && factor <= 1;
	 if(!isValidInterpolationFactor) throw new RangeError("Interpolation factor must be between 0 and 1.");
    return start + (end - start) * factor;
}

export function easeOutBounce(value: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (value < 1 / d1) return n1 * value * value;
    else if (value < 2 / d1) return n1 * (value -= 1.5 / d1) * value + 0.75;
    else if (value < 2.5 / d1) return n1 * (value -= 2.25 / d1) * value + 0.9375;
    else return n1 * (value -= 2.625 / d1) * value + 0.984375;
}

export function easeInCubic(value: number): number {
    return value * value * value;
}

export function easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
}