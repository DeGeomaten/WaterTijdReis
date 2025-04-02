<link rel="stylesheet" href="https://use.typekit.net/dwr8fxs.css">
<script lang="ts">
  import { onMount } from 'svelte';
  import maplibre from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { WarpedMapLayer } from '@allmaps/maplibre'

  let map : maplibre.Map;
  let mapContainer: HTMLDivElement;
  let selectedImage : ImageBitmap | null = $state(null);
  
  let selectedEditions: Record<number, boolean> = { 1: true, 2: false, 5: true };
  let warpedMapLayers: Record<number, WarpedMapLayer> = {
    1: new WarpedMapLayer("warped-map-1"),
    2: new WarpedMapLayer("warped-map-2"),
    3: new WarpedMapLayer("warped-map-3"),
    4: new WarpedMapLayer("warped-map-4"),
    5: new WarpedMapLayer("warped-map-5")
  };

  let showLabels : boolean = true;

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

  onMount(() => {
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
    });

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
          console.log(`Topmost hit (Edition ${edition}):`, hitImages[0]);
          
          selectedImage = hitImages[0]?.cachedTilesForTexture[0].data;
          setTimeout(() => {
            const ctx = document.getElementById('sheetCanvas').getContext('2d');
            ctx.drawImage(selectedImage, 0, 0)
          }, 500)

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
    top: 60px;
    left: 0;
    margin: 10px;
    padding: 15px;
  }

  .checkboxes label {
    padding: 10px;
    display: block;
  }

  .checkboxes input[type="checkbox"] {
    /* appearance: none; */
    background-color: transparent;
    appearance: none;
    width: 18px;
    height: 18px;
    border: 1px solid rgb(200, 200, 255);
    border-bottom: 2px solid rgb(200, 200, 255);
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    top: 2px;
    left: -5px;
  }
  .checkboxes input[type="checkbox"]:checked {
    background-color: rgba(58,86,171);
    border: 1px solid rgba(58,86,171);
    border-bottom: 2px solid rgba(58,86,171);
  }

  .sheetOverlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .sheetOverlay canvas {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
  }
</style>

<div class="map" bind:this={mapContainer}></div>
<div class="checkboxes">
  {#each [1, 2, 3, 4, 5] as edition}
    <label>
      <input type="checkbox" checked={selectedEditions[edition] || false} on:change={() => toggleEdition(edition)} />
      Editie {edition}
    </label>
  {/each}
  <label>
    <input type="checkbox" checked={showLabels} on:change={toggleLabels} />
    Show labels
  </label>
</div>

{#if selectedImage}
  <div class="sheetOverlay">
    <canvas id="sheetCanvas" width="400" height="200"></canvas>
  </div>
{/if}