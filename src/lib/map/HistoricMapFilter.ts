import type { Filter, HistoricMap } from "$lib/types/historicmap";

export interface FilterResult {
	mapsToColor: string[];
	mapsToDesaturate: string[];
	mapsToHide: string[];
	maxYear: number;
	adjustedYearEnd: number;
}

export function calculateFilteredMapIds(mapsByNumber: Map<number, HistoricMap[]>, filter: Filter): FilterResult {
	let maxYear = 0;
	const yearStart = Math.min(filter.yearEnd - 1, filter.yearStart);

	const mapsToColor: string[] = [];
	const mapsToDesaturate: string[] = [];

	mapsByNumber.forEach((sheets) => {
		let x1: number | undefined, y1: number | undefined;
		let x2: number | undefined, y2: number | undefined;
		const firstEdYearEnd = 1894;

		for (const sheet of sheets) {
			const { x, y, yearEnd: year, edition, bis, type, id } = sheet;
			maxYear = Math.max(maxYear, year);

			const maxYearFilter = filter.yearEnd > firstEdYearEnd ? filter.yearEnd : firstEdYearEnd;
			const periodFilter = filter.edition !== "All" || year <= maxYearFilter;
			const editionFilter = filter.edition === "All" || edition === filter.edition;
			const typeFilter = filter.type ? type === filter.type : !type;
			const bisFilter = filter.bis === true || !bis;

			const inScope = periodFilter && editionFilter && typeFilter && bisFilter;
			if (!inScope) continue;

			const stack = year >= yearStart && year <= filter.yearEnd ? mapsToColor : mapsToDesaturate;

			if (x1 === undefined) {
				stack.push(id);
				[x1, y1] = [x, y];
				if (!x1 && !y1) break;
			} else if (y1 && x === x1 && y === -y1) {
				stack.push(id);
				y1 = 0;
				if (!x1) break;
			} else if (x1 && !x2 && x === -x1) {
				stack.push(id);
				[x2, y2] = [x, y];
				if (!y1 && !y) break;
			} else if (y2 && x === x2 && y === -y2) {
				stack.push(id);
				y2 = 0;
				if (!y1) break;
			}
		}
	});

	const mapsToShow = new Set([...mapsToColor, ...mapsToDesaturate]);
	const adjustedYearEnd = Math.min(maxYear, filter.yearEnd);

	const allIds = new Set<string>();
	mapsByNumber.forEach((sheets) => sheets.forEach((s) => allIds.add(s.id)));
	const mapsToHide = Array.from(allIds).filter((id) => !mapsToShow.has(id));

	return {
		mapsToColor,
		mapsToDesaturate,
		mapsToHide,
		maxYear,
		adjustedYearEnd,
	};
}
