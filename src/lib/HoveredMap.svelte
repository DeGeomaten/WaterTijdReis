<script>
    import { mapStore } from "../stores/mapStore.svelte";
    import { fade } from "svelte/transition";
    import ArrowCircleUpRight from "phosphor-svelte/lib/ArrowCircleUpRight";

    let topLeft = $state({ x: 0, y: 0 });
    let topRight = $state({ x: 0, y: 0 });
    let bottomLeft = $state({ x: 0, y: 0 });
    let bottomRight = $state({ x: 0, y: 0 });
    let height = $derived(bottomLeft.y - topLeft.y);
    let width = $derived(bottomLeft.x - topLeft.x);
    $effect(() => {
        if(mapStore.hoveredMap) {
            [bottomLeft, bottomRight, topRight, topLeft] = mapStore.hoveredMapMask;
        }
    })
</script>

<style>
    div {
        font-family: "ivypresto-display";
        font-weight: 500;
        text-shadow: 1px 1px 0px #22224488;
        opacity: .8;
    }
</style>

<div transition:fade={{ duration: 500 }}
    class="relative z-1 pointer-events-none" 
    style:left={topLeft.x + 'px'}
    style:top={topLeft.y + 'px'}
    style="font-size: {Math.min(height/12,18) + 'px'}; padding: {height/16+'px'}">
    <p class="text-white text-center" style:width={width}>{mapStore.hoveredMapTitle}</p>
    <p class="text-white">({mapStore.hoveredMapYear})</p>
</div>

<!-- <span class="relative text-[10px] z-1 pointer-events-none"
    transition:fade={{ duration: 500 }}
    style:left={mapStore.pointerScreenPos.x + 'px'}
    style:top={mapStore.pointerScreenPos.y + 10 + 'px'}
    style="margin-left: -100px"
>Klik om het volledige blad te bekijken</span> -->

<!-- <div transition:fade={{ duration: 500 }}
    class="relative z-1 pointer-events-none" 
    style:left={mapStore.pointerScreenPos.x + 'px'}
    style:top={mapStore.pointerScreenPos.y + 10 + 'px'}
    style="font-size: {12 + 'px'}; padding: {height/16+'px'}">
    <p class="text-white text-shadow-lg"><ArrowCircleUpRight class="inline"></ArrowCircleUpRight>{mapStore.hoveredMapTitle}</p>
</div> -->