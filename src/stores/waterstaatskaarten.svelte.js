import { WarpedMapLayer } from '@allmaps/maplibre';
import { WarpedMapEvent, WarpedMapEventType } from '@allmaps/render';
import { mapStore } from '../stores/mapStore.svelte'
import { timelineStore } from './timelineStore.svelte';


export const WATERSTAATSKAART_EDITIES = Array(9)
        .fill(0)
        .map((_,i) => 'editie_'+(i/2+1|0)+(i%2?'bis':'')); // excuses

// export const WATERSTAATSKAART_URLS = WATERSTAATSKAART_EDITIES
    // .map(i => `https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/${i}/latest.json`)

export const WATERSTAATSKAART_URLS = [
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/01-1874-389916-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/02-1874-456650-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/03-1874-455650-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/04-1874-456550-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/05-1874-456551-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/06-1874-456552-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-georef.json',
    'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-georef.json',

]


export const MANIFEST_FILEPATHS = [
    'metadata-editie_1.json',
    'metadata-editie_2.json',
    'metadata-editie_3.json',
    'metadata-editie_4.json',
    'metadata-editie_5.json',
]

export class WSK {
    constructor(maplibreInstance) {
        this.layer = new WarpedMapLayer('waterstaatskaarten');
        maplibreInstance.addLayer(this.layer);

        this.maps = [];

        this.loaded = false;
        this.loadingProgress = 0;

        setTimeout(() => console.log(this.maps, this.layer), 1000);

        fetch('/iiif-manifests/modified_01-1874-389916.json')
            .then(response => response.json())
            .then(i => console.log(i));

        const getOrCreateMap = id => this.getMapByID(id) || 
            (this.maps.push({ id: id }) && this.maps[this.maps.length - 1]);

        const warpedMapsById = this.layer.renderer?.warpedMapList.warpedMapsById;
        const tileCache = this.layer.renderer?.tileCache;

        this.layer.renderer.warpedMapList.addEventListener(
            WarpedMapEventType.WARPEDMAPADDED,
            event => {
                const map = getOrCreateMap(event.data);
                const warpedMap = warpedMapsById.get(event.data);
                map.warpedMap = warpedMap;
                map.mask = warpedMap?.geoMask;
                map.maskBbox = warpedMap?.geoMaskBbox;

                if(warpedMapsById.size >= this.maps.length) { // TODO: werkt dit altijd?
                    setInterval(() => {
                        this.updateVisibleMaps();
                        maplibreInstance.triggerRepaint();
                    }, 250);
                }

                // if(this.getMapByID(warpedMap.mapId).edition != 'editie_1')
                //     warpedMap.visible = false;
            }
        )

        tileCache.addEventListener(
            WarpedMapEventType.MAPTILELOADED,
            event => {
                const map = warpedMapsById.get(event.data.mapId);
                this.loadingProgress = 1 - (tileCache.tilesFetchingCount / warpedMapsById.size);
                // console.log(this.loadingProgress * 100, tileCache.tilesFetchingCount);
            }
        )

        this.layer.renderer?.tileCache.addEventListener(
            WarpedMapEventType.ALLREQUESTEDTILESLOADED,
            event => {
                this.loaded = true;
            }
        )

        loadMetadata2()
            .then(metadata => {
                metadata.forEach((data, edition) => {
                    edition = WATERSTAATSKAART_EDITIES[edition];

                    console.log(edition, data.items.length);

                    for (const item of data.items) {
                        const sourceId = item.items[0].items[0].body.service[0].id;
                        if (sourceId == "https://objects.library.uu.nl/fcgi-bin/iipsrv.fcgi?IIIF=/manifestation/viewer/39/29/42/39294249383937169156628404605415851040.jp2") continue;
                        if (sourceId == "https://objects.library.uu.nl/fcgi-bin/iipsrv.fcgi?IIIF=/manifestation/viewer/91/40/41/91404157775464304833428299750087167267.jp2") continue;
                        if(!item.metadata) continue;

                        const map = getOrCreateMap(sourceId);
                        map.edition = edition;
                        map.metadata = {};
                        for (let i of item.metadata) {
                            const label = i.label.en;
                            const value = i.value.en || i.value.cy; // TODO: waarom is er een item met cy?
                            if(!Array.isArray(value)) console.log(i);
                            map.metadata[label] = value[0];
                        }
                        map.year = 
                                +map.metadata.bijgewerkt ||
                                +map.metadata.bewerkt || // TODO: welke volgorde?
                                +map.metadata.verkend ||
                                +map.metadata.herzien ||
                                +map.metadata.uitgave ||
                                +map.metadata.basis;
                    }
                })
            })
            .then(() => {
                loadAnnotations()
                    .then(annotations => {
                        annotations.forEach((ann, i) => {
                            this.layer.addGeoreferenceAnnotation(ann);

                            for (const item of ann.items) {
                                const map = this.getMapByID(item.target.source.id);
                                if(!map) continue;
                                this.getMapByID(item.target.source.id).id = item.id;
                            }
                        });
                    })
                    .then(() => {
                        loadMetadata()
                            .then(metadata => {
                                metadata.flat().forEach(item => {
                                    if (!item.mapId) return;

                                    const map = getOrCreateMap(item.mapId);
                                    if(map.metadata) map.metadata.titel = item.titel;
                                })
                            })
                    })
            });

        //     .then(() => {
        //         loadAnnotations()
        //             .then(annotations => this.annotations = annotations)
        //             .then(() => this.annotations.forEach((ann, i) => {
        //                 this.layer.addGeoreferenceAnnotation(ann);

        //                 for (let item of ann.items) {
        //                     const map = getOrCreateMap(item.id);
        //                     map.edition = WATERSTAATSKAART_EDITIES[i];
        //                 }
        //             }))
        //             .then(() => {

        //             })
        //     })
    }

