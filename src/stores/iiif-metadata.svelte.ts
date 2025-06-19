export async function getIIIFManifest(editions = ['editie-1', 'editie-2', 'editie-3','editie-4','editie-5']) {
	const results = await Promise.allSettled(editions.map(edition => fetch(`/metadata-${edition}.json`).then(res => res.json())));
	const manifests: Record<string,any> = {}
	results.forEach((result, index) => {
		if(result.status === 'fulfilled') {
			manifests[editions[index]] = result.value;
		} else {
			console.error(`Error fetching ${editions[index]}.json:`,result.reason);
		}
	});
	return manifests;
}

export async function getIIIFMetadata() {
	const promises: Promise<any>[] = [...Array(5)].map((_, index) => fetch(`/metadata-editie-${index+1}.json`).then(res => res.json()));
	const results = await Promise.allSettled(promises);
	const metadata: Record<string, any> = {};
	results.forEach((result, index) => {
		if(result.status === 'fulfilled') {
			metadata[`editie-${index+1}`] = result.value;
		} else {
			console.error(`Error fetching metadata-editie-${index+1}.json:`,result.reason);
			metadata[`editie-${index+1}`] = null;
		}
	});
	return metadata;
}