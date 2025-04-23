<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
	import type { WarpedMap } from '@allmaps/render';

  import { mapsInViewport } from '../stores/mapsInViewport';
  import { timelineHorizontal, timelineSize, mapHoveredInTimeline, mapHoveredInTimelineX, mapHoveredInTimelineY, mapClickedInTimeline } from '../stores/timeline';

  import { lerp, easeInCubic, easeOutCubic, easeOutBounce } from '../stores/animation';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let dpr = 1;

  let timelineLength = 0;

  const MIN_YEAR = 1800;
  const MAX_YEAR = new Date().getFullYear();

  let mapThumbnailSize = $timelineSize - 60;
  let mapThumbnailRotation = Math.PI / 25;

  let startYear = 1800;
  let endYear = 1950;
  let targetStartYear = startYear;
  let targetEndYear = endYear;

  let dragging = false;
  let dragStart: number | null = null;

  let hoveredMap: Map | null = null;

  let highlightColor = '#f55';

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

  $: if($timelineHorizontal) {
    resizeCanvas();
  } else {
    // if(ctx) resizeCanvas();
  }

  onMount(() => {
    ctx = canvas.getContext('2d');

    resizeCanvas();
    draw();

    window.addEventListener('resize', resizeCanvas);
  });

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    timelineLength = $timelineHorizontal ? innerWidth : innerHeight;
    mapThumbnailSize = $timelineSize - 60;

    canvas.width = $timelineSize * dpr;
    canvas.height = timelineLength * dpr;
    if($timelineHorizontal) [canvas.width, canvas.height] = [canvas.height, canvas.width];
    canvas.style.width = `${$timelineSize}px`;
    canvas.style.height = `${timelineLength}px`;
    if($timelineHorizontal) [canvas.style.width, canvas.style.height] = [canvas.style.height, canvas.style.width];

    ctx?.scale(dpr, dpr);
  }

  function draw() {
    if(!ctx) return;

    startYear = lerp(startYear, targetStartYear, 0.1);
    endYear = lerp(endYear, targetEndYear, 0.1);

    startYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, startYear));
    endYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, endYear));

    startYear = Math.max(MIN_YEAR, Math.min(startYear, MAX_YEAR));
    endYear = Math.max(MIN_YEAR, Math.min(endYear, MAX_YEAR));
    if (startYear > endYear) [startYear, endYear] = [endYear, startYear];


    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    drawTimeline(ctx, startYear, endYear, $timelineHorizontal);

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
      mapHoveredInTimelineX.set(hoveredMap.thumbnailCenterX);
      mapHoveredInTimelineY.set(hoveredMap.thumbnailCenterY);
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
      this.rotation = (Math.random() - .5) * mapThumbnailRotation;
      this.cachedTilesForTexture = map.cachedTilesForTexture;
    }

    get thumbnailX() {
      const mapTimeOffset = yearToCanvas(this.year);
      return $timelineHorizontal ? mapTimeOffset - this.thumbnailWidth / 2 : 10;
    }
    get thumbnailY() {
      const mapTimeOffset = yearToCanvas(this.year);
      return $timelineHorizontal ? 10 : mapTimeOffset - this.thumbnailHeight / 2;
    }

    get thumbnailWidth() {
      return $timelineHorizontal ? mapThumbnailSize * (this.mapImageWidth / this.mapImageHeight) : mapThumbnailSize;
    }
    get thumbnailHeight() {
      return $timelineHorizontal ? mapThumbnailSize : mapThumbnailSize * (this.mapImageHeight / this.mapImageWidth);
    }

    get thumbnailCenterX() {
      return this.thumbnailX + this.thumbnailWidth / 2;
    }
    get thumbnailCenterY() {
      return this.thumbnailY + this.thumbnailHeight / 2;
    }

    contains(x: number, y: number): boolean {
      const dx = x - this.thumbnailCenterX;
      const dy = y - this.thumbnailCenterY;
      const cos = Math.cos(-this.rotation);
      const sin = Math.sin(-this.rotation);
      const localX = dx * cos - dy * sin + mapThumbnailSize / 2;
      const localY = dx * sin + dy * cos + mapThumbnailSize / 2;

      return localX >= 0 && localX <= this.thumbnailWidth &&
            localY >= 0 && localY <= this.thumbnailHeight;
    }

    draw(ctx: CanvasRenderingContext2D) {
      const visibleTime = new Date() - this.inViewPortSince;
      if(!this.inViewPort && visibleTime > 200) return;
      
      const mapTimeOffset = yearToCanvas(this.year);
      const scaleFactor = this.mapImageWidth / this.thumbnailWidth;

      if(this.hovered) {
        ctx.strokeStyle = highlightColor;
        ctx.strokeRect(
          this.thumbnailX - 1, this.thumbnailY - 1,
          this.thumbnailWidth + 2, this.thumbnailHeight + 2
        );

        ctx.beginPath();
        ctx.moveTo(...flipXY(
          this.thumbnailX + this.thumbnailWidth, this.thumbnailCenterY,
          this.thumbnailCenterX, this.thumbnailY + this.thumbnailHeight
        ));
        ctx.lineTo(...flipXY(
          $timelineSize, this.thumbnailCenterY,
          this.thumbnailCenterX, $timelineSize
        ));
        // ctx.moveTo(this.thumbnailX + this.thumbnailWidth, this.thumbnailCenterY)
        // ctx.lineTo($timelineSize, this.thumbnailCenterY);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '12px IvyPresto Display';
        ctx.fillStyle = highlightColor;
        ctx.fillRect(
          ...flipXY(
            $timelineSize - 30, this.thumbnailCenterY - 7,
            this.thumbnailCenterX - 15, $timelineSize - 15,
          ),
          30, 15
        );

        ctx.fillStyle = '#000';
        ctx.fillText(
          this.year, 
          ...flipXY(
            $timelineSize - ctx.measureText(this.year).width - 3, this.thumbnailCenterY + 5,
            this.thumbnailCenterX - ctx.measureText(this.year).width / 2, $timelineSize - 3,
          )
        );
      }

      ctx.save();
      ctx.translate(this.thumbnailCenterX, this.thumbnailCenterY);
      ctx.rotate(this.hovered ? 0 : this.rotation);
      if (visibleTime <= 200) {
        const scale = this.inViewPort
          ? easeOutBounce(visibleTime / 200) 
          : easeOutCubic(1 - visibleTime / 200); 

        ctx.scale(scale, scale);
      }
      ctx.translate(-this.thumbnailCenterX, -this.thumbnailCenterY);

      for(const tile of this.cachedTilesForTexture) {
        const x = tile.imageRequest.region.x / this.mapImageWidth * this.thumbnailWidth;
        const y = tile.imageRequest.region.y / this.mapImageHeight * this.thumbnailHeight;
        const width = tile.imageRequest.region.width / this.mapImageWidth * this.thumbnailWidth;
        const height = tile.imageRequest.region.height / this.mapImageHeight * this.thumbnailHeight;

        ctx.drawImage(
          tile.data, 
          0, 0, tile.imageRequest.size.width, tile.imageRequest.size.height, 
          this.thumbnailX + x, this.thumbnailY + y,
          width, height
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

  function flipXY(x: number, y: number, x2?: number, y2?: number): [number, number] {
    if ($timelineHorizontal) {
      return x2 !== undefined && y2 !== undefined ? [x2, y2] : [y, x];
    } else {
      return [x,y];
    }
  }

  function drawTimeline(
    ctx: CanvasRenderingContext2D,
    startYear: number,
    endYear: number
  ) {
    const pixelsPerYear = timelineLength / (endYear - startYear);
    const labelStep = pixelsPerYear < 12 ? 25 : (pixelsPerYear < 30 ? 5 : 1);

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = 1;

    for(let year = Math.ceil(startYear); year <= endYear; year += 1) {
      const pos = yearToCanvas(year);
      
      ctx.font = '12px IvyPresto Display';
      ctx.beginPath();
      ctx.lineWidth = 1;
      if(year % 100 === 0) {
        ctx.font = '600 14px IvyPresto Display';
        const textWidth = ctx.measureText(`${Math.round(year)}`).width;
        ctx.fillText(`${Math.round(year)}`, ...flipXY(
            $timelineSize - textWidth - 15, pos + 4, 
            pos - textWidth / 2, $timelineSize - 20,
        ));
        ctx.moveTo(...flipXY($timelineSize - 12, pos));
        ctx.lineWidth = 2;
      } else if(year % labelStep == 0) {
        const textWidth = ctx.measureText(`${Math.round(year)}`).width;
        ctx.fillText(`${Math.round(year)}`, ...flipXY(
          $timelineSize - 38, pos + 4,
          pos - textWidth / 2, $timelineSize - 20
        ));
        ctx.moveTo(...flipXY($timelineSize - 15, pos));
      } else {
        ctx.moveTo(...flipXY($timelineSize - 6, pos));
      }
      ctx.lineTo(...flipXY($timelineSize, pos));
      ctx.stroke();
    }
  }

  function handlePointerDown(e: PointerEvent) {
    dragging = true;
    dragStart = $timelineHorizontal ? e.clientX : e.clientY;
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging || dragStart === null) return;

    const dy = ($timelineHorizontal ? e.clientX : e.clientY) - dragStart;
    dragStart = $timelineHorizontal ? e.clientX : e.clientY;

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
    dragStart = null;
    mouseX = -1; 
    mouseY = -1;

    if(Math.abs(targetEndYear - endYear) < .001) {
      mapClickedInTimeline.set(hoveredMap.warpedMap); // TODO: this is just a temporary fix
    }
  }

  function handlePointerLeave() { // TODO: merge these
    dragging = false;
    dragStart = null;
    mouseX = -1; 
    mouseY = -1;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();

    const zoomFactor = Math.min(Math.max(e.deltaY / 100, -0.2), 0.2);
    const zoomAmount = 1 + zoomFactor;
    const rect = canvas.getBoundingClientRect();
    const cursorY = $timelineHorizontal ? e.clientX - rect.left : e.clientY - rect.top;
    const cursorYear = canvasToYear(cursorY);

    let currentRange = targetEndYear - targetStartYear;
    let newRange = currentRange * zoomAmount;

    newRange = Math.max(newRange, 1);

    let newStart = cursorYear - ((cursorYear - targetStartYear) / currentRange) * newRange;
    let newEnd = cursorYear + ((targetEndYear - cursorYear) / currentRange) * newRange;

    targetStartYear = Math.max(newStart, MIN_YEAR);
    targetEndYear = Math.min(newEnd, MAX_YEAR);
  }

  function handleResize(newSize: number) {
    timelineSize.set(newSize);
    if($timelineHorizontal) document.querySelector('.resizer').style.bottom = `${$timelineSize}px`;
    else document.querySelector('.resizer').style.right = `${$timelineSize}px`;
    resizeCanvas();
  }

  function startResize(event: MouseEvent) {
    const start = $timelineHorizontal ? event.clientY : event.clientX;
    const startSize = $timelineSize;

    function onMove(e: MouseEvent) {
      const delta = ($timelineHorizontal ? e.clientY : e.clientX) - start;
      handleResize(Math.min(Math.max(100, startSize - delta), 400));
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
</script>


<canvas
  bind:this={canvas}
  on:pointerdown={handlePointerDown}
  on:pointermove={(e) => { handlePointerMove(e); handleMouseMove(e); }}
  on:pointerup={handlePointerUp}
  on:pointerleave={handlePointerLeave}
  on:wheel={handleWheel}
  class="timeline-canvas"
  style="{$timelineHorizontal ? 'height: ' : 'width: '}{$timelineSize}px; {$timelineHorizontal ? 'width: 100vw;' : 'height: 100vh;'}"
></canvas>

<div
  class="resizer {$timelineHorizontal ? 'horizontal' : 'vertical'}"
  on:mousedown={startResize}
/>

<style>
  .timeline-canvas {
    position: fixed;
    bottom: 0;
    right: 0;
    background: #224;
    z-index: 10;
    box-shadow: inset 10px 0 20px -10px rgba(0, 0, 0, 1);
    cursor: grab;
    user-select: none;
  }

  .timeline-canvas:active {
    cursor: grabbing;
  }

  .resizer {
    position: absolute;
    background: #222244aa;
    z-index: 10;
    cursor: ew-resize;
  }

  .resizer.horizontal {
    width: 100%;
    height: 5px;
    bottom: 160px;
    /* margin-bottom: -4px; */
    left: 0;
    cursor: ns-resize;
  }

  .resizer.vertical {
    width: 5px;
    height: 100%;
    top: 0;
    right: 160px;
    /* margin-right: -4px; */
    cursor: ew-resize;
  }
</style>