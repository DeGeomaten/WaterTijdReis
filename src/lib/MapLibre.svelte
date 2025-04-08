<link rel="stylesheet" href="https://use.typekit.net/dwr8fxs.css">
<script lang="ts">
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import feather from 'feather-icons';
  import maplibre from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { WarpedMapLayer } from '@allmaps/maplibre'

  $: if (selectedSheet) {
    tick().then(() => {
      feather.replace();
    });
  }

  let map : maplibre.Map;
  let mapContainer: HTMLDivElement;
  
  let selectedEditions: Record<number, boolean> = { 1: false, 2: false, 3: true, 4: false, 5: false };
  let warpedMapLayers: Record<number, WarpedMapLayer> = {
    1: new WarpedMapLayer("warped-map-1"),
    2: new WarpedMapLayer("warped-map-2"),
    3: new WarpedMapLayer("warped-map-3"),
    4: new WarpedMapLayer("warped-map-4"),
    5: new WarpedMapLayer("warped-map-5")
  };

  let showLabels : boolean = true;
  let showWater : boolean = false;

  let selectedSheet = null;
  let selectedSheetFullScreen = false;

  async function fetchAndAddLayer(edition : number, layer : WarpedMapLayer) {
    const url = `https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_${edition}/latest.json`;
    try {
      const response = await fetch(url);
      const annotationData = await response.json();
      annotationData.items = annotationData.items.filter(i => i.id !== "96288818005190560268211324390159543196.jp2");
      layer.addGeoreferenceAnnotation(annotationData);
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

  onMount(() => {
    feather.replace();

    map = new maplibre.Map({
      container: mapContainer,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [4.55,52.23],
      zoom: 6,
      maxPitch: 0,
      preserveDrawingBuffer: true
    });

    map.on('load', () => {
      Object.entries(warpedMapLayers).forEach(([edition, layer]) => {
        fetchAndAddLayer(+edition, layer);
        map.addLayer(layer, 'watername_ocean');
        console.log(layer);
        if(!selectedEditions[+edition]) map.setLayoutProperty(layer.id, 'visibility', 'none');
      });
      map.repaint = true;

      console.log(map.getStyle().layers);
      map.setPaintProperty('water', 'fill-color', 'rgb(210,201,176)');
      map.setPaintProperty('water_shadow', 'fill-color', 'rgb(230,221,196)');

    });

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
          selectedSheet = hitImages[0];
          console.log(`Topmost hit (Edition ${edition}):`, hitImages[0]);

          showPolygonOnMap(map, hitImages[0]?.geoMask)
          return hitImages;
        }
      }

      console.log('No hit found');
      return null;
    });
  });

  function showPolygonOnMap(map, polygonGeoJson) {
    const sourceId = 'dynamic-polygon';

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData({
        type: 'Feature',
        geometry: polygonGeoJson
       });
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: polygonGeoJson
        }
      });

      map.addLayer({
        id: sourceId + 'line-2',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': 'rgba(255,255,255,.5)',
          'line-width': 4
        }
      });

      map.addLayer({
        id: sourceId + '-line-1',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': 'rgb(236,98,183)',
          'line-width': 2
        }
      });
    }

    // Bereken bounding box en zoom in
    const bounds = new maplibre.LngLatBounds();
    polygonGeoJson.coordinates[0].forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 100 });
  }
</script>

<style>
  .map {
    position: fixed;
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
  }

  .fullscreen-sheet img {
    width: 80vw;
    margin: 150px auto;
    box-shadow: 6px 6px 20px rgba(0,0,0,.5);
  }
</style>

<div class="map" bind:this={mapContainer}></div>
<div class="checkboxes">
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
    <h2>Blad: {selectedSheet.imageId}</h2>
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