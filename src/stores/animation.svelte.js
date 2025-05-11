export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function easeOutBounce(x) {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    else if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    else if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    else return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

export function easeInCubic(x) {
    return x * x * x;
}

export function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
}