<script>
  import { mapStore } from '../stores/mapStore.svelte';
	import { timelineStore } from '../stores/timelineStore.svelte';

  let canvas;
  let ctx;

  let magnifyCanvas;
  let magnifyCtx;

  let devicePixelRatio = $state(1);

  let screenWidth = $state(0);
  let screenHeight = $state(0);

  let sheetImage = $state(null);
  let sheetResourceWidth = $state(0);
  let sheetResourceHeight = $state(0);
  let sheetPadding = $state(100);

  let showSheetMask = true;

  $effect(() => {
    if(!ctx) {
      ctx = canvas.getContext('2d');
      magnifyCtx = magnifyCanvas.getContext('2d');

      window.addEventListener('keydown', e => {
        if(e.key === 'm') { showSheetMask = !showSheetMask; draw() }
        if(e.key === 'Escape') hideSheetOverlay();
      });
    }

    if(mapStore.selectedMap) {
      sheetResourceWidth = mapStore.selectedMap.georeferencedMap.resource.width;
      sheetResourceHeight = mapStore.selectedMap.georeferencedMap.resource.height;
      const aspect = sheetResourceWidth / sheetResourceHeight;
      let width = Math.min(screenWidth - sheetPadding * 2, screenHeight * aspect - sheetPadding * 2);
      let height = width / aspect;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      // ctx.scale(devicePixelRatio, devicePixelRatio);

      if(!sheetImage) {
        getSheetImage(mapStore.selectedMap).then(image => {
          sheetImage = image;
          draw();
        });
      }
      draw();
    }
  })

  async function getSheetImage(sheet, resolution = 'full') {
    const url = sheet.georeferencedMap.resource.id + `/full/${resolution}/0/default.jpg`;
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = err => {
        console.error(`Failed to load image: ${url}`, err);
        reject(err);
      }
    })
  }

  function draw() {
    if(!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(sheetImage) ctx.drawImage(sheetImage, 0, 0, canvas.width, canvas.height);
    if(sheetImage && showSheetMask) {
      const mask = mapStore.selectedMap.resourceMaskBbox;
      ctx.clearRect(
        mask[0] / sheetResourceWidth * canvas.width,
        mask[1] / sheetResourceHeight * canvas.height,
        (mask[2] - mask[0]) / sheetResourceWidth * canvas.width,
        (mask[3] - mask[1]) / sheetResourceHeight * canvas.height
      );
    }
  }

  let magnifyingGlassVisible = $state(false);
  let magnifyAmount = 100;
  function onmousemove(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    if(mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
      magnifyingGlassVisible = false;
      return;
    }
    
    magnifyCanvas.style.left = `${e.clientX - magnifyCanvas.width / 2}px`;
    magnifyCanvas.style.top = `${e.clientY - magnifyCanvas.height / 2}px`;

    const mask = mapStore.selectedMap.resourceMaskBbox;
    const x = mask[0] / sheetResourceWidth * canvas.width / devicePixelRatio;
    const y = mask[1] / sheetResourceHeight * canvas.height / devicePixelRatio;
    const w = (mask[2] - mask[0]) / sheetResourceWidth * canvas.width;
    const h = (mask[3] - mask[1]) / sheetResourceHeight * canvas.height;
    const x2 = (x + w) / devicePixelRatio;
    const y2 = (y + h) / devicePixelRatio;

    if(mouseX >= x && mouseX <= x2 && mouseY >= y && mouseY <= y2) {
      magnifyingGlassVisible = false;
      return;
    } else {
      magnifyingGlassVisible = true;
    }

    if(magnifyCtx) {
      drawMagnifyingGlass(mouseX, mouseY);
    }
  }
  
  function drawMagnifyingGlass(mouseX, mouseY) {
    magnifyCtx.clearRect(0,0,175,175)
    magnifyCtx.drawImage(
      canvas, 
      mouseX * devicePixelRatio - magnifyAmount / 2, 
      mouseY * devicePixelRatio - magnifyAmount / 2, 
      magnifyAmount, magnifyAmount,
      0,0,175,175
    );
    magnifyCtx.filter = 'blur(12px)';
    magnifyCtx.beginPath();
    magnifyCtx.arc(175 / 2, 175 / 2, 175 / 2 - 15, Math.PI * 1, Math.PI * 1.5);
    magnifyCtx.lineWidth = 16;
    magnifyCtx.strokeStyle = '#ffffff55';
    magnifyCtx.stroke();
    magnifyCtx.filter = 'blur(2px)';
    magnifyCtx.beginPath();
    magnifyCtx.arc(175 / 2, 175 / 2, 175 / 2 - 15, Math.PI * 1.1, Math.PI * 1.4);
    magnifyCtx.lineWidth = 16;
    magnifyCtx.strokeStyle = '#ddeeff55';
    magnifyCtx.stroke();
    magnifyCtx.filter = 'none';
  }

  function onmousewheel(e) {
    if(magnifyingGlassVisible) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoom = e.deltaY > 0 ? 1.01 : 0.99;
      magnifyAmount *= zoom;

      drawMagnifyingGlass(mouseX, mouseY)

      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  } 

  function hideSheetOverlay() {
    mapStore.selectedMap = null;
    magnifyingGlassVisible = false;
    if(magnifyCtx) {
      magnifyCtx.clearRect(0,0,175,175)
    }
  }
</script>

<style>
  .sheetOverlayContainer {
    position: relative;
    width: 100vw;
    padding: 100px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #00000022;
  }

  .sheetOverlayMask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100px;
    height: 100px;
    background: red;
    z-index: 9;
  }

  .sheetOverlayCanvas {
    display: block;
    pointer-events: none;
    z-index: 10;
    box-shadow: 5px 5px 42px #00004488;
  }

  .magnifyingGlassCanvas {
    position: fixed;
    z-index: 11;
    box-shadow: 3px 3px 6px #00000055;
    border: 4px solid #ffffff22;
    border-radius: 100%;
    opacity: 0;
    transform: scale(0);
    transition: transform .3s;
  }
</style>

<svelte:window 
  bind:innerWidth={screenWidth} 
  bind:innerHeight={screenHeight} 
  bind:devicePixelRatio={devicePixelRatio}
  {onmousemove} 
/>

<div class="sheetOverlayContainer" style="height: {screenHeight - timelineStore.size}px">
  <canvas class="sheetOverlayCanvas" bind:this={canvas}></canvas>
  <canvas class="magnifyingGlassCanvas" 
    bind:this={magnifyCanvas} 
    width={175} height={175}
    style:transform={magnifyingGlassVisible ? 'scale(1)' : 'scale(0)'}
    style:opacity={magnifyingGlassVisible ? 1 : 0}
    {onmousewheel}
  ></canvas>
</div>
