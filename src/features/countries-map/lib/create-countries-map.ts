import type { MutableRefObject } from 'react';
import Feature, { type FeatureLike } from 'ol/Feature';
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
  abortCountryLoad: () => void;
  map: Map;
  countrySource: VectorSource<CountryFeature>;
  findCountryAtPixel: (pixel: Pixel) => CountryFeature | null;
};

function isCountryFeature(feature: FeatureLike): feature is CountryFeature {
  return feature instanceof Feature;
}

export function createCountriesMap({
  target,
  hoveredFeatureRef,
  selectedFeatureRef,
  styles,
}: CreateCountriesMapParams): CountriesMapContext {
  const countryFormat = new GeoJSON<CountryFeature>({
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
  let countryLoadController: AbortController | null = null;

  const countrySource = new VectorSource<CountryFeature>({
    loader: (extent, resolution, projection, success, failure) => {
      countryLoadController?.abort();
      countryLoadController = new AbortController();

      fetch(mapConfig.countriesGeoJsonUrl, {
        signal: countryLoadController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            failure?.();
            return null;
          }

          return response.json();
        })
        .then((geoJson) => {
          if (!geoJson) {
            return;
          }

          const features = countryFormat.readFeatures(geoJson, {
            extent,
            featureProjection: projection,
          });

          countrySource.addFeatures(features);
          success?.(features);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }

          failure?.();
        });
    },
  });

  const countryLayer = new VectorLayer({
    source: countrySource,
    declutter: false,
    style: (feature: FeatureLike) => {
      if (!isCountryFeature(feature)) {
        return styles.invisible;
      }

      if (feature === selectedFeatureRef.current) {
        return styles.selected;
      }

      if (feature === hoveredFeatureRef.current) {
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
    abortCountryLoad: () => {
      countryLoadController?.abort();
    },
    map,
    countrySource,
    findCountryAtPixel: (pixel: Pixel) =>
      map.forEachFeatureAtPixel(pixel, (feature) => (isCountryFeature(feature) ? feature : null), {
        layerFilter: (layer) => layer === countryLayer,
        hitTolerance: 2,
      }) || null,
  };
}
