<script>
    let searchQuery = ""; // Houdt de waarde van de zoekbalk bij
  </script>
  
  <style>
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 20px;
      background-color: #f8f8f8;
      border-bottom: 2px solid #ddd;
    }

    h1 {
        font-size: 25px;
    }
  
    .search-bar {
      width: 60%;
      max-width: 500px;
      padding: 8px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
  
    .share-button, .about-button {
      padding: 8px 15px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  
    .share-button:hover {
      background-color: #45a049;
    }
  </style>
  
  <div class="header">
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Zoeken..."
      class="search-bar"
    />

    <h1>WaterTijdReis</h1>
  
    <button class="about-button">
        Over WaterTijdReis
    </button>

    <button class="share-button" on:click={() => alert("Deelknop ingedrukt!")}>
      Delen
    </button>
  </div>