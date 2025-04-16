<script>
    import Header from '$lib/Header.svelte';
    import MapLibre from '$lib/MapLibre.svelte';
    import Timeline from '$lib/Timeline.svelte';
</script>

<main>
    <div class="map-container">
        <Header/>
        <MapLibre/>
    </div>
    <Timeline/>
</main>

<style>
    * {
        user-select: none;
    }

    .map-container {
        width: calc(100vw - 180px);
        position: relative;
    }
</style>