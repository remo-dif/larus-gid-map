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
  regionSource: VectorSource<CountryFeature>;
  findCountryAtPixel: (pixel: Pixel) => CountryFeature | null;
  findRegionAtPixel: (pixel: Pixel) => CountryFeature | null;
  setRegionFeatures: (geoJson: object) => CountryFeature[];
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

  const regionSource = new VectorSource<CountryFeature>();
  // This layer is intentionally above world-raw so hover/click can target Level1 regions first.
  const regionLayer = new VectorLayer({
    source: regionSource,
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

      return styles.region;
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
      regionLayer,
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
    regionSource,
    findCountryAtPixel: (pixel: Pixel) =>
      map.forEachFeatureAtPixel(pixel, (feature) => (isCountryFeature(feature) ? feature : null), {
        layerFilter: (layer) => layer === countryLayer,
        hitTolerance: 2,
      }) || null,
    findRegionAtPixel: (pixel: Pixel) =>
      map.forEachFeatureAtPixel(pixel, (feature) => (isCountryFeature(feature) ? feature : null), {
        layerFilter: (layer) => layer === regionLayer,
        hitTolerance: 2,
      }) || null,
    setRegionFeatures: (geoJson: object) => {
      // Replacing the source clears the previous country's regions before mounting the new ones.
      regionSource.clear();
      const features = countryFormat.readFeatures(geoJson);
      regionSource.addFeatures(features);
      return features;
    },
  };
}
