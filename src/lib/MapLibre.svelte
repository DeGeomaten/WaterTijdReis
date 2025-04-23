<link rel="stylesheet" href="https://use.typekit.net/dwr8fxs.css">
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { tick } from 'svelte';
  import feather from 'feather-icons';
  import maplibre from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { mapInstance } from '../stores/mapInstance';
  import { warpedMapLayers } from '../stores/warpedMapLayers';
  import { mapsInViewport } from '../stores/mapsInViewport'; // TODO 
  import { timelineHorizontal, timelineSize, mapHoveredInTimeline, mapHoveredInTimelineX, mapHoveredInTimelineY, mapClickedInTimeline } from '../stores/timeline';

  $: if(map) {
    showMapHoveredPolygon($mapHoveredInTimeline?.geoMask);
    if($timelineHorizontal) mouseY = innerHeight - $timelineSize;
    else mouseX = innerWidth - $timelineSize;
    const unprojected = map.unproject({ x: mouseX, y: mouseY });
    if($mapHoveredInTimeline) showLineToTimeline({
      type: 'LineString',
      coordinates: [
        [unprojected.lng, unprojected.lat],
        [
          ($mapHoveredInTimeline?.geoMaskBbox[0] + $mapHoveredInTimeline?.geoMaskBbox[2]) / 2,
          ($mapHoveredInTimeline?.geoMaskBbox[1] + $mapHoveredInTimeline?.geoMaskBbox[3]) / 2,
        ]
      ]
    }) 
    else {
      hideLineToTimeline();
    }
  }

  $: if(map && mapClickedInTimeline) {
    showMapClickedPolygon($mapClickedInTimeline?.geoMask);

    const bounds = new maplibre.LngLatBounds();
    $mapClickedInTimeline?.geoMask.coordinates[0].forEach(coord => bounds.extend(coord));
    if(Object.keys(bounds).length) map.fitBounds(bounds, { padding: 100 });
    selectedSheet = $mapClickedInTimeline;
  }

  $: if (selectedSheet) {
    tick().then(() => {
      feather.replace();
    });
  }

  let mouseX = 0;
  let mouseY = 0;

  let map : maplibre.Map;
  let mapContainer: HTMLDivElement;
  
  let selectedEditions: Record<number, boolean> = { 1: false, 2: false, 3: true, 4: false, 5: false };

  let showLabels : boolean = true;
  let showWater : boolean = false;

  let selectedSheet = null;
  let selectedSheetFullScreen = false;

  async function fetchAndAddLayer(edition : number, layer : WarpedMapLayer) {
    const url = `https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_${edition}/latest.json`;
    try {
      const response = await fetch(url);
      const annotationData = await response.json();
      // annotationData.items = annotationData.items.filter(i => i.id !== "96288818005190560268211324390159543196.jp2"); // TODO: remove
      await layer.addGeoreferenceAnnotation(annotationData);
    } catch (error) {
      console.error(`Error loading edition ${edition}:`, error);
    }
  }

  function toggleEdition(edition : number) {
    selectedEditions[edition] = !selectedEditions[edition];
    map.setLayoutProperty(warpedMapLayers[edition].id, 'visibility', selectedEditions[edition] ? 'visible' : 'none');
  }

  function toggleLabels() {
    showLabels = !showLabels;

    Object.values(warpedMapLayers).forEach(layer => {
      map.moveLayer(layer.id, showLabels ? 'watername_ocean' : undefined);
    });
  }

  function toggleWater() {
    showWater = !showWater;

    Object.values(warpedMapLayers).forEach(layer => {
      map.moveLayer(layer.id, showWater ? 'water' : (showLabels ? 'watername_ocean' : undefined));
    });

    map.setPaintProperty('water', 'fill-color', showWater ? '#b0d0d6' : 'rgb(210,201,176)');
    map.setPaintProperty('water_shadow', 'fill-color', showWater ? 'rgba(203, 225, 228, 1)' : 'rgb(230,221,196)');
  }

  function handleKeyDown(event) {
    const key = event.code;
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(key)) {
      const edition = Number(key.slice(-1));
      if(event.shiftKey) for(let i = 1; i <= 5; ++i) {
        if(selectedEditions[i]) toggleEdition(i);
      }
      toggleEdition(edition);
    } else if (key === 'Digit6') {
      toggleLabels();
    } else if (key === 'Digit7') {
      toggleWater();
    }

    if(key == 'Escape') {
      selectedSheet = null;
      hideMapClickedPolygon();
    }

    if(key == 'KeyT') {
      timelineHorizontal.set(!$timelineHorizontal);
    }
  }

  // TODO: ?
  // onDestroy(() => {
  //   window.removeEventListener('keydown', handleKeyDown);
  // })

  function showLineToTimeline(lineGeoJson) {
    const sourceId = 'line-to-timeline';
    const source = map.getSource(sourceId);
    if(!source) return;

    source.setData({
      type: 'Feature',
      geometry: lineGeoJson
    });

    map.setLayoutProperty(sourceId + '-line', 'visibility', 'visible');
  }

  function hideLineToTimeline() {
    const sourceId = 'line-to-timeline';
    const source = map.getSource(sourceId);
    if(!source) return;

    map.setLayoutProperty(sourceId + '-line', 'visibility', 'none');
  }

  function showMapClickedPolygon(polygonGeoJson) {
      const sourceId = 'map-clicked';
      const source = map.getSource(sourceId);
      if(!source) return;

      source.setData({
        type: 'Feature',
        geometry: polygonGeoJson
      });

      map.setLayoutProperty(sourceId + '-line', 'visibility', 'visible');
    }

    function hideMapClickedPolygon() {
      const sourceId = 'map-clicked';
      const source = map.getSource(sourceId);
      if(!source) return;

      map.setLayoutProperty(sourceId + '-line', 'visibility', 'none');
    }

    function showMapHoveredPolygon(polygonGeoJson) {
      if(polygonGeoJson == null) {
        hideMapHoveredPolygon();
        return;
      }
      const sourceId = 'map-hovered';
      const source = map.getSource(sourceId);
      if(!source) return;

      source.setData({
        type: 'Feature',
        geometry: polygonGeoJson
      });

      map.setLayoutProperty(sourceId + '-line', 'visibility', 'visible');
    }

    function hideMapHoveredPolygon() {
      const sourceId = 'map-hovered';
      const source = map.getSource(sourceId);
      if(!source) return;

      map.setLayoutProperty(sourceId + '-line', 'visibility', 'none');
    }

  onMount(() => {
    feather.replace();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    map = new maplibre.Map({
      container: mapContainer,
      style: 'style.json',
      center: [4.55,52.23],
      zoom: 6,
      maxPitch: 0,
      preserveDrawingBuffer: true
    });

    mapInstance.set(map);

    map.on('load', () => {
      Object.entries(warpedMapLayers).forEach(([edition, layer]) => {
        fetchAndAddLayer(+edition, layer);
        map.addLayer(layer, 'watername_ocean');
        
        if(!selectedEditions[+edition]) map.setLayoutProperty(layer.id, 'visibility', 'none');
      });

      map.setPaintProperty('water', 'fill-color', 'rgb(210,201,176)');
      map.setPaintProperty('water_shadow', 'fill-color', 'rgb(230,221,196)');

      map.addSource('line-to-timeline', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [] }
        }
      });

      map.addSource('map-hovered', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] }
        }
      });

      map.addSource('map-clicked', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] }
        }
      });

      map.addLayer({
        id: 'line-to-timeline-line',
        type: 'line',
        source: 'line-to-timeline',
        paint: {
          'line-color': '#ff0055',
          'line-width': 1,
          'line-dasharray': [2, 4]
        },
        layout: {
          visibility: 'none'
        }
      });
      map.addLayer({
        id: 'map-clicked-line',
        type: 'line',
        source: 'map-clicked',
        paint: {
          'line-color': '#f55',
          'line-width': 1
        },
        layout: {
          visibility: 'none'
        }
      });
      map.addLayer({
        id: 'map-hovered-line',
        type: 'line',
        source: 'map-hovered',
        paint: {
          'line-color': '#f55',
          'line-width': 1
        },
        layout: {
          visibility: 'none'
        }
      });

      console.log(warpedMapLayers[3])
    });

    map.on('idle', () => { map.triggerRepaint(); updateMapsInViewportIds(); }); // TODO: why does the basemap disappear?

    map.on('move', updateMapsInViewportIds);

    function updateMapsInViewportIds() {
      const mapsInViewportIds = Array.from(warpedMapLayers[3].renderer?.mapsInViewport);  
      mapsInViewport.set(mapsInViewportIds.map(mapId => warpedMapLayers[3].renderer?.warpedMapList.warpedMapsById.get(mapId)));
    }

    map.addControl(new maplibre.ScaleControl({ maxWidth: 150, unit: 'metric' }), 'bottom-right');
    map.addControl(new maplibre.NavigationControl(), 'bottom-left');

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      console.log(`Clicked at: ${lng}, ${lat}`);

      for (const edition of Object.keys(warpedMapLayers).sort((a, b) => Number(b) - Number(a))) {
        if (!selectedEditions[+edition]) continue;

        const layer = warpedMapLayers[+edition];
        if (!layer.renderer?.warpedMapList.rtree) continue;

        const hitResults = layer.renderer.warpedMapList.rtree.searchFromPoint([lng, lat], true);
        if (hitResults.length > 0) {
          const hitImages = hitResults.map(id => layer.renderer?.warpedMapList.warpedMapsById.get(id));

          // layer.renderer.warpedMapList.sendMapsToBack([selectedSheet?.mapId]);
          selectedSheet = hitImages[0];
          // layer.renderer.warpedMapList.bringMapsToFront([selectedSheet.mapId]);
          
          showMapClickedPolygon(selectedSheet?.geoMask);

          // Bereken bounding box en zoom in
          const bounds = new maplibre.LngLatBounds();
          selectedSheet?.geoMask.coordinates[0].forEach(coord => bounds.extend(coord));
          map.fitBounds(bounds, { padding: 100 });
          
          console.log(`Topmost hit (Edition ${edition}):`, selectedSheet);

          // selectedSheet.georeferencedMap.resourceMask[0][0] = 0;
          // selectedSheet.georeferencedMap.resourceMask[0][1] = 10000;
          // selectedSheet.georeferencedMap.resourceMask[1][0] = 10000;
          // selectedSheet.georeferencedMap.resourceMask[1][1] = 10000;
          // selectedSheet.georeferencedMap.resourceMask[2][0] = 10000;
          // selectedSheet.georeferencedMap.resourceMask[2][1] = 0;
          // selectedSheet.georeferencedMap.resourceMask[3][0] = 0;
          // selectedSheet.georeferencedMap.resourceMask[3][1] = 0;
          // const id = hitImages[0]?.mapId;
          // if (id) layer.renderer.warpedMapList.zIndices.set(id, 10000000);

          return hitImages;
        }
      }

      console.log('No hit found');
      return null;
    });
  });