    updateVisibleMaps() {
        const inRange = map => 
            map.year && map.year >= timelineStore.startYear && map.year <= timelineStore.endYear;
        
        const mapsInRange = this.maps
            .filter(inRange)
            .sort((a, b) => b.year - a.year);

        this.maps.forEach(map => map.warpedMap.visible = inRange(map));

        for (const map of mapsInRange) {
            const rtree = this.layer.renderer.warpedMapList.rtree;
            const bbox = rtree.bboxesById.get(map.id);
            rtree?.searchFromBbox([
                bbox[0] + .05,
                bbox[1] + .05,
                bbox[2] - .05,
                bbox[3] - .05
            ])
            .map(i => this.getMapByID(i))
            .filter(i => i.year < map.year)
            .forEach(i => i.warpedMap.visible = false);
        }

        if (mapStore.selectedMap) {
            mapStore.selectedMap.warpedMap.visible = true;
        }
    }

    // updateVisibleMaps() {
    //     this.maps.forEach(map => map.warpedMap.visible = true);

    //     const mapsInRange = this.maps
    //         .filter(map => map.year >= timelineStore.startYear && map.year <= timelineStore.endYear)
    //         .sort((a,b) => b.year - a.year) // new > old!

    //     for(const map of mapsInRange) {
    //         const rtree = this.layer.renderer.warpedMapList.rtree;
    //         const bbox = rtree.bboxesById.get(map.id);

    //         const currentFeature = {
    //             type: 'Feature',
    //             properties: {},
    //             geometry: rtree?.polygonsById.get(map.id)
    //         }

    //         const candidates = rtree.searchFromBbox(bbox)
    //             .filter(id => this.getMapByID(id).year > map.year)
    //             .map(id => ({
    //                 type: 'Feature',
    //                 properties: {},
    //                 geometry: rtree?.polygonsById.get(id)
    //             }))

    //         console.log(candidates.length)
            
    //         let totalOverlapArea = 0;
    //         const currentArea = area(currentFeature);
                
    //         for(const candidateFeature of candidates) {
    //             const overlap = intersect({
    //                 type: "FeatureCollection",
    //                 features: [currentFeature, candidateFeature]
    //             })

    //             if(overlap) {
    //                 totalOverlapArea += area(overlap);

    //                 if (totalOverlapArea / currentArea > 0.95) {
    //                     map.warpedMap.visible = false;
    //                     break; 
    //                 }
    //             }
    //         }
    //     }

    //     console.log(this.maps.filter(map => map.warpedMap.visible));
    // }

    getMapByID(id) {
        return this.maps.find(m => m.id === id);
    }

    getMapsByEdition(edition) {
        return this.maps.filter(m => m.edition === edition);
    }

    getMapsByGeoPosition(lon, lat) {
        const warpedMapList = this.layer.renderer?.warpedMapList;
        if (!warpedMapList) return [];
        const results = warpedMapList.rtree.searchFromPoint([lon, lat], true);
        return results
            .filter(i => warpedMapList.warpedMapsById.get(i).visible)
            .map(i => this.getMapByID(i));
    }

    // getMapsByScreenPosition(x, y) {
    //     const map = mapStore.getMap();
    //     if (!map) return [];
    //     const lngLat = map.unproject([x, y]);
    //     return this.getMapsByGeoPosition(lngLat.lat, lngLat.lng);
    // }
} 

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

const IIIF_MANIFEST_URLS = [
    'iiif-manifests/modified_01-1874-389916.json',
    'iiif-manifests/modified_02-1874-456650.json',
    'iiif-manifests/modified_03-1874-455650.json',
    'iiif-manifests/modified_04-1874-456550.json',
    'iiif-manifests/modified_05-1874-456551.json', 
    'iiif-manifests/modified_06-1874-456552.json',
    'iiif-manifests/modified_07-1874-456588.json',
    'iiif-manifests/modified_08-1874-456553.json',
    'iiif-manifests/modified_09-1874-456827.json'
]

export async function loadMetadata2() {
    const metadataAll = await Promise.all(
        IIIF_MANIFEST_URLS.map(async (path) => {
            const response = await fetch(path);
            if (!response.ok) 
                throw new Error(`Failed to fetch ${path}: ${response.statusText}`);

            return await response.json();
        })
    );
    return metadataAll;
}

export async function loadMetadata() {
    const metadataList = await Promise.all(
        MANIFEST_FILEPATHS.map(async (path) => {
            const response = await fetch(path);
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

