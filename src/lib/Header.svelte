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
      /* background-color: #ffffffd0; */
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
      background: #ffffffff;
      outline: 2px solid #4466ff22;
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
      /* border: none; */
      /* box-shadow: 3px 3px 9px rgba(0,0,0,.15); */
      /* border: 1px solid rgb(233, 233, 255); */
      /* border-bottom: 2px solid rgb(233, 233, 255); */
      border-radius: 4px;
      background: #ffffffff;
      outline: 2px solid #4466ff22;
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
      <span style="font-family: Inter; font-weight: 200">x</span>
      <svg version="1.1" id="Layer_1" width="30" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1440 1440" xml:space="preserve">
        <style type="text/css">
          .st0{fill:#FFFFFF;}
        </style>
        <g>
          <g>
            <polygon class="st0" points="720,703.8 164.8,1031.6 720,1359.5 1275.2,1031.6"></polygon>
            <path d="M720,625.3L31.8,1031.6L720,1438l688.2-406.4L720,625.3z M720,703.8l555.2,327.8L720,1359.5l-555.2-327.8L720,703.8z"></path>
          </g>
          <g>
            <polygon class="st0" points="720,548 164.8,875.8 720,1203.7 1275.2,875.8"></polygon>
            <path d="M720,469.5L31.8,875.8L720,1282.2l688.2-406.4L720,469.5z M720,548l555.2,327.8L720,1203.7L164.8,875.8L720,548z"></path>
          </g>
          <g>
            <polygon class="st0" points="720,392.2 164.8,720 720,1047.9 1275.2,720"></polygon>
            <path d="M720,313.7L31.8,720L720,1126.4L1408.2,720L720,313.7z M720,392.2L1275.2,720L720,1047.9L164.8,720L720,392.2z"></path>
          </g>
          <g>
            <polygon class="st0" points="720,236.3 164.8,564.2 720,892 1275.2,564.2"></polygon>
            <path d="M720,157.8L31.8,564.2L720,970.5l688.2-406.3L720,157.8z M720,236.3l555.2,327.8L720,892L164.8,564.2L720,236.3z"></path>
          </g>
          <g>
            <polygon class="st0" points="720,80.5 164.8,408.4 720,736.2 1275.2,408.4"></polygon>
            <path d="M720,2L31.8,408.4L720,814.7l688.2-406.4L720,2z M720,80.5l555.2,327.8L720,736.2L164.8,408.4L720,80.5z"></path>
          </g>
          <g>
            <g class="st1">
              <g>
                <path d="M610.5,404l216.7-69.9l-121.3,125L610.5,404 M986,288.6l-80.6-46.5L297.4,420.8l93.5,54L513.6,435l138.1,79.8l-68.6,71.1l93.5,54L986,288.6"></path>
              </g>
            </g>
          </g>
        </g>
      </svg>
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