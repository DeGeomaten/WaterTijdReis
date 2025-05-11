<script>
  import maplibre from 'maplibre-gl';
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import LayersPanel from './LayersPanel.svelte';

  import { getIIIFMetadata  } from '../stores/iiif-metadata.svelte';
  import { mapStore } from '../stores/mapStore.svelte';
	import { timelineStore } from '../stores/timelineStore.svelte';

  let map;

  const editions = [1,2,3,4,5].map(i => `editie_${i}`);
  const annotationUrls = Object.fromEntries(editions.map(edition => 
    [edition, `https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/${edition}/latest.json`]
  ));

  const waterStaatsKaartLayers = mapStore.warpedMapLayers;
  for(let ed of editions) 
    waterStaatsKaartLayers[ed] = new WarpedMapLayer(ed);


  $effect(() => { 
    if(!map) map = initMap(); 
    if(!mapStore.loaded) return;

    for(let layerId in mapStore.visibleLayers) {
      setLayerVisibility(layerId, !!mapStore.visibleLayers[layerId])
    }

    setLabelVisibility(mapStore.showLabels)
    setWaterVisibility(mapStore.showWater)

    if(timelineStore.hoveredMap) {
      showWarpedMapOutline(timelineStore.hoveredMap.geoMask);

      const unprojected = map.unproject({ x: timelineStore.hoverX, y: timelineStore.hoverY });
      showLineToUIElement({
        type: 'LineString',
        coordinates: [
          [unprojected.lng, unprojected.lat],
          [
            (timelineStore.hoveredMap.geoMaskBbox[0] + timelineStore.hoveredMap.geoMaskBbox[2]) / 2,
            (timelineStore.hoveredMap.geoMaskBbox[1] + timelineStore.hoveredMap.geoMaskBbox[3]) / 2,
          ]
        ]
      });
    } else { hideWarpedMapOutline(); hideLineToUIElement(); }
  });

  function initMap() {
    const m = new maplibre.Map({
      container: 'map',
      style: 'style.json',
      center: [4.55,52.23],
      zoom: 6,
      maxPitch: 0,
      preserveDrawingBuffer: true // TODO: is this a requirement for allmaps?
    });

    ['editie_1', 'editie_2', 'editie_3'].forEach((edition) =>
      fetch(`/metadata-${edition}.json`)
        .then((response) => response.json())
        .then(data => { mapStore.metadata[edition] = data })
        .catch(error => console.error(`Error fetching ${edition}.json:`, error))
    );

    m.on('load', () => {
      mapStore.loaded = true;

      Object.values(waterStaatsKaartLayers).forEach(layer => {
        m.addLayer(layer);
        setLayerVisibility(layer.id, mapStore.visibleLayers[layer.id]);
      });
  
      loadAnnotations();
      initWarpedMapHighlight();
      initLineToUIElement();

      setInterval(() => {
        mapStore.warpedMapsInViewport = Array.from(waterStaatsKaartLayers['editie_3'].renderer.mapsInViewport)
          .map(id => waterStaatsKaartLayers['editie_3'].renderer.warpedMapList.warpedMapsById.get(id))
      }, 500);
    });

    m.on('click', onpointerclick);
    m.on('mousemove', onpointermove);
    m.on('mouseout', onmouseout);
    // m.on('idle', () => { m.triggerRepaint() })

    return m;
  }

  function loadAnnotations() {
    for(let ed of editions) {
      fetch(annotationUrls[ed])
        .then(response => response.json())
        .then(data => waterStaatsKaartLayers[ed].addGeoreferenceAnnotation(data))
        .catch(error => console.error('Error loading annotations:', error));
    }
  }
  
  function setLayerVisibility(layerId, visible) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
  }

  function setLabelVisibility(visible) {
    Object.values(mapStore.warpedMapLayers).forEach(layer => {
      map.moveLayer(layer.id, visible ? 'watername_ocean' : undefined);
    });
  }

  function setWaterVisibility(visible) {
    Object.values(mapStore.warpedMapLayers).forEach(layer => {
      map.moveLayer(layer.id, visible ? 'water' : (mapStore.showLabels ? 'watername_ocean' : undefined));
    });
    map.setPaintProperty('water', 'fill-color', visible ? '#b0d0d6' : 'rgb(210,201,176)');
    map.setPaintProperty('water_shadow', 'fill-color', visible ? 'rgba(203, 225, 228, 1)' : 'rgb(230,221,196)');
  }

  function warpedMapAt(lng,lat) {
    for(let layer of Object.values(waterStaatsKaartLayers).sort((a,b) => b-a)) {
      if(!mapStore.loaded || !mapStore.visibleLayers[layer.id]) continue;
      const warpedMapList = layer.renderer.warpedMapList;
      const results = warpedMapList.rtree.searchFromPoint([lng, lat], true);
      if(results.length) {
        return warpedMapList.warpedMapsById.get(results[0]);
      }
    }
  }

  const MAP_HIGHLIGHT_TRANSITION_DURATION = 500;

  function initWarpedMapHighlight() {
    map.addSource('warpedmap-highlight', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] }
      }
    })

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

    map.setPaintProperty('warpedmap-highlight-sharp', 'line-opacity-transition', { duration: MAP_HIGHLIGHT_TRANSITION_DURATION, delay: 0 });
    map.setPaintProperty('warpedmap-highlight-glow', 'line-opacity-transition', { duration: MAP_HIGHLIGHT_TRANSITION_DURATION, delay: 0 });
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

    map.setPaintProperty('line-to-ui-element-dashed', 'line-opacity-transition', { duration: MAP_HIGHLIGHT_TRANSITION_DURATION, delay: 0 });
  }

  function showLineToUIElement(lineGeoJson) {
    const source = map.getSource('line-to-ui-element');
    if(!source) return;

    source.setData({
      type: 'Feature',
      geometry: lineGeoJson
    });

    setLayerVisibility('line-to-ui-element-dashed', true);
    map.setPaintProperty('line-to-ui-element-dashed', 'line-opacity', 1);
  }

  function hideLineToUIElement() {
    const source = map.getSource('line-to-ui-element');
    if(source) {
      map.setPaintProperty('line-to-ui-element-dashed', 'line-opacity', 0);
      setTimeout(() => {
        setLayerVisibility('line-to-ui-element-dashed', false);
      }, MAP_HIGHLIGHT_TRANSITION_DURATION)
    }
  }

  function showWarpedMapOutline(polygonGeoJson) {
    const source = map.getSource('warpedmap-highlight');
    if(!source) return;

    source.setData({
      type: 'Feature',
      geometry: polygonGeoJson
    });

    setLayerVisibility('warpedmap-highlight-sharp', true);
    map.setPaintProperty('warpedmap-highlight-sharp', 'line-opacity', .5);
    setLayerVisibility('warpedmap-highlight-glow', true);
    map.setPaintProperty('warpedmap-highlight-glow', 'line-opacity', 1);
  }

  function hideWarpedMapOutline() {
    const source = map.getSource('warpedmap-highlight');
    if(source) {
      map.setPaintProperty('warpedmap-highlight-sharp', 'line-opacity', 0);
      map.setPaintProperty('warpedmap-highlight-glow', 'line-opacity', 0);
      setTimeout(() => {
        setLayerVisibility('warpedmap-highlight-sharp', false);
        setLayerVisibility('warpedmap-highlight-glow', false);
      }, MAP_HIGHLIGHT_TRANSITION_DURATION)
    }
  }

  function onpointerclick(e) {
    const warpedMap = warpedMapAt(e.lngLat.lng, e.lngLat.lat);
    console.log(warpedMap);

    if(mapStore.loaded && warpedMap) {
      const bounds = new maplibre.LngLatBounds();
      warpedMap.geoMask.coordinates[0].forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 200 });
    }
  }

  let lastHoveredMap = null;
  let hoverTimeout = null;

  function onpointermove(e) {
    const warpedMap = warpedMapAt(e.lngLat.lng, e.lngLat.lat);
    if(warpedMap != lastHoveredMap) { 
      hideWarpedMapOutline(); 
      clearTimeout(hoverTimeout); 
      if(warpedMap) hoverTimeout = setTimeout(() => {
        showWarpedMapOutline(warpedMap.geoMask);
      }, 500);
    }
    lastHoveredMap = warpedMap;
  }

  function onmouseout(e) {
    if(lastHoveredMap) {
      hideWarpedMapOutline();
      lastHoveredMap = null;
    }
    clearTimeout(hoverTimeout);
  }
</script>

<style>
  #map {
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }
</style>

<div id="map"></div>

{#if mapStore.loaded}
  <LayersPanel/>
{/if}