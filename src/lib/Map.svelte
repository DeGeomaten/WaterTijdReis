<script>
  import maplibre from 'maplibre-gl';
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import HoveredMap from './HoveredMap.svelte';
  import LayersPanel from './LayersPanel.svelte';

  import { mapStore } from '../stores/mapStore.svelte';
  import { WSK } from '../stores/waterstaatskaarten.svelte';

	import { timelineStore } from '../stores/timelineStore.svelte';
	import SheetOverlayNew from './SheetOverlayNew.svelte';

	let map;
  let waterStaatsKaarten; 

	$effect(() => {
		if (!map) map = initMap();
		if (!mapStore.loaded) return;

		setBaseMapVisibility(mapStore.showBaseMap);
		setLabelVisibility(mapStore.showLabels);
		setWaterVisibility(mapStore.showWater);
		setAHNVisibility(mapStore.showAHN);
		setOSMVisibility(mapStore.showOSM);
		setProvVisibility(mapStore.showProv);
		setLuchtVisibility(mapStore.showLucht);
		setWTScVisibility(mapStore.showWTSc);

		if (timelineStore.hoveredMap && timelineStore.hoveredMap.visible) {
			showWarpedMapOutline(timelineStore.hoveredMap.geoMask);

			const unprojected = map.unproject({ x: timelineStore.hoverX, y: timelineStore.hoverY });
			showLineToUIElement({
				type: 'LineString',
				coordinates: [
					[unprojected.lng, unprojected.lat],
					[
						(timelineStore.hoveredMap.geoMaskBbox[0] + timelineStore.hoveredMap.geoMaskBbox[2]) / 2,
						(timelineStore.hoveredMap.geoMaskBbox[1] + timelineStore.hoveredMap.geoMaskBbox[3]) / 2
					]
				]
			});
		} else {
			hideWarpedMapOutline();
			hideWarpedMapFullOutline();
			hideLineToUIElement();
		}
	});

	function initMap() {
		const m = new maplibre.Map({
			container: 'map',
			style: 'style.json',
			crossSourceCollisions: false,
			attributionControl: false,
			center: [4.55, 52.23],
			zoom: 6,
			maxPitch: 0,
			preserveDrawingBuffer: true // TODO: is this a requirement for allmaps?
		});

		m.on('load', () => {
      waterStaatsKaarten = mapStore.waterStaatsKaarten = new WSK(m);

			initWarpedMapHighlight();
			initWarpedMapFullHighlight();
			initLineToUIElement();

			m.addSource('dsm-05', {
				type: 'raster',
				tiles: [
					'https://service.pdok.nl/rws/ahn/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image/png&STYLES=&TRANSPARENT=TRUE&LAYERS=dsm_05m&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}'
				],
				tileSize: 256
			});
			m.addLayer({
				id: 'dsm-05-layer',
				type: 'raster',
				source: 'dsm-05',
				layout: {
					visibility: 'none'
				},
				paint: {}
			});

			m.addSource('osm-tiles', {
				type: 'raster',
				tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
				tileSize: 256,
				attribution: '© OpenStreetMap contributors'
			});

			m.addLayer({
				id: 'osm-base',
				type: 'raster',
				source: 'osm-tiles',
				layout: {
					visibility: 'none'
				},
				paint: {}
			});

			m.addSource('provincies-wms', {
				type: 'raster',

				tiles: [
					'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=TRUE&LAYERS=Provinciegebied&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX={bbox-epsg-3857}'
				],
				tileSize: 256
			});

			m.addLayer({
				id: 'Provinciegebied',
				type: 'raster',
				source: 'provincies-wms',
				layout: {
					visibility: 'none'
				},
				paint: {}
			});

			m.addSource('luchtfoto', {
				type: 'raster',
				tiles: [
					'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=TRUE&LAYERS=Actueel_orthoHR&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX={bbox-epsg-3857}'
				],
				tileSize: 256
			});

			m.addLayer({
				id: 'luchtfoto-layer',
				type: 'raster',
				source: 'luchtfoto',
				layout: {
					visibility: 'none'
				},
				paint: {}
			});

			m.addSource('waterschappen-wms', {
				type: 'raster',
				tiles: [
					'https://service.pdok.nl/hwh/waterschapsgrenzenimso/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image%2Fpng&STYLES=&TRANSPARENT=TRUE&LAYERS=Waterschap&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG%3A3857&BBOX={bbox-epsg-3857}'
				],
				tileSize: 256
			});

			m.addLayer({
				id: 'waterschapsgrenzen',
				type: 'raster',
				source: 'waterschappen-wms',
				layout: {
					visibility: 'none'
				},
				paint: {}
			});

			m.addLayer({
				id: 'custom-water-layer',
				type: 'fill',
				source: 'carto',
				'source-layer': 'water',
				paint: {
					'fill-color': 'rgb(159, 203, 227)',
					'fill-opacity': 1
				},
				layout: {
					visibility: 'none'
				}
			});

			// VOORWAARDE: BaseLayer moet altijd baselayer blijven! en onderaan blijven staan

			const labelLayers = m.getStyle().layers.slice(67, 67 + 26);
			for (let layer of labelLayers) {
				layer = structuredClone(layer);
				layer.id += '-custom-label';
				m.addLayer(layer);
			}
		});

		m.on('click', onpointerclick);
    m.on('mousemove', onpointermove);
    m.on('mouseout', onmouseout);
    m.on('idle', () => { m.triggerRepaint() })
    m.on('move', () => {
      // resetHoveredMap();
      if(mapStore.hoveredMap) setHoveredMap(mapStore.hoveredMap)
    })

    m.on('zoom', e => {
      const zoom = m.getZoom();
      if(zoom < 9) {
        if(performance.now() - selectedMapTime > 2500) resetSelectedMap();
      }
    })

		return m;
	}

	function exportMapAsPNG(filename = 'map.png') {
		const canvas = map.getCanvas();
		const dataURL = canvas.toDataURL('image/png');

		const link = document.createElement('a');
		link.href = dataURL;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	function setLayerVisibility(layerId, visible) {
		map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
	}

	function setBaseMapVisibility(visible) {
		map.getStyle().layers.forEach((layer) => {
			map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
		});
	}

	function setLabelVisibility(visible) {
		const labelLayers = map.getStyle().layers.filter((i) => i.id.includes('-custom-label'));
		console.log(labelLayers);
		for (let layer of labelLayers) {
			map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
		}
	}

	function setWaterVisibility(visible) {
		map.setLayoutProperty('custom-water-layer', 'visibility', visible ? 'visible' : 'none');
	}

	function setAHNVisibility(visible) {
		map.setLayoutProperty('dsm-05-layer', 'visibility', visible ? 'visible' : 'none');
	}

	function setOSMVisibility(visible) {
		map.setLayoutProperty('osm-base', 'visibility', visible ? 'visible' : 'none');
	}

	function setProvVisibility(visible) {
		map.setLayoutProperty('Provinciegebied', 'visibility', visible ? 'visible' : 'none');
	}

	function setLuchtVisibility(visible) {
		map.setLayoutProperty('luchtfoto-layer', 'visibility', visible ? 'visible' : 'none');
	}

	function setWTScVisibility(visible) {
		map.setLayoutProperty('waterschapsgrenzen', 'visibility', visible ? 'visible' : 'none');
	}

	const MAP_HIGHLIGHT_TRANSITION_DURATION = 500;

	function initWarpedMapHighlight() {
		map.addSource('warpedmap-highlight', {
			type: 'geojson',
			data: {
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [] }
			}
		});

		map.addLayer({
			id: 'warpedmap-highlight-glow',
			type: 'line',
			source: 'warpedmap-highlight',
			paint: {
				'line-color': '#fff',
				'line-width': 4,
				'line-blur': 4
			},
			layout: {
				visibility: 'none'
			}
		});
		map.addLayer({
			id: 'warpedmap-highlight-sharp',
			type: 'line',
			source: 'warpedmap-highlight',
			paint: {
				'line-color': '#fff',
				'line-width': 1
			},
			layout: {
				visibility: 'none'
			}
		});

		map.setPaintProperty('warpedmap-highlight-sharp', 'line-opacity-transition', {
			duration: MAP_HIGHLIGHT_TRANSITION_DURATION,
			delay: 0
		});
		map.setPaintProperty('warpedmap-highlight-glow', 'line-opacity-transition', {
			duration: MAP_HIGHLIGHT_TRANSITION_DURATION,
			delay: 0
		});
	}

	function initWarpedMapFullHighlight() {
		map.addSource('warpedmap-full-highlight', {
			type: 'geojson',
			data: {
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [] }
			}
		});

		map.addLayer({
			id: 'warpedmap-full-highlight-glow',
			type: 'line',
			source: 'warpedmap-full-highlight',
			paint: {
				'line-color': '#fff',
				'line-width': 4,
				'line-blur': 4,
				'line-dasharray': [4, 4]
			},
			layout: {
				visibility: 'none'
			}
		});
		map.addLayer({
			id: 'warpedmap-full-highlight-sharp',
			type: 'line',
			source: 'warpedmap-full-highlight',
			paint: {
				'line-color': '#fff',
				'line-width': 1,
				'line-dasharray': [4, 4]
			},
			layout: {
				visibility: 'none'
			}
		});

		map.setPaintProperty('warpedmap-full-highlight-sharp', 'line-opacity-transition', {
			duration: MAP_HIGHLIGHT_TRANSITION_DURATION,
			delay: 0
		});
		map.setPaintProperty('warpedmap-full-highlight-glow', 'line-opacity-transition', {
			duration: MAP_HIGHLIGHT_TRANSITION_DURATION,
			delay: 0
		});
	}

	function initLineToUIElement() {
		map.addSource('line-to-ui-element', {
			type: 'geojson',
			data: {
				type: 'Feature',
				geometry: { type: 'LineString', coordinates: [] }
			}
		});

		map.addLayer({
			id: 'line-to-ui-element-dashed',
			type: 'line',
			source: 'line-to-ui-element',
			paint: {
				'line-color': '#ff0055',
				'line-width': 1,
				'line-dasharray': [2, 4]
			},
			layout: {
				visibility: 'none'
			}
		});

		map.setPaintProperty('line-to-ui-element-dashed', 'line-opacity-transition', {
			duration: MAP_HIGHLIGHT_TRANSITION_DURATION,
			delay: 0
		});
	}

	function showLineToUIElement(lineGeoJson) {
		const source = map.getSource('line-to-ui-element');
		if (!source) return;

		source.setData({
			type: 'Feature',
			geometry: lineGeoJson
		});

		map.moveLayer('line-to-ui-element-dashed');
		setLayerVisibility('line-to-ui-element-dashed', true);
		map.setPaintProperty('line-to-ui-element-dashed', 'line-opacity', 1);
	}

	function hideLineToUIElement() {
		const source = map.getSource('line-to-ui-element');
		if (source) {
			map.setPaintProperty('line-to-ui-element-dashed', 'line-opacity', 0);
			setTimeout(() => {
				setLayerVisibility('line-to-ui-element-dashed', false);
			}, MAP_HIGHLIGHT_TRANSITION_DURATION);
		}
	}

	function showWarpedMapOutline(polygonGeoJson) {
		const source = map.getSource('warpedmap-highlight');
		if (!source) return;

		source.setData({
			type: 'Feature',
			geometry: polygonGeoJson
		});

		map.moveLayer('warpedmap-highlight-sharp');
		map.moveLayer('warpedmap-highlight-glow');
		setLayerVisibility('warpedmap-highlight-sharp', true);
		map.setPaintProperty('warpedmap-highlight-sharp', 'line-opacity', 0.5);
		setLayerVisibility('warpedmap-highlight-glow', true);
		map.setPaintProperty('warpedmap-highlight-glow', 'line-opacity', 1);
	}

	function hideWarpedMapOutline() {
		const source = map.getSource('warpedmap-highlight');
		if (source) {
			map.setPaintProperty('warpedmap-highlight-sharp', 'line-opacity', 0);
			map.setPaintProperty('warpedmap-highlight-glow', 'line-opacity', 0);
			setTimeout(() => {
				setLayerVisibility('warpedmap-highlight-sharp', false);
				setLayerVisibility('warpedmap-highlight-glow', false);
			}, MAP_HIGHLIGHT_TRANSITION_DURATION);
		}
	}
	function showWarpedMapFullOutline(polygonGeoJson) {
		const source = map.getSource('warpedmap-full-highlight');
		if (!source) return;

		source.setData({
			type: 'Feature',
			geometry: polygonGeoJson
		});

		map.moveLayer('warpedmap-full-highlight-sharp');
		map.moveLayer('warpedmap-full-highlight-glow');
		setLayerVisibility('warpedmap-full-highlight-sharp', true);
		map.setPaintProperty('warpedmap-full-highlight-sharp', 'line-opacity', 0.5);
		setLayerVisibility('warpedmap-full-highlight-glow', true);
		map.setPaintProperty('warpedmap-full-highlight-glow', 'line-opacity', 1);
	}

	function hideWarpedMapFullOutline() {
		const source = map.getSource('warpedmap-full-highlight');
		if (source) {
			map.setPaintProperty('warpedmap-full-highlight-sharp', 'line-opacity', 0);
			map.setPaintProperty('warpedmap-full-highlight-glow', 'line-opacity', 0);
			setTimeout(() => {
				setLayerVisibility('warpedmap-full-highlight-sharp', false);
				setLayerVisibility('warpedmap-full-highlight-glow', false);
			}, MAP_HIGHLIGHT_TRANSITION_DURATION);
		}
	}

	function onpointerclick(e) {
    let warpedMap = waterStaatsKaarten.getMapsByGeoPosition(e.lngLat.lng, e.lngLat.lat);
    if(warpedMap) warpedMap = warpedMap[0];

    if(mapStore.loaded && warpedMap) {
      setSelectedMap(warpedMap);
    }
  }

  let lastHoveredMap = null;
  let hoverTime = 500;
  let hoverTimeLonger = 2000;
  let hoverTimeout = null;
  let hoverTimeoutLonger = null;

  let selectedMapTime = null;
  let selectedMapZIndex = null;
  let selectedMapResourceMask = null;

  function setSelectedMap(warpedMap) {
	resetSelectedMap();
    if(!mapStore.waterStaatsKaarten) return;

    mapStore.selectedMap = warpedMap;
    console.log('selected map: ', warpedMap);

    const bounds = new maplibre.LngLatBounds();
    warpedMap.mask.coordinates[0].forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 200 });

    // mapStore.selectedMap = warpedMap;
    const layer = mapStore.waterStaatsKaarten.layer;
    console.log(layer);

    selectedMapTime = performance.now();
    selectedMapZIndex = layer.renderer.warpedMapList.zIndices.get(warpedMap.id);
    selectedMapResourceMask = warpedMap.warpedMap.resourceMask;
    layer.bringMapsToFront([warpedMap.id]);
    const { width, height } = warpedMap.warpedMap.georeferencedMap.resource;
    layer.setMapResourceMask(warpedMap.id, [[0,height], [width,height], [width,0], [0,0]]);
    warpedMap.warpedMap.updateTriangulation(true);
  }

  function resetSelectedMap() {
    if(!mapStore.waterStaatsKaarten || !mapStore.selectedMap) return;

    const layer = mapStore.waterStaatsKaarten.layer;
    
    layer.setMapResourceMask(mapStore.selectedMap.id, selectedMapResourceMask);
    mapStore.selectedMap.warpedMap.updateTriangulation(true);
    mapStore.selectedMap = null;
  }

  function setHoveredMap(warpedMap) {
    if(mapStore.selectedMap) return;
    showWarpedMapOutline(warpedMap.mask);
    // showWarpedMapFullOutline(warpedMap.geoFullMask);
    mapStore.hoveredMap = warpedMap;
    mapStore.hoveredMapMask = warpedMap.mask.coordinates[0].slice(0,4).map(i => map.project(i));
  }

  function resetHoveredMap() {
    mapStore.hoveredMap = null;
    hideWarpedMapOutline();
    hideWarpedMapFullOutline();
    clearTimeout(hoverTimeout);
    clearTimeout(hoverTimeoutLonger);
  }

	function onpointermove(e) {
    mapStore.pointerScreenPos.x = e.point.x;
    mapStore.pointerScreenPos.y = e.point.y;

    let warpedMap = waterStaatsKaarten.getMapsByGeoPosition(e.lngLat.lng, e.lngLat.lat);
    if(warpedMap) warpedMap = warpedMap[0];

    if(warpedMap != lastHoveredMap) { 
      resetHoveredMap();
      if(warpedMap) hoverTimeout = setTimeout(() => {
        setHoveredMap(warpedMap);
      }, hoverTime);
      if(warpedMap) hoverTimeoutLonger = setTimeout(() => {
        showWarpedMapFullOutline(warpedMap.warpedMap.geoFullMask);
      }, hoverTimeLonger)
    }
    lastHoveredMap = warpedMap;
  }

  function onmouseout(e) {
    resetHoveredMap();
  }
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key == 'p') exportMapAsPNG();
	}}
/>

<div id="map"></div>

{#if waterStaatsKaarten && !waterStaatsKaarten.loaded}
<div id="loading-screen" class="fixed w-full h-full z-5000 bg-[#fff] text-center">
  Loading...
</div>
{/if}

{#if mapStore.loaded}
	<LayersPanel />
{/if}

<!-- {#if mapStore.selectedMap}
  <SheetOverlayNew></SheetOverlayNew>
{/if} -->

{#if mapStore.hoveredMap}
	<HoveredMap></HoveredMap>
{/if}

<style>
	#map {
		width: 100vw;
		height: 100vh;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 1;
	}

	.hoveredMapTitle {
		position: fixed;
		bottom: 180px;
		left: 50%;
		width: 250px;
		margin-left: -125px;
		text-align: center;
		z-index: 100;
	}
</style>
