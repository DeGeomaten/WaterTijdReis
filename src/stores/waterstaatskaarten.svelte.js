import { WarpedMapLayer } from '@allmaps/maplibre';
import { mapStore } from '../stores/mapStore.svelte'

export const WATERSTAATSKAART_EDITIES = 
    new Array(9)
        .fill(0)
        .map((_,i) => 'editie_'+(i/2+1|0)+(i%2?'bis':'')); // excuses

export const WATERSTAATSKAART_URLS = WATERSTAATSKAART_EDITIES
    .map(i => `https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/${i}/latest.json`)

export const MANIFEST_FILEPATHS = [
    'modified_01-1874-389916.json',
    'modified_02-1874-456650.json',
    'modified_03-1874-455650.json',
    'modified_04-1874-456550.json',
    'modified_05-1874-456551.json',
    'modified_06-1874-456552.json',
    'modified_07-1874-456588.json',
    'modified_08-1874-456553.json',
    'modified_09-1874-456827.json'
]

export const layers = Array(9).fill(0).map(_ => new WarpedMapLayer());

export async function loadAnnotations() {
    const annotationList = await Promise.all(
        WATERSTAATSKAART_URLS.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            return await response.json();
        })
    );
    return annotationList;
}

export async function loadMetadata() {
    const metadataList = await Promise.all(
        MANIFEST_FILEPATHS.map(async (path) => {
            const response = await fetch('/iiif-manifests/' + path);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
            }
            return await response.json();
        })
    );
    return metadataList;
}

// export async function() {

// }

