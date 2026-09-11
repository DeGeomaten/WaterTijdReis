export const isApplePlatform = (): boolean => {
	if (typeof navigator === "undefined") return false;
	return /Mac|iPhone|iPad/.test(navigator.userAgent);
};
