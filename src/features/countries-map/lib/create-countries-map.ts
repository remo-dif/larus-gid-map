import type { MutableRefObject } from 'react';
import Feature, { type FeatureLike } from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import TileLayer from 'ol/layer/Tile';
import OlMap from 'ol/Map';
import type { Pixel } from 'ol/pixel';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import View from 'ol/View';
import { mapConfig } from './map-config';
import type { CountryStyles } from './country-styles';
import type { CountryFeature, Level1Data, Sublevel2Data } from '../model/country';

type CreateCountriesMapParams = {
  target: HTMLDivElement;
  hoveredFeatureRef: MutableRefObject<CountryFeature | null>;
  selectedFeaturesRef: MutableRefObject<CountryFeature[]>;
  styles: CountryStyles;
};

type CountriesMapContext = {
  abortCountryLoad: () => void;
  map: OlMap;
  countrySource: VectorSource<CountryFeature>;
  regionSource: VectorSource<CountryFeature>;
  sublevel2Source: VectorSource<CountryFeature>;
  findCountryAtPixel: (pixel: Pixel) => CountryFeature | null;
  findRegionAtPixel: (pixel: Pixel) => CountryFeature | null;
  findSublevel2AtPixel: (pixel: Pixel) => CountryFeature | null;
  setRegionFeatures: (geoJson: Level1Data) => CountryFeature[];
  setSublevel2Features: (geoJson: Sublevel2Data) => CountryFeature[];
};

function isCountryFeature(feature: FeatureLike): feature is CountryFeature {
  return feature instanceof Feature;
}

export function createCountriesMap({
  target,
  hoveredFeatureRef,
  selectedFeaturesRef,
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

      if (selectedFeaturesRef.current.includes(feature)) {
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

      if (selectedFeaturesRef.current.includes(feature)) {
        return styles.selected;
      }

      if (feature === hoveredFeatureRef.current) {
        return styles.hover;
      }

      return styles.region;
    },
  });

  const sublevel2Source = new VectorSource<CountryFeature>();
  const sublevel2Layer = new VectorLayer({
    source: sublevel2Source,
    declutter: false,
    style: (feature: FeatureLike) => {
      if (!isCountryFeature(feature)) {
        return styles.invisible;
      }

      if (selectedFeaturesRef.current.includes(feature)) {
        return styles.selected;
      }

      if (feature === hoveredFeatureRef.current) {
        return styles.hover;
      }

      return styles.sublevel2;
    },
  });

  const map = new OlMap({
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
      sublevel2Layer,
    ],
    view: new View({
      center: mapConfig.defaultCenter,
      zoom: mapConfig.defaultZoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
    }),
  });

  return {
    abortCountryLoad: () => {
      countryLoadController?.abort();
    },
    map,
    countrySource,
    regionSource,
    sublevel2Source,
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
    findSublevel2AtPixel: (pixel: Pixel) =>
      map.forEachFeatureAtPixel(pixel, (feature) => (isCountryFeature(feature) ? feature : null), {
        layerFilter: (layer) => layer === sublevel2Layer,
        hitTolerance: 2,
      }) || null,
    setRegionFeatures: (geoJson: Level1Data) => {
      // Replacing the source clears the previous country's regions before mounting the new ones.
      regionSource.clear();
      const features = countryFormat.readFeatures(geoJson);
      regionSource.addFeatures(features);
      return features;
    },
    setSublevel2Features: (geoJson: Sublevel2Data) => {
      sublevel2Source.clear();
      const features = countryFormat.readFeatures(geoJson);
      sublevel2Source.addFeatures(features);
      return features;
    },
  };
}
