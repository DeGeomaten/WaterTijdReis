<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import feather from 'feather-icons';
  
    const dispatch = createEventDispatcher();
  
    function closeModal() {
      dispatch('close');
    }
  
    onMount(() => {
      feather.replace();
    });
  </script>
  
  <style>
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.599);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
  
    .modal {
      background: white;
      border-radius: 10px;
      padding: 2rem;
      max-width: 600px;
      width: 90%;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      position: relative;
    }
  
    .close-button {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
    }
  
    .close-button:hover {
      opacity: 0.7;
    }
  
    h1 {
      color: #d33;
      font-size: 1.8rem;
      margin-bottom: 1rem;
    }
  
    p {
      font-size: 1.05rem;
      line-height: 1.6;
      margin-bottom: 1rem;
    }
  </style>
  
  <div class="modal-overlay" on:click="{closeModal}">
    <div class="modal" on:click|stopPropagation>
      <button class="close-button" on:click={closeModal} aria-label="Sluiten">
        <i data-feather="x" class="icon"></i>
      </button>
      <h1>Over deze applicatie</h1>
      <p>
        Welkom op de <strong>about</strong>-pagina! Hier vind je achtergrondinformatie over hoe deze applicatie werkt en wat je ermee kunt doen.
      </p>
      <p>
        Deze tool is ontworpen om historische kaarten op een interactieve manier te verkennen en ontdekken. Scroll door de tijd, klik op kaarten en duik dieper in het verleden!
      </p>
    </div>
  </div>