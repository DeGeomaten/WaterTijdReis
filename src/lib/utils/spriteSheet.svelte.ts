export interface SpriteData {
	imageId: string;
	allmapsId: string;
	scaleFactor: number;
	x: number;
	y: number;
	width: number;
	height: number;
	spriteTileScale: number;
}

export interface SpriteSheetSource {
	jsonUrl: string;
	imageUrl: string;
	sheetWidth: number;
	sheetHeight: number;
}

type MappedSprite = SpriteData & {
	sourceImageUrl: string;
	sheetWidth: number;
	sheetHeight: number;
};

export class SpriteSheet {
	loading = $state(false);
	error = $state<string | null>(null);

	private sprites = new Map<string, MappedSprite>();

	private initialized = false;

	constructor(private sources: SpriteSheetSource[]) {}

	async init() {
		if (this.initialized) return;

		// await (ms => new Promise(res => setTimeout(res, ms)))(4000);

		this.loading = true;
		this.error = null;

		try {
			const responses = await Promise.all(this.sources.map((src) => fetch(src.jsonUrl)));

			for (const r of responses) {
				if (!r.ok) throw new Error(`HTTP Error: ${r.status}`);
			}

			const jsonArrays: SpriteData[][] = await Promise.all(responses.map((r) => r.json()));

			jsonArrays.forEach((sprites, index) => {
				const source = this.sources[index];

				for (const sprite of sprites) {
					this.sprites.set(sprite.allmapsId, {
						...sprite,
						sourceImageUrl: source.imageUrl,
						sheetWidth: source.sheetWidth,
						sheetHeight: source.sheetHeight,
					});
				}
			});

			this.initialized = true;
		} catch (err) {
			console.error("SpriteSheet laadfout:", err);
			this.error = err instanceof Error ? err.message : String(err);
		} finally {
			this.loading = false;
		}
	}

	getSprite(id: string): MappedSprite | undefined {
		return this.sprites.get(id);
	}
}

const sources: SpriteSheetSource[] = [
	{
		jsonUrl: "./sprites/regular-sheets-128.json",
		imageUrl: "./sprites/regular-sheets-128.jpg",
		sheetWidth: 3072,
		sheetHeight: 3078,
	},
	{
		jsonUrl: "./sprites/special-sheets-128.json",
		imageUrl: "./sprites/special-sheets-128.jpg",
		sheetWidth: 1792,
		sheetHeight: 1951,
	},
];

export const spriteStore = new SpriteSheet(sources);
