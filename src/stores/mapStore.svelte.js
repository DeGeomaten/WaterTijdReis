
export const mapStore = $state({
  map: null,
  loaded: false,
  warpedMapLayers: {},
  metadata: {},
  visibleLayers: {},
  showBaseMap: true,
  showWater: false,
  showLabels: false,
  showAHN: false,
  showOSM: false,
  showProv: false,
  showLucht: false,
  showWTSc: false,
  warpedMapsInViewport: [],
  selectedMap: null,
  pointerScreenPos: { x: 0, y: 0 },
  layerOrder: {}
})


