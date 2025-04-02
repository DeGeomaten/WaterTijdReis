<link rel="stylesheet" href="https://use.typekit.net/dwr8fxs.css">
<script lang="ts">
    import { onMount } from 'svelte';
    import feather from 'feather-icons';
  
    let searchQuery = ""; // Houdt de waarde van de zoekbalk bij
  
    function share() {
      alert("Deelknop ingedrukt!");
    }
  
    function about() {
      alert("Over deze pagina!");
    }
  
    onMount(() => {
      feather.replace(); // Replace all <i> tags with Feather icons
    });
  </script>
  
  <style>
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background-color: #ffffffd0;
      font-family: "ivypresto-display", serif;
      font-weight: 400;
      font-style: normal;
      /* border-bottom: 2px solid #ddd; */
    }
  
    .search-bar-container {
      display: flex;
      align-items: center;
    }
  
    .search-bar {
      width: 175px;
      padding: 8px;
      font-size: 16px;
      background: #00000010;
      border-radius: 4px;
      transition: width .2s;
    }

    .search-bar:focus {
      width: 220px;
      outline: none;
    }
  
    .logo {
        flex-grow: 1;
        text-align: center;
        font-size: 22px;
        font-weight: 300;
        color: #005;
        display: flex;
        align-items: center; /* Vertically centers the items */
        justify-content: center; /* Centers the items horizontally */
        gap: 10px; /* Optional: Adds space between the logo image and text */
    }

    .logo img {
        max-height: 30px;
        height: auto; /* Ensures the image maintains its aspect ratio */
    }
  
    .buttons {
      display: flex;
      gap: 10px;
    }
  
    .button {
      padding: 8px 15px;
      background: #ffffff88;
      /* border: none; */
      /* box-shadow: 3px 3px 9px rgba(0,0,0,.15); */
      border: 1px solid rgb(233, 233, 255);
      border-bottom: 2px solid rgb(233, 233, 255);
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
  
    .button .icon {
      margin-right: 8px;
      font-size: 12px;
    }
  
    .button:hover {
      background: #ddd;
    }
  </style>
  
  <div class="header">
    <div class="search-bar-container">
      <input
      type="text"
      bind:value={searchQuery}
      placeholder="Zoek op de kaart"
      class="search-bar"
      />
      <i data-feather="search" style="position: relative; right: 30px;" class="icon size-4"></i>
    </div>
  
    <div class="logo">
      <img src="/logo.png" alt="Logo" />
      <!-- <h1>WaterTijdReis</h1> -->
    </div>
  
    <div class="buttons">
      <button class="button" on:click={about}>
        <i data-feather="map" class="icon size-4"></i> Over WaterTijdReis
      </button>
      <button class="button" on:click={share}>
        <i data-feather="share" class="icon size-4"></i> Deel
      </button>
    </div>
  </div>