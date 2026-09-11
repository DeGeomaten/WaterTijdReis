export function getUserLocation(): Promise<{ lat: number; lng: number }> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error("Geolocation is not supported."));
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
			(error) => reject(error),
			{ enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
		);
	});
}

/**
 * Fallback via IP-adres als GPS faalt
 */
export async function getFallbackIPLocation(): Promise<{ lat: number; lng: number }> {
	const res = await fetch("https://ipapi.co/json/");
	if (!res.ok) throw new Error("IP location failed");
	const data = await res.json();
	return { lat: data.latitude, lng: data.longitude };
}

/**
 * Centraal startpunt: probeert GPS, dan IP.
 * Gooit een foutmelding als de locatie buiten NL ligt.
 */
export async function getValidUserLocation(): Promise<{ lat: number; lng: number }> {
	let loc: { lat: number; lng: number };

	try {
		loc = await getUserLocation();
	} catch {
		loc = await getFallbackIPLocation();
	}

	if (!isInNL(loc.lat, loc.lng)) {
		throw new Error("OUT_OF_BOUNDS");
	}

	return loc;
}

export function isInNL(lat: number, lng: number): boolean {
	const NL_BBOX = { minLat: 50.5, maxLat: 53.7, minLng: 3.0, maxLng: 7.5 };
	return lat >= NL_BBOX.minLat && lat <= NL_BBOX.maxLat && lng >= NL_BBOX.minLng && lng <= NL_BBOX.maxLng;
}
