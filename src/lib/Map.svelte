<script>
    import { onMount } from 'svelte';
    import 'ol/ol.css'; // Zorg ervoor dat de CSS van OpenLayers wordt geladen
    import Map from 'ol/Map';
    import View from 'ol/View';
    import TileLayer from 'ol/layer/Tile';
    import OSM from 'ol/source/OSM';

    let mapElement;

    onMount(() => {
        new Map({
        target: mapElement, // De div waarin de kaart wordt geplaatst
        layers: [
            new TileLayer({
            source: new OSM(), // OpenStreetMap-laag
            }),
        ],
        view: new View({
            center: [0, 0], // Het centrum van de kaart
            zoom: 2, // Zoomniveau
        }),
        });
    });
  </script>
  
  <style>
    div {
      width: 100vw;
      height: 100vh; /* Of je gewenste hoogte */
    }
  </style>
  
  <div bind:this={mapElement}></div>