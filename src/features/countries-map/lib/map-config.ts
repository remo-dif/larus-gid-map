import { fromLonLat } from 'ol/proj';

export const mapConfig = {
  animationDuration: 850,
  countriesGeoJsonUrl: import.meta.env.VITE_COUNTRIES_GEOJSON_URL || '/countries/world_raw.geojson',
  level1GeoJsonUrl: (countryCode: string) => `/level1/${countryCode}.geojson`,
  initialCountryCode: 'IT',
  defaultCenter: fromLonLat([12.5, 42.5]),
  defaultZoom: 5,
  minZoom: 2,
  drawerWidth: 520,
  maxCountryZoom: 7,
  maxZoom: 18,
  osmTileUrl: import.meta.env.VITE_OSM_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
} as const;
