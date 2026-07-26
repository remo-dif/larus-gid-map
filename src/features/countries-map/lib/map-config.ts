import { fromLonLat } from 'ol/proj';

export const mapConfig = {
  animationDuration: 850,
  countriesGeoJsonUrl: import.meta.env.VITE_COUNTRIES_GEOJSON_URL || '/countries/world_raw.geojson',
  defaultCenter: fromLonLat([12.5, 42.5]),
  defaultZoom: 5,
  drawerWidth: 520,
  maxCountryZoom: 7,
  osmTileUrl: import.meta.env.VITE_OSM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
} as const;
