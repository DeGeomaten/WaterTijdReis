<script>
  import { mapStore } from '../stores/mapStore.svelte';
  import { lerp, easeInCubic, easeOutCubic, easeOutBounce } from '../stores/animation.svelte';
  import { timelineStore } from '../stores/timelineStore.svelte';
	import { getIIIFMetadata } from '../stores/iiif-metadata.svelte';

  let canvas;
  let ctx;

  let screenWidth = $state(0)
  let screenHeight = $state(0);
  let devicePixelRatio = $state(1);
  let timelineLength = $derived(timelineStore.horizontal ? screenWidth : screenHeight);
  let timelineSize = $derived(timelineStore.size);

  let highlightColor = '#f55';

  const LABEL_SPACING = 40;
  let mapThumbnailPadding = $state(10);
  let mapThumbnailSize = $derived(timelineStore.size - mapThumbnailPadding * 2 - LABEL_SPACING);
  let maxMapThumbnailAspect = $state(1);
  let mapThumbnailRotation = Math.PI / 32;
  
  const mapThumbnails = $state(new Map());


  const MIN_YEAR = 1800;
  const MAX_YEAR = new Date().getFullYear();

  const MAX_RANGE = 1;

  let startYear = $state(MIN_YEAR + 50);
  let endYear = $state(MAX_YEAR);
  let pixelsPerYear = $derived(timelineLength / (endYear - startYear));

  let timelineExpanded = false;

  $effect(() => {
    if(!ctx) {
      ctx = canvas.getContext('2d');
      draw();

      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('keydown', e => {
        if(e.key === 't') timelineStore.horizontal = !timelineStore.horizontal;
        if(e.key === 's') timelineExpanded = !timelineExpanded;
      });
    }

    resizeCanvas();

    if(!timelineStore.loaded && mapStore.loaded) {
      setTimeout(initTimeline, 500);
    }
  });

  class MapThumbnailGroup {
    constructor(mapThumbnails) {
      this.mapThumbnails = mapThumbnails;
    }

    add(mapThumbnail) {
      this.mapThumbnails.push(mapThumbnail);
    }

    get expandedSize() {
      let totalSize = 0;
      for(let mapThumbnail of this.mapThumbnails) {
        totalSize += timelineStore.horizontal ? mapThumbnail.thumbnailWidth : mapThumbnail.thumbnailHeight;
      }
      return totalSize + mapThumbnailPadding * (this.mapThumbnails.length - 1)
    }

    get pileSize() {
      let maxSize = 0;
      for(let mapThumbnail of this.mapThumbnails) {
        const size = timelineStore.horizontal ? mapThumbnail.thumbnailWidth : mapThumbnail.thumbnailHeight;
        if(size > maxSize) maxSize = size;
      }
      return maxSize;
    }

    draw() {
      const from = this.pileSize + mapThumbnailPadding * 2;
      const to = this.expandedSize;
      let expandProgress = (pixelsPerYear - from) / (to - from);
      expandProgress = Math.max(Math.min(expandProgress, 1), 0);
      
      ctx.save();
      ctx.translate(...flipXY(0, -this.expandedSize / 2 * expandProgress))
      ctx.translate(...flipXY(0, this.mapThumbnails[0].thumbnailWidth / 2 * expandProgress));
      for(let mapThumbnail of this.mapThumbnails) {
        mapThumbnail.draw();
        if(timelineStore.horizontal) ctx.translate((mapThumbnail.thumbnailWidth + mapThumbnailPadding) * expandProgress, 0)
        else ctx.translate(0, (mapThumbnail.thumbnailHeight + mapThumbnailPadding) * expandProgress)
      }
      ctx.restore();

      if(expandProgress > .1) return;
      ctx.globalAlpha = 1 - expandProgress * 10;
      ctx.fillStyle = highlightColor;
      ctx.beginPath();
      ctx.arc(
        this.mapThumbnails[0].thumbnailX + this.mapThumbnails[0].thumbnailWidth / 2, 
        this.mapThumbnails[0].thumbnailY + this.mapThumbnails[0].thumbnailHeight / 2,
        10, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter';
      ctx.fillText(
        '+' + (this.mapThumbnails.length - 1),
        this.mapThumbnails[0].thumbnailX + this.mapThumbnails[0].thumbnailWidth / 2 - 6,
        this.mapThumbnails[0].thumbnailY + this.mapThumbnails[0].thumbnailHeight / 2 + 4
      );
      ctx.globalAlpha = 1;
    }
  }

  class MapThumbnail {
    constructor(warpedMap) {
      this.warpedMap = warpedMap;
      this.id = warpedMap.mapId;

      this.imageOriginalWidth = warpedMap.georeferencedMap.resource.width;
      this.imageOriginalHeight = warpedMap.georeferencedMap.resource.height;
      this.imageAspect = this.imageOriginalWidth / this.imageOriginalHeight;
      if(this.imageAspect > maxMapThumbnailAspect) 
        maxMapThumbnailAspect = this.imageAspect;
      
      this.imageUrl = warpedMap.georeferencedMap.resource.id + '/full/128,/0/default.jpg';
      this.imageLoaded = false;
      this.image = new Image();
      this.image.src = this.imageUrl;
      this.image.onerror = err => console.error(`Failed to load image: ${this.imageUrl}`, err);
      this.image.onload = () => this.imageLoaded = true;

      this.rotation = mapThumbnailRotation * (Math.random() - 0.5);

      // find out which edition this map belongs
      // TODO: this should be easier
      this.edition = Object.keys(mapStore.metadata).find(edition => 
        mapStore.metadata[edition].find(map => map.mapId == this.id)
      )
      this.year = mapStore.metadata[this.edition].find(map => map.mapId == this.id).hz;

      this.animating = {}
    }

    animate(property, from, to, duration = 200) {
      this.animating[property] = {
        targetValue: to,
        duration,
        startTime: performance.now(),
        getValue: () => {
          const elapsed = performance.now() - this.animating[property].startTime;
          const t = Math.min(elapsed / this.animating[property].duration, 1);
          return lerp(this[property] || 0, this.animating[property].targetValue, easeOutCubic(t));
        }
      }
    }

    get thumbnailX() {
      const x = yearToCanvas(this.year);
      return timelineStore.horizontal ? x - this.thumbnailWidth / 2 : mapThumbnailPadding;
    }
    get thumbnailY() {
      const y = yearToCanvas(this.year);
      return timelineStore.horizontal ? mapThumbnailPadding : y - this.thumbnailHeight / 2;
    }
    get thumbnailWidth() {
      return timelineStore.horizontal ? mapThumbnailSize * this.imageAspect : mapThumbnailSize;
    }
    get thumbnailHeight() {
      return timelineStore.horizontal ? mapThumbnailSize : mapThumbnailSize / this.imageAspect;
    }
    get thumbnailCenterX() {
      return this.thumbnailX + this.thumbnailWidth / 2;
    }
    get thumbnailCenterY() {
      return this.thumbnailY + this.thumbnailHeight / 2;
    }
    get thumbnailBB() {
      return [ this.thumbnailX, this.thumbnailY, this.thumbnailWidth, this.thumbnailHeight ]
    }

    set hovering(val) {
      if(this._hovering != val && val) {
        this.animate('rotation', this.rotation, 0, 200);
        this.animate('highlight', 0, 1, 200);
      } else if(this._hovering != val) {
        this.animate('rotation', 0, this.rotation, 200);
        this.animate('highlight', 1, 0, 200);
      }

      this._hovering = val;
    }
    get hovering() { return this._hovering }

    draw() {
      if(!ctx) return;

      ctx.save();
      ctx.translate(this.thumbnailCenterX, this.thumbnailCenterY);
      ctx.rotate(this.animating.rotation ? this.animating.rotation.getValue() : this.rotation);
      ctx.translate(-this.thumbnailCenterX, -this.thumbnailCenterY);

      ctx.fillStyle = '#ffffff11';
      ctx.fillRect(...this.thumbnailBB);

      if(this.imageLoaded) ctx.drawImage(this.image, ...this.thumbnailBB);

      if(this.hovering) {
        ctx.save();
        if(this.animating['highlight']) ctx.globalAlpha = this.animating['highlight'].getValue();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 6;
        ctx.strokeRect(...this.thumbnailBB);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  function getExpandedYearWidth(year) {
    const mapThumbnail = mapThumbnails.get(year);
    const pad = mapThumbnailPadding * 2;
    if(mapThumbnail instanceof MapThumbnail) 
      return timelineStore.horizontal ? 
        mapThumbnail.thumbnailWidth + pad : 
        mapThumbnail.thumbnailHeight + pad;
    if(mapThumbnail instanceof MapThumbnailGroup) 
      return mapThumbnail.expandedSize + pad;
    return mapThumbnailSize + pad;
  }

  function yearToCanvas(year) {
    if(!timelineExpanded) return ((year - startYear) / (endYear - startYear)) * timelineLength;

    const from = Math.min(year, startYear);
    const to = Math.max(year, startYear);
    let result = 0;

    for(let y = Math.floor(from); y < Math.ceil(to); ++y) {
      const fraction = (Math.min(to, y + 1) - Math.max(from, y));
      result += getExpandedYearWidth(y) * fraction;
    }

    return result * (year >= startYear ? 1 : -1);
  }

  function canvasToYear(y) {
    const sy = Math.min(startYear, endYear);
    const ey = Math.max(startYear, endYear);
    return sy + ((y / timelineLength) * (ey - sy));
  }

  function flipXY(x, y, x2, y2) {
    if(timelineStore.horizontal) {
      return x2 !== undefined && y2 !== undefined ? [x2, y2] : [y, x];
    } else return [x,y];
  }

  function panTimelineYears(deltaYears) {
    const maxDelta = MAX_YEAR - endYear;
    const minDelta = MIN_YEAR - startYear;
    deltaYears = Math.max(Math.min(deltaYears, maxDelta), minDelta);
    startYear += deltaYears;
    endYear += deltaYears;
  }

  function panTimelinePixels(deltaPixels) {
    const deltaYears = (deltaPixels / timelineLength) * (endYear - startYear);
    panTimelineYears(deltaYears);
  }

  function zoomTimeline(factor, center = (startYear + endYear) / 2) {
    const currentRange = endYear - startYear;
    let newRange = currentRange * factor;
    newRange = Math.max(newRange, MAX_RANGE);

    let newStartYear = center - ((center - startYear) / currentRange) * newRange;
    let newEndYear = center + ((endYear - center) / currentRange) * newRange;
    startYear = Math.max(MIN_YEAR, newStartYear);
    endYear = Math.min(MAX_YEAR, newEndYear);
  }

  function resizeCanvas() {
    if(!ctx) return;
    const horizontal = timelineStore.horizontal;
    canvas.width = (horizontal ? timelineLength : timelineSize) * devicePixelRatio;
    canvas.height = (horizontal ? timelineSize : timelineLength) * devicePixelRatio;
    canvas.style.width = `${(horizontal ? timelineLength : timelineSize)}px`;
    canvas.style.height = `${(horizontal ? timelineSize : timelineLength)}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  function initTimeline() {
    timelineStore.loaded = true;

    for(const edition of ['editie_2', 'editie_3']) {
      mapStore.warpedMapLayers[edition].renderer.warpedMapList.warpedMapsById.forEach(warpedMap => {
        const mapThumbnail = new MapThumbnail(warpedMap);
        if(!mapThumbnails.has(mapThumbnail.year)) 
          mapThumbnails.set(mapThumbnail.year, mapThumbnail);
        else if(mapThumbnails.get(mapThumbnail.year) instanceof MapThumbnailGroup) 
          mapThumbnails.get(mapThumbnail.year).add(mapThumbnail);
        else
          mapThumbnails.set(mapThumbnail.year, new MapThumbnailGroup([
            mapThumbnails.get(mapThumbnail.year), mapThumbnail
          ]))
      })
    }

  }

  function drawTimeline(ctx, startYear, endYear) {
    const labelSteps = [100, 25, 5, 1];
    const labelStepZoomThresholds = [0, 1, 12, 50];
    const labelStepZoomFadeIn = [0, 1, 6, 30];

    for(let year = Math.ceil(startYear); year <= endYear; year += 1) {
      let pos = yearToCanvas(year);
      if(timelineExpanded) pos += getExpandedYearWidth(year) / 2;

      ctx.font = '12px Inter';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = highlightColor;
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.moveTo(...flipXY(timelineSize - 6, pos));

      for(let i = 0; i < labelSteps.length; i++) {
        if(pixelsPerYear < labelStepZoomFadeIn[i] || year % labelSteps[i] != 0) continue;
        else if(pixelsPerYear < labelStepZoomThresholds[i]) {
          const fadeIn = (pixelsPerYear - labelStepZoomFadeIn[i]) / (labelStepZoomThresholds[i] - labelStepZoomFadeIn[i]);
          ctx.globalAlpha = easeInCubic(fadeIn);
          ctx.moveTo(...flipXY(timelineSize - 6 - 6 * fadeIn, pos));
        } 
        else ctx.moveTo(...flipXY(timelineSize - 12, pos));

        const textWidth = ctx.measureText(`${Math.round(year)}`).width;
        ctx.fillText(`${Math.round(year)}`, ...flipXY(
          timelineSize - 38, pos + 4,
          pos - textWidth / 2, timelineSize - 20
        ));

        if(timelineExpanded && year % 2 == 0) { // TODO: FLIP
          ctx.fillRect(
            yearToCanvas(year), 0,
            yearToCanvas(year + 1) - yearToCanvas(year), 100
          )
        }

        ctx.globalAlpha = 1;
        break;
      }

      ctx.lineTo(...flipXY(timelineSize, pos));
      ctx.stroke();
    }
  }

  function draw() {
    
    if(timelinePanning) {
      panTimelinePixels(timelinePanning);
      timelinePanning *= .95;
    }
    
    if(timelineZooming) {
      zoomTimeline(timelineZooming, timelineZoomingCenter);
      timelineZooming = (1 - timelineZooming) * .1 + 1;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTimeline(ctx, startYear, endYear);

    for(let mapThumbnail of mapThumbnails.values()) {
      if(mapThumbnail) {
        mapThumbnail.draw();
      }
    }

    requestAnimationFrame(draw);
  }

  function mapThumbnailAt(x,y) {
    if(timelineStore.horizontal) y -= screenHeight - timelineSize;
    else x -= screenWidth - timelineSize;

    for(let mapThumbnail of Array.from(mapThumbnails.values()).toReversed()) {
      const [x2, y2] = [
        mapThumbnail.thumbnailX + mapThumbnail.thumbnailWidth, 
        mapThumbnail.thumbnailY + mapThumbnail.thumbnailHeight
      ];

      if(x < x2 && y < y2 && x > mapThumbnail.thumbnailX && y > mapThumbnail.thumbnailY) {
        return mapThumbnail;
      }
    }
  }

  let lastHoveredMap = null;
  let hoverTimeout = null;

  function setHoveredMapThumbnail(mapThumbnail) {
    mapThumbnail.hovering = true;
    timelineStore.hoveredMap = mapThumbnail.warpedMap;
    timelineStore.hoverX = mapThumbnail.thumbnailCenterX;
    timelineStore.hoverY = mapThumbnail.thumbnailCenterY;
    if(timelineStore.horizontal) timelineStore.hoverY += screenHeight - timelineSize;
    else timelineStore.hoverX += screenWidth - timelineSize;
  }

  function resetHoveredMapThumbnail() {
    mapThumbnails.forEach(m => m.hovering = false);
    timelineStore.hoveredMap = null;
    clearTimeout(hoverTimeout);
  }

  let timelinePanning = 0;
  function onpointermove(e) {
    const mapThumbnail = mapThumbnailAt(e.clientX, e.clientY);
    if(mapThumbnail != lastHoveredMap) {
      resetHoveredMapThumbnail();
      if(mapThumbnail) hoverTimeout = setTimeout(() => setHoveredMapThumbnail(mapThumbnail), 500);
    }
    lastHoveredMap = mapThumbnail;

    if(e.buttons == 1) {
      timelinePanning = timelineStore.horizontal ? -e.movementX : -e.movementY;
    }
  }

  function onmouseout() {
    resetHoveredMapThumbnail();
  }

  let timelineZooming = 0;
  let timelineZoomingCenter = 0;
  function onwheel(e) {
    const zoomFactor = 1 + Math.min(Math.max(e.deltaY / 100, -0.1), 0.1);
    timelineZooming = zoomFactor;
    timelineZoomingCenter = canvasToYear(timelineStore.horizontal ? e.clientX : e.clientY);
    e.preventDefault();
  }


  function handleResize(newSize) {
    timelineStore.size = newSize;
    if(timelineStore.horizontal) document.querySelector('.resizer').style.bottom = `${timelineSize}px`;
    else document.querySelector('.resizer').style.right = `${timelineSize}px`;
    resizeCanvas();
  }

  function startResize(event) {
    const start = timelineStore.horizontal ? event.clientY : event.clientX;
    const startSize = timelineSize;

    function onMove(e) {
      const delta = (timelineStore.horizontal ? e.clientY : e.clientX) - start;
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

<svelte:window 
  bind:innerWidth={screenWidth} 
  bind:innerHeight={screenHeight} 
  bind:devicePixelRatio={devicePixelRatio}
/>

<canvas
  bind:this={canvas}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  {onmouseout}
  {onwheel}
  class="timeline-canvas"
  style="{timelineStore.horizontal ? 'height: ' : 'width: '}{timelineSize}px; {timelineStore.horizontal ? 'width: 100vw;' : 'height: 100vh;'}"
></canvas>

<div
  class="resizer {timelineStore.horizontal ? 'horizontal' : 'vertical'}"
  onmousedown={startResize}
/>

<style>
  .timeline-canvas {
    position: fixed;
    bottom: 0;
    right: 0;
    background: #224;
    z-index: 2;
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
    z-index: 2;
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