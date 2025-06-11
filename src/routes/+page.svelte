<script>
    import Header from '$lib/Header.svelte';
    import Map from '$lib/Map.svelte';
    import Timeline from '$lib/Timeline.svelte';
    import Filter from '$lib/Filter.svelte'
    
    let mapContainer;
</script>

<main>
    <div bind:this={mapContainer} class="map-container">
        <Map/>
        <Header/>
    </div>
    <Filter/>
    <Timeline/>
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