<script lang="ts">
  import { onMount } from 'svelte';
  import maplibre from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { WarpedMapLayer } from '@allmaps/maplibre'

  let mapContainer: HTMLDivElement;

  onMount(() => {
    const map = new maplibre.Map({
      container: mapContainer,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center: [4.55,52.23],
      zoom: 6,
      maxPitch: 0,
      // preserveDrawingBuffer: true
    });

    const annotationUrl = 'https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/editie_1/latest.json'
    const warpedMapLayer = new WarpedMapLayer()
    warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl);

    map.on('load', () => {
      map.fitBounds([
        [3.314, 50.751],  // Southwest corner (bottom-left)
        [7.227, 53.755]   // Northeast corner (top-right)
      ]);
      // map.addLayer(warpedMapLayer)
    })
  });
</script>

<style>
  div {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    z-index: -1;
  }
</style>

<div bind:this={mapContainer}></div>