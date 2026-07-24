import type { MutableRefObject } from 'react';
import type { FeatureLike } from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import Map from 'ol/Map';
import type { Pixel } from 'ol/pixel';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import View from 'ol/View';
import { mapConfig } from './map-config';
import type { CountryStyles } from './country-styles';
import type { CountryFeature } from '../model/country';

type CreateCountriesMapParams = {
  target: HTMLDivElement;
  hoveredFeatureRef: MutableRefObject<CountryFeature | null>;
  selectedFeatureRef: MutableRefObject<CountryFeature | null>;
  styles: CountryStyles;
};

type CountriesMapContext = {
  map: Map;
  countrySource: VectorSource<CountryFeature>;
  findCountryAtPixel: (pixel: Pixel) => CountryFeature | null;
};

export function createCountriesMap({
  target,
  hoveredFeatureRef,
  selectedFeatureRef,
  styles,
}: CreateCountriesMapParams): CountriesMapContext {
  const countrySource = new VectorSource<CountryFeature>({
    url: mapConfig.countriesGeoJsonUrl,
    format: new GeoJSON({
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    }),
  });

  const countryLayer = new VectorLayer({
    source: countrySource,
    declutter: false,
    style: (feature: FeatureLike) => {
      const countryFeature = feature as CountryFeature;

      if (countryFeature === selectedFeatureRef.current) {
        return styles.selected;
      }

      if (countryFeature === hoveredFeatureRef.current) {
        return styles.hover;
      }

      return styles.invisible;
    },
  });

  const map = new Map({
    target,
    layers: [
      new TileLayer({
        source: new OSM({
          url: mapConfig.osmTileUrl,
          attributions:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }),
      }),
      countryLayer,
    ],
    view: new View({
      center: mapConfig.defaultCenter,
      zoom: mapConfig.defaultZoom,
      minZoom: 2,
      maxZoom: 18,
    }),
  });

  return {
    map,
    countrySource,
    findCountryAtPixel: (pixel: Pixel) =>
      map.forEachFeatureAtPixel(pixel, (feature) => feature as CountryFeature, {
        layerFilter: (layer) => layer === countryLayer,
        hitTolerance: 2,
      }) || null,
  };
}
