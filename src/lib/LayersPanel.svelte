<script>
	import { mapStore } from '../stores/mapStore.svelte';

	import StackPlus from 'phosphor-svelte/lib/StackPlus';
	import MapTrifold from 'phosphor-svelte/lib/MapTrifold';
	import DropSimple from 'phosphor-svelte/lib/DropSimple';
	import DotsSixVertical from 'phosphor-svelte/lib/DotsSixVertical';

	const editions = [1, 2, 3, 4, 5].map((i) => `editie_${i}`);
	for (let ed of editions) mapStore.visibleLayers[ed] = false;

	// mapStore.visibleLayers['editie_3'] = true;

	function onkeydown(e) {
		if (e.code.includes('Digit') && +e.code.slice(-1) <= 5) {
			const layerId = 'editie_' + e.code.slice(-1);
			toggleLayer(layerId);
		}
	}

	function toggleLayer(layerId) {
		mapStore.update((store) => {
			const newVisibleLayers = { ...store.visibleLayers };
			newVisibleLayers[layerId] = !newVisibleLayers[layerId];
			return {
				...store,
				visibleLayers: newVisibleLayers
			};
		});
	}
	let layers = [
		{
			id: 'waterstaatskaarten',
			label: 'Waterstaatskaarten',
			get checked() {
				return mapStore.showWSK;
			},
			set checked(val) {
				mapStore.showWSK = val;
			}
		},
		{
			id: 'background,landcover,park_national_park,park_nature_reserve,landuse_residential,landuse,waterway,boundary_county,boundary_state,water,water_shadow,aeroway-runway,aeroway-taxiway,waterway_label,tunnel_service_case,tunnel_minor_case,tunnel_sec_case,tunnel_pri_case,tunnel_trunk_case,tunnel_mot_case,tunnel_path,tunnel_service_fill,tunnel_minor_fill,tunnel_sec_fill,tunnel_pri_fill,tunnel_trunk_fill,tunnel_mot_fill,tunnel_rail,tunnel_rail_dash,road_service_case,road_minor_case,road_pri_case_ramp,road_trunk_case_ramp,road_mot_case_ramp,road_sec_case_noramp,road_pri_case_noramp,road_trunk_case_noramp,road_mot_case_noramp,road_path,road_service_fill,road_minor_fill,road_pri_fill_ramp,road_trunk_fill_ramp,road_mot_fill_ramp,road_sec_fill_noramp,road_pri_fill_noramp,road_trunk_fill_noramp,road_mot_fill_noramp,rail,rail_dash,bridge_service_case,bridge_minor_case,bridge_sec_case,bridge_pri_case,bridge_trunk_case,bridge_mot_case,bridge_path,bridge_service_fill,bridge_minor_fill,bridge_sec_fill,bridge_pri_fill,bridge_trunk_fill,bridge_mot_fill,building,building-top,boundary_country_outline,boundary_country_inner,watername_ocean,watername_sea,watername_lake,watername_lake_line,place_hamlet,place_suburbs,place_villages,place_town,place_country_2,place_country_1,place_state,place_continent,place_city_r6,place_city_r5,place_city_dot_r7,place_city_dot_r4,place_city_dot_r2,place_city_dot_z7,place_capital_dot_z7,poi_stadium,poi_park,roadname_minor,roadname_sec,roadname_pri,roadname_major,housenumber',
			label: 'Achtergrondkaart',
			get checked() {
				return mapStore.showBaseMap;
			},
			set checked(val) {
				mapStore.showBaseMap = val;
			}
		},
		{
			id: 'watername_ocean,watername_sea,watername_lake,watername_lake_line,place_hamlet,place_suburbs,place_villages,place_town,place_country_2,place_country_1,place_state,place_continent,place_city_r6,place_city_r5,place_city_dot_r7,place_city_dot_r4,place_city_dot_r2,place_city_dot_z7,place_capital_dot_z7,poi_stadium,poi_park,roadname_minor,roadname_sec,roadname_pri,roadname_major,housenumber',
			label: 'Plaatsnamen',
			get checked() {
				return mapStore.showLabels;
			},
			set checked(val) {
				mapStore.showLabels = val;
			}
		},
		{
			id: 'custom-water-layer',
			label: 'Waterwegen',
			get checked() {
				return mapStore.showWater;
			},
			set checked(val) {
				mapStore.showWater = val;
			}
		},

		{
			id: 'dsm-05-layer',
			label: 'AHN',
			get checked() {
				return mapStore.showAHN;
			},
			set checked(val) {
				mapStore.showAHN = val;
			}
		},

		{
			id: 'osm-base',
			label: 'OSM',
			get checked() {
				return mapStore.showOSM;
			},
			set checked(val) {
				mapStore.showOSM = val;
			}
		},

		{
			id: 'Provinciegebied',
			label: 'Provinciegrenzen',
			get checked() {
				return mapStore.showProv;
			},
			set checked(val) {
				mapStore.showProv = val;
			}
		},

		{
			id: 'luchtfoto-layer',
			label: 'Luchtfoto',
			get checked() {
				return mapStore.showLucht;
			},
			set checked(val) {
				mapStore.showLucht = val;
			}
		},

		{
			id: 'waterschapsgrenzen',
			label: 'Waterschapsgrenzen',
			get checked() {
				return mapStore.showWTSc;
			},
			set checked(val) {
				mapStore.showWTSc = val;
			}
		}
	];

	let draggedIndex = null;

	function handleDragStart(event, index) {
		draggedIndex = index;
		event.dataTransfer.effectAllowed = 'move';
	}

	function handleDragOver(event) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(event, index) {
		event.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;

		const updated = [...layers];
		const [movedItem] = updated.splice(draggedIndex, 1);
		updated.splice(index, 0, movedItem);
		layers = updated;
		draggedIndex = null;

		updateLayerOrderOnMap();
	}

	function updateLayerOrderOnMap() {
		const map = mapStore.maplibreInstance;
		if (!map || typeof map.getLayer !== 'function') return;

		const layerIds = layers.flatMap(layer => layer.id.split(',').map(id => id.trim())).reverse();
		
		for (let i = 0; i < layerIds.length; i++) {
			const layerId = layerIds[i];
			const nextLayerId = layerIds[i + 1] || undefined;

			try {
				map.moveLayer(layerId, nextLayerId);
			} catch (e) {
				console.warn(`Could not move layer ${layerId}`, e);
			}
		}
	}
