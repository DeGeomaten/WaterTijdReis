<script>
  import { onMount } from 'svelte';
  import { mapsInViewport } from '../stores/mapsInViewport';

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  }

  let mapImage;
  const imageURL = 'https://objects.library.uu.nl/fcgi-bin/iipsrv.fcgi?IIIF=/manifestation/viewer/97/10/27/9710272545801116399999795570251201778.jp2/0,0,8193,6639/4096,/0/default.jpg';
  loadImage(imageURL)
  .then(img => { mapImage = img; draw(); })
  .catch((err) => {
    console.error('Error loading image:', err);
  });


  const resourceMask = [241 / 2 - 38, 250 / 2 - 35, 4959 / 2 - 50, 6163 / 2 - 65];
  
  function draw() {
    requestAnimationFrame(draw);

    const canvas = document.querySelector('.sheetOverlayCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = innerWidth;
    const height = canvas.height = innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0,0,width, height);
    
    ctx.translate(centerX, centerY);
    ctx.scale(.2,.2)
    

    ctx.drawImage(
      mapImage, 
      - mapImage.width / 2, 
      - mapImage.height / 2, 
      mapImage.width, mapImage.height
    );
    ctx.clearRect(
      resourceMask[0] - mapImage.width / 2, 
      resourceMask[1] - mapImage.height / 2, 
      resourceMask[2], resourceMask[3]
    );

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  
  onMount(() => {

  });

  let mouseX = 0;
  let mouseY = 0;
  function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }
</script>

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
</style>

<canvas class="sheetOverlayCanvas" on:mousemove={handleMouseMove}></canvas>