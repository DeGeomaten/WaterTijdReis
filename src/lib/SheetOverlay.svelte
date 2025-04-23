<script>
  import { onMount } from 'svelte';
  import maplibre from 'maplibre-gl';
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { timelineSize, timelineHorizontal } from '../stores/timeline';

  let map;
  let mapContainer;

  let warpedMapLayer = new WarpedMapLayer('sheetOverlay');

  const id = "866b1365-0a97-455f-8c38-2cb221f9a1ca";

  async function fetchAndAddLayer(edition, layer) {
    const url = `https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_${edition}/latest.json`;
    try {
      const response = await fetch(url);
      const annotationData = await response.json();
      annotationData.items = annotationData.items.filter(i => i.id == id); // TODO: remove
      await layer.addGeoreferenceAnnotation(annotationData);
    } catch (error) {
      console.error(`Error loading edition ${edition}:`, error);
    }
  }

  
  
  onMount(() => {
    map = new maplibre.Map({
      container: mapContainer,
      style: 'style.json',
      center: [4.55,52.23],
      zoom: 6,
      maxPitch: 0,
      preserveDrawingBuffer: true
    });

    map.on('load', () => {
      fetchAndAddLayer(3, warpedMapLayer);
      map.addLayer(warpedMapLayer);
    });
  });
</script>

<div bind:this={mapContainer} class="sheetOverlayCanvas"></div>

<style>
  .sheetOverlayCanvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
    background: #00000022;
  }
</style>