</script>

<style>
  .map {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: -1;
  }

  .checkboxes {
    font-family: "ivypresto-display", serif;
    font-weight: 300;
    font-style: normal;
    position: absolute;
    top: 200px;
    left: 0;
    margin: 10px;
    padding: 15px;
    z-index: -1;
    transition: transform .3s;
  }

  .checkboxes h2 {
    font-family: 'Inter';
    font-weight: 400;
    font-size: 11px;
    color: #00000077;
    opacity: 0;
    transition: opacity .3s;
  }

  .checkboxes:hover h2 {
    opacity: 1;
  }

  .checkboxes .description {
    position: relative;
    left: -10px;
    opacity: 0;
    transition: all .3s;
  }

  .checkboxes:hover {
    transform: translateX(10px);
    background: #fff;
    border-radius: 4px;
    outline: 2px solid #00000022;
  }

  .checkboxes:hover .description {
    opacity: 1;
    left: 0;
  }

  .checkboxes hr {
    opacity: 0;
    margin: 5px;
    border: 0.5px solid #eee;
  }

  .checkboxes:hover hr {
    opacity: 1;
  }

  .checkboxes label {
    padding: 3px;
    display: block;
  }

  .checkboxes .icon {
    position: relative;
    left: -20px;
    top: -3px;
    font-size: 11px;
    opacity: .2;
    display: inline;
  }

  .checkboxes input[type="checkbox"]:checked + .icon {
    color: white;
    opacity: 1;
  }

  .checkboxes input[type="checkbox"] {
    /* appearance: none; */
    background-color: transparent;
    appearance: none;
    width: 18px;
    height: 18px;
    background: #fff;
    border: 1px solid #00000022;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    top: 2px;
    left: -5px;
  }
  .checkboxes input[type="checkbox"]:checked {
    background-color: #000;
    border: 1px solid #fff;
  }

  .sheet-controls {
    position: fixed;
    bottom: 50px;
    left: 50%;
    margin-left: -200px;
    width: 400px;
    height: 90px;
    background: #00000055;
    outline: 2px solid #ffffff22;
    border-radius: 4px;
    /* padding: 10px; */
    font-family: "ivypresto-display", serif;
    font-weight: 400;
    color: white;
  }

  .sheet-controls .image-btn {
    height: 80px;
    display: inline;
    margin: 5px;
    float: left;
    cursor: pointer;
  }

  .sheet-controls .image-btn img {
    height: 100%;
  }

  .sheet-controls .image-btn:hover {
    filter: brightness(75%);
  }
  .sheet-controls .sheet-information {
    padding: 10px;
  }

  .sheet-controls button {
    padding: 4px;
    cursor: pointer;
  }

  .sheet-controls button:hover {
    background: #00000033;
    border-radius: 4px;
  }

  .fullscreen-sheet {
    height: 100vh;
    width: 100vw;
    position: fixed;
    top: 0;
    text-align: center;
    background: rgba(0,0,0,.25);
    pointer-events: none;
    z-index: 10000;
  }

  .fullscreen-sheet img {
    width: 70vw;
    margin: 10vw auto;
    box-shadow: 6px 6px 20px rgba(0,0,0,.5);
  }

  :global(.maplibregl-ctrl-scale) {
    background-color: transparent;
    color: black;
    font-family: "Inter", serif;
    font-weight: 500;
    font-style: normal;
    font-size: 12px;
    text-align: right;
    border: 2px solid #00000055;
    border-top: none;
  }
