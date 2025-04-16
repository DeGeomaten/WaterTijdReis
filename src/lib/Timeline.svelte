<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
	import type { WarpedMap } from '@allmaps/render';

  import { mapInstance } from '../stores/mapInstance';
  import { warpedMapLayers } from '../stores/warpedMapLayers';
  import { mapsInViewport } from '../stores/mapsInViewport';
	import { nonpassive } from 'svelte/legacy';

  let mainMap;
  mapInstance.subscribe((m) => {
    if (m) mainMap = m;
  });

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;

  let startYear = 1800;
  let endYear = 1950;
  let targetStartYear = startYear;
  let targetEndYear = endYear;
  const MIN_YEAR = 1800;
  const MAX_YEAR = new Date().getFullYear();

  const MAP_THUMBNAIL_SIZE = 120;
  const MAP_ROTATION_AMPLITUDE = Math.PI / 25;

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  let dragging = false;
  let dragStartY: number | null = null;

  function yearToCanvas(year: number): number {
    return ((year - startYear) / (endYear - startYear)) * height;
  }

  function canvasToYear(y: number): number {
    return (y / height) * (endYear - startYear) + startYear;
  }

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx?.scale(dpr, dpr);
  }

  function draw() {
    if(!ctx) return;

    startYear = lerp(startYear, targetStartYear, 0.1);
    endYear = lerp(endYear, targetEndYear, 0.1);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    drawTimeline(ctx, startYear, endYear);

    // const maps = get(mapsInViewport);
    updateMaps(get(mapsInViewport));
    maps.forEach((map) => map.draw(ctx));

    requestAnimationFrame(draw);
  }

  function easeOutBounce(x: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    else if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    else if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    else return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }

  function easeInCubic(x: number): number {
    return x * x * x;
  }

  function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
  }

  class Map {
    constructor(map: WarpedMap) {
      this.mapId = map.mapId;
      this.year = map.year || Math.round(Math.random() * 50) + 1850;
      this.inViewPort = true;
      this.inViewPortSince = new Date();

      this.mapImageWidth = map.georeferencedMap.resource.width;
      this.mapImageHeight = map.georeferencedMap.resource.height;
      this.rotation = (Math.random() - .5) * MAP_ROTATION_AMPLITUDE;
      this.cachedTilesForTexture = map.cachedTilesForTexture;
    }

    draw(ctx: CanvasRenderingContext2D) {
      const visibleTime = new Date() - this.inViewPortSince;
      if(!this.inViewPort && visibleTime > 300) return;
      
      const mapTimeOffsetY = yearToCanvas(this.year);
      const scaleFactor = this.mapImageWidth / MAP_THUMBNAIL_SIZE;

      ctx.save();
      ctx.translate(10 + MAP_THUMBNAIL_SIZE / 2, mapTimeOffsetY + MAP_THUMBNAIL_SIZE / 2);
      ctx.rotate(this.rotation);
      if (visibleTime <= 300) {
        const t = visibleTime / 300;

        const scale = this.inViewPort
          ? easeInCubic(t)         // bij binnenkomen
          : easeOutCubic(1 - t);     // bij verdwijnen (easing maar geen bounce)

        ctx.scale(scale, scale);
      }
      ctx.translate(-10 - MAP_THUMBNAIL_SIZE / 2, -mapTimeOffsetY - MAP_THUMBNAIL_SIZE / 2);

      for(const tile of this.cachedTilesForTexture) {
        let {x,y,width,height} = tile.imageRequest.region;
        x /= scaleFactor;
        y = y / scaleFactor + mapTimeOffsetY;
        width /= scaleFactor;
        height / scaleFactor;
        const tileScaleFactor = tile.tile.tileZoomLevel.scaleFactor;

        ctx.drawImage(
          tile.data, 
          0, 0, tile.imageRequest.size.width, tile.imageRequest.size.height, 
          10 + x, 
          y, 
          tile.imageRequest.size.width * tileScaleFactor / scaleFactor, 
          tile.imageRequest.size.height * tileScaleFactor / scaleFactor, 
        )

        ctx.strokeStyle = '#f55';
        ctx.strokeRect(
          10 + x, 
          y, 
          tile.imageRequest.size.width * tileScaleFactor / scaleFactor, 
          tile.imageRequest.size.height * tileScaleFactor / scaleFactor, 
        )

      }
      ctx.restore();
    }
  }

  let maps = [];

  function updateMaps(mapsInViewport) {
    const idsInViewport = new Set(mapsInViewport.map(m => m.mapId));

    for(const map of maps) {
      if(mapsInViewport.find(m => m.mapId === map.mapId)?.cachedTilesForTexture.length) map.cachedTilesForTexture = mapsInViewport.find(m => m.mapId === map.mapId)?.cachedTilesForTexture || [];
      if(!idsInViewport.has(map.mapId)) {
        if(map.inViewPort) map.inViewPortSince = new Date();
        map.inViewPort = false;
      } else if(!map.inViewPort) {
        map.inViewPortSince = new Date();
        map.inViewPort = true;
      }
    }

    for(const m of mapsInViewport) {
      if(!maps.some(existing => existing.mapId === m.mapId)) {
        maps.push(new Map(m));
      }
    }
  }

  function drawTimeline(ctx: CanvasRenderingContext2D, startYear: number, endYear: number) {
    const height = ctx.canvas.clientHeight;
    const totalYears = endYear - startYear;
    const pixelsPerYear = height / totalYears;

    const minLabelSpacing = 40; 
    const idealYearStep = minLabelSpacing / pixelsPerYear;
    const yearStep = Math.pow(10, Math.floor(Math.log10(idealYearStep)));

    const firstLabel = Math.ceil(startYear / yearStep) * yearStep;

    ctx.font = '12px IvyPresto Display';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#f55';
    ctx.lineWidth = 1;

    ctx.fillText(`${Math.round(startYear)}`, width - 45, 10 + 4);
    ctx.fillText(`${Math.round(endYear)}`, width - 45, height - 10 + 4);

    for (let year = firstLabel; year <= endYear; year += yearStep) {
      const yPos = yearToCanvas(year); 

      ctx.beginPath();

      if(year % 25 === 0) {
        ctx.fillText(`${year}`, width - 45, yPos + 4);
        ctx.moveTo(width - 20, yPos);
      } else if (year % 5 === 0) {
        if(pixelsPerYear > 10) ctx.fillText(`${year}`, width - 45, yPos + 4);
        ctx.moveTo(width - 15, yPos);
      } else {
        ctx.moveTo(width - 10, yPos);
      }

      ctx.lineTo(width, yPos);
      ctx.stroke();
    }
  }

  function handlePointerDown(e: PointerEvent) {
    dragging = true;
    dragStartY = e.clientY;
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging || dragStartY === null) return;

    const dy = e.clientY - dragStartY;
    dragStartY = e.clientY;

    let yearDelta = (dy / height) * (targetEndYear - targetStartYear);
    if(targetStartYear - yearDelta < MIN_YEAR) yearDelta = targetStartYear - MIN_YEAR;
    if(targetEndYear - yearDelta > MAX_YEAR) yearDelta = targetEndYear - MAX_YEAR;

    targetStartYear = targetStartYear - yearDelta;
    targetEndYear = targetEndYear - yearDelta;
  }

  function handlePointerUp() {
    dragging = false;
    dragStartY = null;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();

    const zoomAmount = e.deltaY / 100 + 1;
    const rect = canvas.getBoundingClientRect();
    const cursorY = e.clientY - rect.top;
    const cursorYear = canvasToYear(cursorY);

    const newRange = (targetEndYear - targetStartYear) * zoomAmount;
    let newStart = cursorYear - ((cursorYear - targetStartYear) * zoomAmount);
    let newEnd = newStart + newRange;

    targetStartYear = Math.max(newStart, MIN_YEAR);
    targetEndYear = Math.min(newEnd, MAX_YEAR);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    resizeCanvas();
    draw();
  });
</script>


<canvas
  bind:this={canvas}
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
  on:pointerleave={handlePointerUp}
  on:wheel={handleWheel}
  class="timeline-canvas"
></canvas>

<style>
  .timeline-canvas {
    position: fixed;
    top: 0;
    right: 0;
    width: 180px;
    height: 100%;
    background: #222;
    z-index: 10;
    box-shadow: inset 10px 0 20px -10px rgba(0, 0, 0, 1);
    cursor: grab;
    user-select: none;
  }

  .timeline-canvas:active {
    cursor: grabbing;
  }
</style>