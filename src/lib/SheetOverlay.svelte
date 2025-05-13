<script>
  import { mapStore } from '../stores/mapStore.svelte';

  let canvas;
  let ctx;

  let magnifyCanvas;
  let magnifyCtx;

  let screenWidth = $state(0)
  let screenHeight = $state(0);
  let devicePixelRatio = $state(1);

  let sheetImage = $state(null);
  let sheetWidth = $state(0);
  let sheetHeight = $state(0);

  let sheetPadding = $state(100);

  let showSheetMask = true;

  $effect(() => {
    if(!ctx) {
      ctx = canvas.getContext('2d');
      magnifyCtx = magnifyCanvas.getContext('2d');
      draw();

      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('keydown', e => {
        if(e.key === 'm') showSheetMask = !showSheetMask;
        if(e.key === 'Escape') hideSheetOverlay();
      });
    }

    resizeCanvas();

    if(mapStore.selectedMap && !sheetImage) {
      getSheetImage(mapStore.selectedMap).then(image => {
        sheetImage = image;
      })
    }
  })

  function resizeCanvas() {
    if(!ctx) return;
    canvas.width = screenWidth * devicePixelRatio;
    canvas.height = screenHeight * devicePixelRatio;
    canvas.style.width = `${(screenWidth)}px`;
    canvas.style.height = `${(screenHeight)}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    if(!sheetImage) return;
    const maxWidth = screenWidth - sheetPadding * 2;
    const maxHeight = screenHeight - sheetPadding * 2;
    const maxAspect = maxWidth / maxHeight;
    const sheetAspect = sheetImage.width / sheetImage.height;
    if(sheetAspect > maxAspect) {
      sheetWidth = Math.min(sheetImage.width, maxWidth);
      sheetHeight = sheetWidth / sheetAspect;
    } else {
      sheetHeight = Math.min(sheetImage.height, maxHeight);
      sheetWidth = sheetHeight * sheetAspect;
    }

  }

  async function getSheetImage(sheet) {
    const url = sheet.georeferencedMap.resource.id + `/full/full/0/default.jpg`;
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

  function draw() { // TODO: make this passive 
    requestAnimationFrame(draw);
    if(!mapStore.selectedMap) return;

    ctx.clearRect(0,0,screenWidth,screenHeight);
    ctx.fillStyle = '#00000022';
    ctx.fillRect(0,0,screenWidth,screenHeight);


    if(sheetImage) {
      ctx.save();
      ctx.drawImage(sheetImage, 
        sheetPadding, sheetPadding, sheetWidth, sheetHeight
      );

      if(showSheetMask) {
        const mask = mapStore.selectedMap.resourceMaskBbox;
        const resourceWidth = mapStore.selectedMap.georeferencedMap.resource.width;
        const resourceHeight = mapStore.selectedMap.georeferencedMap.resource.height;
        ctx.clearRect(
          mask[0] / resourceWidth * sheetWidth + sheetPadding,
          mask[1] / resourceHeight * sheetHeight + sheetPadding,
          (mask[2] - mask[0]) / resourceWidth * sheetWidth, 
          (mask[3] - mask[1]) / resourceHeight * sheetHeight, 
        )
      }
      ctx.restore();
    }
  }

  function showSheetOverlay() {

  }

  function hideSheetOverlay() {
    mapStore.selectedMap = null;
  }

  function showMagnifyingGlass() {
    magnifyCanvas.style.opacity = 1;
    magnifyCanvas.style.transform = 'scale(1)';
  }

  function hideMagnifyingGlass() {
    magnifyCanvas.style.transform = 'scale(0)';
    magnifyCanvas.style.opacity = 0;
  }

  let mouse = $state({ x: 0, y: 0 });

  function onmousemove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    if(mapStore.selectedMap) {
      const mask = mapStore.selectedMap.resourceMaskBbox;
      const resourceWidth = mapStore.selectedMap.georeferencedMap.resource.width;
      const resourceHeight = mapStore.selectedMap.georeferencedMap.resource.height;
      const x1 = mask[0] / resourceWidth * sheetWidth + sheetPadding;
      const y1 = mask[1] / resourceHeight * sheetHeight + sheetPadding;
      const x2 = (mask[2] - mask[0]) / resourceWidth * sheetWidth + sheetPadding;
      const y2 = (mask[3] - mask[1]) / resourceHeight * sheetHeight + sheetPadding;
      console.log(x1, y1, x2, y2);
      if(mouse.x >= x1 && mouse.x <= x2) {
        if(mouse.y >= y1 && mouse.y <= y2) {
          return hideMagnifyingGlass();
        }
      }
      if(mouse.x < sheetPadding || mouse.x > sheetPadding + sheetWidth) return hideMagnifyingGlass();
      if(mouse.y < sheetPadding || mouse.y > sheetPadding + sheetHeight) return hideMagnifyingGlass();
      showMagnifyingGlass();
      magnifyCanvas.style.left = `${mouse.x - magnifyCanvas.width / 2}px`;
      magnifyCanvas.style.top = `${mouse.y - magnifyCanvas.height / 2}px`;
    }

    if(magnifyCtx) {
      magnifyCtx.clearRect(0,0,175,175)
      magnifyCtx.drawImage(
        canvas, 
        mouse.x * 2 - 50, mouse.y * 2 - 50, 100, 100,
        0,0,175,175
      );
    }
  }
</script>

<svelte:window 
  bind:innerWidth={screenWidth} 
  bind:innerHeight={screenHeight} 
  bind:devicePixelRatio={devicePixelRatio}
  {onmousemove}
/>


<style>
  .sheetOverlayCanvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }

  .magnifyingGlassCanvas {
    position: fixed;
    z-index: 11;
    box-shadow: 3px 3px 6px #00000055;
    border: 4px solid #ffffff22;
    border-radius: 100%;
    pointer-events: none;
    opacity: 0;
    transform: scale(0);
    transition: transform .3s;
  }
</style>

<canvas class="sheetOverlayCanvas" bind:this={canvas}></canvas>
<canvas class="magnifyingGlassCanvas" bind:this={magnifyCanvas} width={175} height={175}></canvas>