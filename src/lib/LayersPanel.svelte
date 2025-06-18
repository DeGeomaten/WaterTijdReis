<script>
  import { mapStore } from '../stores/mapStore.svelte';

  import StackPlus from 'phosphor-svelte/lib/StackPlus'

  const editions = [1,2,3,4,5].map(i => `editie_${i}`);
  for(let ed of editions) mapStore.visibleLayers[ed] = false;

  // mapStore.visibleLayers['editie_3'] = true;

  function onkeydown(e) { 
    if(e.code.includes('Digit') && +e.code.slice(-1) <= 5) {
      const layerId = 'editie_' + e.code.slice(-1);
      mapStore.visibleLayers[layerId] = !mapStore.visibleLayers[layerId]; 
    }
  }
</script>

<style>
  .layerspanel {
    position: absolute;
    top: 200px;
    left: 0;
    margin: 10px;
    padding: 15px;
    outline: 2px solid #00000000;
    outline-offset: 4px;
    border-radius: 4px;
    z-index: 1000;
    font-family: "ivypresto-display", serif;
    font-weight: 300;
    font-style: normal;
    transition: all .3s;
  }
  .layerspanel:hover {
    background: #ffffff;
    margin-left: 20px;
    outline: 2px solid #00000022;
    outline-offset: 0px;
  }
  .layerspanel::before {
    position: absolute;
    content: '';
    top: 0;
    left: -20px;
    width: 20px;
    bottom: 0;
    transition: all .2s;
  }

  .layerspanel h2 {
    font-family: 'Inter';
    font-weight: 400;
    font-size: 11px;
    text-align: center;
    color: #22224477;
    opacity: 0;
    transition: opacity .3s;
  }
  .layerspanel:hover h2 {
    opacity: 1;
  }

  .layerspanel button {
    opacity: 0;
    transition: opacity .3s;
    font-family: 'Inter';
    font-size: 14px;
  }

  .layerspanel:hover button {
    opacity: 1;
  }

  .layerspanel .description {
    position: relative;
    left: -10px;
    opacity: 0;
    transition: all .3s;
  }


  .layerspanel:hover .description {
    opacity: 1;
    left: 0;
  }

  .layerspanel hr {
    opacity: 0;
    margin: 5px;
    border: 0.5px solid #eee;
  }

  .layerspanel:hover hr {
    opacity: 1;
  }

  .layerspanel label {
    padding: 3px;
    display: block;
  }

  .layerspanel .icon {
    position: relative;
    left: -20px;
    top: -3px;
    font-size: 11px;
    opacity: .2;
    display: inline;
  }

  .layerspanel input[type="checkbox"]:checked + .icon {
    color: white;
    opacity: 1;
  }

  .layerspanel input[type="checkbox"] {
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
  .layerspanel input[type="checkbox"]:checked {
    background-color: #000;
    border: 1px solid #fff;
  }
</style>

<svelte:window {onkeydown}></svelte:window>

<div class="layerspanel">
  <h2>LAGEN</h2>
  <div class="layers-checkboxes">
    <!-- {#each ['editie_1', 'editie_2', 'editie_3', 'editie_4', 'editie_5'] as layer}
      <label>
        <input type="checkbox" bind:checked={mapStore.visibleLayers[layer]} />
        <i class="icon">{layer.split('_')[1]}</i>
        <span class="description">Editie {layer.split('_')[1]}</span>
      </label>
    {/each} -->

    <label>
      <input type="checkbox" checked={true}/>
      <i class="icon">1</i>
      <span class="description">Waterstaatskaarten</span>
    </label>

    <label>
      <input type="checkbox" bind:checked={mapStore.showBaseMap} />
      <i class="icon">2</i>
      <span class="description">Achtergrondkaart</span>
    </label>

    <label>
      <input type="checkbox" bind:checked={mapStore.showLabels} />
      <i class="icon">3</i>
      <span class="description">Toon labels</span>
    </label>

    <label>
      <input type="checkbox" bind:checked={mapStore.showWater} />
      <i class="icon">4</i>
      <span class="description">Toon water</span>
    </label>

    <button class="rounded-[4px] px-[11px] mt-[10px] outline-2 outline-[#4466ff22] bg-[#224] text-[#fff] shadow-mini hover:border-4-[#ffffff44] inline-flex h-10 select-none items-center justify-center whitespace-nowrap">
      <StackPlus class="mr-[10px]"/> 
      Laag toevoegen
    </button>
  </div>
</div>

<!-- <div class="checkboxes">
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
</div> -->