</style>

<div class="map" bind:this={mapContainer}></div>
<div class="checkboxes">
  <h2>LAGEN</h2>
  {#each [1, 2, 3, 4, 5] as edition}
    <label>
      <input type="checkbox" checked={selectedEditions[edition] || false} on:change={() => toggleEdition(edition)} />
      <i class="icon">{edition}</i>
      <span class="description">Editie {edition}</span>
    </label>
  {/each}
  <hr>
  <label>
    <input type="checkbox" checked={showLabels} on:change={toggleLabels} />
    <i data-feather="tag" class="icon size-3" style="left: -22px; top: -2px;"></i>
    <span class="description" style="position: relative; left: -10px;">Labels</span>
  </label>
  <label>
    <input type="checkbox" checked={showWater} on:change={toggleWater} />
    <i data-feather="droplet" class="icon size-3" style="left: -23px; top: -3px;"></i>
    <span class="description" style="position: relative; left: -10px;">Water</span>
  </label>
</div>

{#if selectedSheet}
<div class="sheet-controls">
  <button class="image-btn" on:click={() => selectedSheetFullScreen = !selectedSheetFullScreen}>
    <img src={selectedSheet.georeferencedMap.resource.id + '/0,0,' + selectedSheet.georeferencedMap.resource.width + ',' + selectedSheet.georeferencedMap.resource.height + '/128,/0/default.jpg'} alt="">
  </button>
  <!-- <img src={selectedSheet.georeferencedMap.resource.id} alt=""> -->
  <div class="sheet-information">
    <h2>Blad: <span style="font-family: monospace">{selectedSheet.imageId}</span></h2>
    <br>
    <div class="sheet-buttons">
      <button><i data-feather="maximize-2" class="icon size-4"></i></button>
      <button><i data-feather="columns" class="icon size-4"></i></button>
      <button><i data-feather="external-link" class="icon size-4"></i></button>
    </div>
  </div>

</div>

  {#if selectedSheetFullScreen}
    <div class="fullscreen-sheet">
      <img src={selectedSheet.georeferencedMap.resource.id + '/0,0,' + selectedSheet.georeferencedMap.resource.width + ',' + selectedSheet.georeferencedMap.resource.height + '/1024,/0/default.jpg'} alt="">
    </div>
  {/if}
{/if}