</script>

<svelte:window {onkeydown} />

<div class="layerspanel">
	<h2>LAGEN</h2>
	<div class="layers-checkboxes">
		{#each layers as layer, i (layer.id)}
			<label
				class="draggable-layer"
				draggable="true"
				on:dragstart={(e) => handleDragStart(e, i)}
				on:dragover={handleDragOver}
				on:drop={(e) => handleDrop(e, i)}
			>
				<input
					type="checkbox"
					checked={layer.checked}
					on:change={() => (layer.checked = !layer.checked)}
				/>
				<i class="icon">{i + 1}</i>
				<span class="description">{layer.label}</span>
				<span class="drag-handle absolute right-3"><DotsSixVertical size={18}/></span>
			</label>
		{/each}

		
	</div>
</div>

<style>
	.layerspanel {
		position: absolute;
		top: 130px;
		left: 0;
		margin: 10px;
		padding: 15px;
		outline: 2px solid #00000000;
		outline-offset: 4px;
		border-radius: 4px;
		z-index: 1000;
		font-family: 'ivypresto-display', serif;
		font-weight: 300;
		font-style: normal;
		transition: all 0.3s;
	}
	.layerspanel:hover {
		background: #fff;
		margin-left: 20px;
		outline: 2px solid #00000022;
		outline-offset: 0px;
	}
	.layerspanel::before {
		position: absolute;
		content: '';
		top: 0;
		left: -20px;
		width: 20px;
		bottom: 0;
		transition: all 0.2s;
	}

	.layerspanel h2 {
		font-family: 'Inter';
		font-weight: 400;
		font-size: 11px;
		text-align: center;
		color: #22224477;
		opacity: 0;
		transition: opacity 0.3s;
	}
	.layerspanel:hover h2 {
		opacity: 1;
	}

	.layerspanel button {
		opacity: 0;
		transition: opacity 0.3s;
		font-family: 'Inter';
		font-size: 14px;
	}

	.layerspanel:hover button {
		opacity: 1;
	}

	.layerspanel .description {
		position: relative;
		left: -10px;
		opacity: 0;
		transition: all 0.3s;
		padding-right: 15px;
	}

	.layerspanel:hover .description {
		opacity: 1;
		left: 0;
		/* display: flex; */
	}

	.layerspanel hr {
		opacity: 0;
		margin: 5px;
		border: 0.5px solid #eee;
	}

	.layerspanel:hover hr {
		opacity: 1;
	}

	.layerspanel label {
		padding: 3px;
		display: block;
	}

	.layerspanel .icon {
		position: relative;
		left: -20px;
		top: -3px;
		font-size: 11px;
		opacity: 0.2;
		display: inline;
	}

	.layerspanel input[type='checkbox']:checked + .icon {
		color: white;
		opacity: 1;
	}

	.layerspanel input[type='checkbox'] {
		/* appearance: none; */
		background-color: transparent;
		appearance: none;
		width: 18px;
		height: 18px;
		background: #fff;
		border: 1px solid #00000022;
		border-radius: 4px;
		cursor: pointer;
		position: relative;
		top: 2px;
		left: -5px;
	}
	.layerspanel input[type='checkbox']:checked {
		background-color: #000;
		border: 1px solid #fff;
	}

	.drag-handle {
		margin-left: auto;
		right: 0;
		display: inline-block;
		justify-content: flex-end;
		cursor: grab;
		user-select: none;
		opacity: 0;
		transition:
			opacity 0.3s,
			transform 0.2s;
		padding-right: 5px;
	}

	.layerspanel:hover .drag-handle {
		opacity: 0.5;
	}

	.drag-handle:hover {
		transform: scale(1.2);
		opacity: 1;
	}

	.draggable-layer {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px;
		transition: background 0.2s;
	}
</style>
