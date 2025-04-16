<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import feather from 'feather-icons';

  export let label: string;
  export let icon: string;

  const dispatch = createEventDispatcher();

  onMount(() => {
    feather.replace();
  });
</script>

<button on:click={() => dispatch('click')} class="button">
  <i data-feather={icon}></i>
  {label}
</button>
  
  <style>
    .button {
      padding: 8px 12px;
      border-radius: 6px;
      background: #fff;
      border: 1px solid #ccc;
      font-family: Inter, sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
    }


    .button:hover {
      background-color: #f0f0f0;
    }
  </style>
  