<script>
    import { onMount } from 'svelte';
    import Header from '$lib/Header.svelte';
    import MapLibre from '$lib/MapLibre.svelte';
    import Timeline from '$lib/Timeline.svelte';
    import SheetOverlay from '$lib/SheetOverlay.svelte';

    import { timelineSize, timelineHorizontal } from '../stores/timeline';
    
    let mapContainer;

    $: if (mapContainer) {
        if($timelineHorizontal) mapContainer.style.width = '100vw';
        else mapContainer.style.width = innerWidth - $timelineSize + 'px';
    }

    onMount(() => {
        if($timelineHorizontal) mapContainer.style.width = '100vw';
        else mapContainer.style.width = innerWidth - $timelineSize + 'px';
    });
</script>

<main>
    <div bind:this={mapContainer} class="map-container">
        <Header/>
        <MapLibre/>
    </div>
    <Timeline/>
    <!-- <SheetOverlay/> -->
</main>

<style>
    * {
        user-select: none;
    }

    .map-container {
        width: 100vw;
        position: relative;
    }
</style>