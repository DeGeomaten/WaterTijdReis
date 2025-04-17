<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
	import type { WarpedMap } from '@allmaps/render';

  import { mapInstance } from '../stores/mapInstance';
  import { warpedMapLayers } from '../stores/warpedMapLayers';
  import { mapsInViewport } from '../stores/mapsInViewport';
  import { mapHoveredInTimeline } from '../stores/mapHoveredInTimeline';
	import { nonpassive } from 'svelte/legacy';

  import { lerp, easeInCubic, easeOutCubic, easeOutBounce } from '../stores/animation';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let dpr = 1;

  let timelineHorizontal = false;
  let timelineSize = 180;
  let timelineLength = 0;

  const MIN_YEAR = 1800;
  const MAX_YEAR = new Date().getFullYear();

  const mapThumbnailSize = timelineSize - 60;
  const mapThumbnailRotation = Math.PI / 25;


  let startYear = 1800;
  let endYear = 1950;
  let targetStartYear = startYear;
  let targetEndYear = endYear;

  let dragging = false;
  let dragStartY: number | null = null;

  let hoveredMap: Map | null = null;

  function yearToCanvas(year: number): number {
    const sy = Math.min(startYear, endYear);
    const ey = Math.max(startYear, endYear);
    return ((year - sy) / (ey - sy)) * timelineLength;
  }

  function canvasToYear(y: number): number {
    const sy = Math.min(startYear, endYear);
    const ey = Math.max(startYear, endYear);
    return sy + ((y / timelineLength) * (ey - sy));
  }

  onMount(() => {
    ctx = canvas.getContext('2d');

    resizeCanvas();
    draw();

    window.addEventListener('resize', resizeCanvas);
  });

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    timelineLength = timelineHorizontal ? innerWidth : innerHeight;

    canvas.width = timelineSize * dpr;
    canvas.height = timelineLength * dpr;
    if(timelineHorizontal) [canvas.width, canvas.height] = [canvas.height, canvas.width];
    canvas.style.width = `${timelineSize}px`;
    canvas.style.height = `${timelineLength}px`;
    if(timelineHorizontal) [canvas.style.width, canvas.style.height] = [canvas.style.height, canvas.style.width];

    ctx?.scale(dpr, dpr);
  }

  function draw() {
    if(!ctx) return;

    startYear = lerp(startYear, targetStartYear, 0.1);
    endYear = lerp(endYear, targetEndYear, 0.1);

    startYear = Math.max(MIN_YEAR, Math.min(startYear, MAX_YEAR));
    endYear = Math.max(MIN_YEAR, Math.min(endYear, MAX_YEAR));
    if (startYear > endYear) [startYear, endYear] = [endYear, startYear];


    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    drawTimeline(ctx, startYear, endYear, timelineHorizontal);

    updateMaps(get(mapsInViewport));

    hoveredMap = null;

    for (let i = maps.length - 1; i >= 0; i--) {
      const map = maps[i];
      map.hovered = false;
      if(!map.inViewPort) continue;

      if (!hoveredMap && map.contains(mouseX / dpr, mouseY / dpr)) {
        hoveredMap = map;
      }
    }

    if(hoveredMap) {
      hoveredMap.hovered = true;
      ctx.canvas.style.cursor = 'pointer';
      mapHoveredInTimeline.set(hoveredMap.warpedMap);
    } else {
      ctx.canvas.style.cursor = 'grab';
      mapHoveredInTimeline.set(null);
    }

    maps.forEach((map) => map.draw(ctx));
    hoveredMap?.draw(ctx);

    requestAnimationFrame(draw);
  }

  class Map {
    constructor(map: WarpedMap) {
      this.mapId = map.mapId;
      this.warpedMap = map;
      this.year = map.year || Math.round(Math.random() * 50) + 1850;
      this.inViewPort = true;
      this.inViewPortSince = new Date();

      this.mapImageWidth = map.georeferencedMap.resource.width;
      this.mapImageHeight = map.georeferencedMap.resource.height;
      this.thumbnailWidth = mapThumbnailSize;
      this.thumbnailHeight = (this.mapImageHeight / this.mapImageWidth) * mapThumbnailSize;
      this.rotation = (Math.random() - .5) * mapThumbnailRotation;
      this.cachedTilesForTexture = map.cachedTilesForTexture;
    }

    draw(ctx: CanvasRenderingContext2D) {
      const visibleTime = new Date() - this.inViewPortSince;
      if(!this.inViewPort && visibleTime > 200) return;
      
      const mapTimeOffsetY = yearToCanvas(this.year);
      const scaleFactor = this.mapImageWidth / mapThumbnailSize;

      if(this.hovered) {
        const height_aspect = this.mapImageHeight / this.mapImageWidth * mapThumbnailSize;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f55';
        ctx.strokeRect(
          10, mapTimeOffsetY,
          mapThumbnailSize, height_aspect
        )

        ctx.beginPath();
        ctx.moveTo(10 + mapThumbnailSize, mapTimeOffsetY + height_aspect / 2);
        ctx.lineTo(ctx.canvas.width - 10, mapTimeOffsetY + height_aspect / 2);
        ctx.stroke();
        ctx.closePath();

        ctx.fillStyle = '#f55';
        ctx.fillRect(
          timelineSize - 30, mapTimeOffsetY + height_aspect / 2 - 10,
          40, 
          20
        );

        ctx.fillStyle = '#fff';
        ctx.font = '12px IvyPresto Display';
        ctx.fillText(this.year, timelineSize - 25, mapTimeOffsetY + height_aspect / 2 + 4);
      }

      ctx.save();
      ctx.translate(10 + mapThumbnailSize / 2, mapTimeOffsetY + mapThumbnailSize / 2);
      ctx.rotate(this.hovered ? 0 : this.rotation);
      if (visibleTime <= 200) {
        const t = visibleTime / 200;

        const scale = this.inViewPort
          ? easeInCubic(t)         // bij binnenkomen
          : easeOutCubic(1 - t);     // bij verdwijnen (easing maar geen bounce)

        ctx.scale(scale, scale);
      }
      ctx.translate(-10 - mapThumbnailSize / 2, -mapTimeOffsetY - mapThumbnailSize / 2);

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

      }
      ctx.restore();
    }

    contains(x: number, y: number): boolean {
      const mapTimeOffsetY = yearToCanvas(this.year);
      const scaleFactor = this.mapImageWidth / mapThumbnailSize;

      const centerX = 10 + mapThumbnailSize / 2;
      const centerY = mapTimeOffsetY + mapThumbnailSize / 2;

      // Transformatie: draai muiscoördinaten terug
      const dx = x - centerX;
      const dy = y - centerY;
      const cos = Math.cos(-this.rotation);
      const sin = Math.sin(-this.rotation);
      const localX = dx * cos - dy * sin + mapThumbnailSize / 2;
      const localY = dx * sin + dy * cos + mapThumbnailSize / 2;

      // Vergelijk met bounding box
      return localX >= 0 && localX <= this.thumbnailWidth &&
            localY >= 0 && localY <= this.thumbnailHeight;
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

  function drawTimeline(
    ctx: CanvasRenderingContext2D,
    startYear: number,
    endYear: number,
    timelineHorizontal: boolean
  ) {
    const pixelsPerYear = timelineLength / (endYear - startYear);
    const labelStep = pixelsPerYear < 12 ? 25 : (pixelsPerYear < 30 ? 5 : 1);

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#f55';
    ctx.lineWidth = 1;

    const swap = (x,y) => 
      timelineHorizontal ? [x, y] : [y, x];

    for(let year = Math.ceil(startYear); year <= endYear; year += 1) {
      const pos = yearToCanvas(year);
      
      ctx.font = '12px IvyPresto Display';
      ctx.beginPath();
      ctx.lineWidth = 1;
      if(year % 100 === 0) {
        ctx.font = '600 14px IvyPresto Display';
        ctx.fillText(`${Math.round(year)}`, ...swap(pos + 4, timelineSize - 45));
        ctx.moveTo(...swap(pos, timelineSize - 12));
        ctx.lineWidth = 2;
      } else if(year % labelStep == 0) {
        ctx.fillText(`${Math.round(year)}`, ...swap(pos + 4, timelineSize - 38));
        ctx.moveTo(...swap(pos, timelineSize - 15));
      } else {
        ctx.moveTo(...swap(pos, timelineSize - 6));
      }
      ctx.lineTo(...swap(pos, timelineSize));
      ctx.stroke();
    }

    // for (let year = firstLabel; year <= endYear; year += yearStep) {
    //   const pos = yearToCanvas(year); 

    //   ctx.beginPath();

    //   if(year % 25 === 0) {
    //     ctx.fillText(`${year}`, timelineSize - 45, pos + 4);
    //     ctx.moveTo(timelineSize - 20, pos);
    //   } else if (year % 5 === 0) {
    //     if(pixelsPerYear > 10) ctx.fillText(`${year}`, timelineSize - 45, pos + 4);
    //     ctx.moveTo(timelineSize - 15, pos);
    //   } else {
    //     ctx.moveTo(timelineSize - 10, pos);
    //   }

    //   ctx.lineTo(timelineSize, pos);
    //   ctx.stroke();
    // }
  }

  function handlePointerDown(e: PointerEvent) {
    dragging = true;
    dragStartY = timelineHorizontal ? e.clientX : e.clientY;
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging || dragStartY === null) return;

    const dy = (timelineHorizontal ? e.clientX : e.clientY) - dragStartY;
    dragStartY = timelineHorizontal ? e.clientX : e.clientY;

    let yearDelta = (dy / timelineLength) * (targetEndYear - targetStartYear);
    if(targetStartYear - yearDelta < MIN_YEAR) yearDelta = targetStartYear - MIN_YEAR;
    if(targetEndYear - yearDelta > MAX_YEAR) yearDelta = targetEndYear - MAX_YEAR;

    targetStartYear = targetStartYear - yearDelta;
    targetEndYear = targetEndYear - yearDelta;
  }

  let mouseX = 0;
  let mouseY = 0;

  function handleMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * dpr;
    mouseY = (e.clientY - rect.top) * dpr;
  }

  function handlePointerUp() {
    dragging = false;
    dragStartY = null;
    mouseX = -1; 
    mouseY = -1;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();

    const zoomFactor = Math.min(Math.max(e.deltaY / 100, -0.2), 0.2);
    const zoomAmount = 1 + zoomFactor;
    const rect = canvas.getBoundingClientRect();
    const cursorY = timelineHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
    const cursorYear = canvasToYear(cursorY);

    let currentRange = targetEndYear - targetStartYear;
    let newRange = currentRange * zoomAmount;

    newRange = Math.max(newRange, 1); // Prevent zooming out too much

    let newStart = cursorYear - ((cursorYear - targetStartYear) / currentRange) * newRange;
    let newEnd = cursorYear + ((targetEndYear - cursorYear) / currentRange) * newRange;

    targetStartYear = Math.max(newStart, MIN_YEAR);
    targetEndYear = Math.min(newEnd, MAX_YEAR);
  }
</script>


<canvas
  bind:this={canvas}
  on:pointerdown={handlePointerDown}
  on:pointermove={(e) => { handlePointerMove(e); handleMouseMove(e); }}
  on:pointerup={handlePointerUp}
  on:pointerleave={handlePointerUp}
  on:wheel={handleWheel}
  class="timeline-canvas"
  style="{timelineHorizontal ? 'height: ' : 'width: '}{timelineSize}px; {timelineHorizontal ? 'width: 100vw;' : 'height: 100vh;'}"
></canvas>

<style>
  .timeline-canvas {
    position: fixed;
    bottom: 0;
    right: 0;
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