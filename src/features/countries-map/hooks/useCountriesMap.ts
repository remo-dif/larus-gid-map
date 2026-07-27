import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OlMap from 'ol/Map';
import { unByKey } from 'ol/Observable';
import { createEmpty, extend } from 'ol/extent';
import { Level1DataFetchError, useLevel1DataCache } from '../context/Level1DataCacheContext';
import { createCountriesMap } from '../lib/create-countries-map';
import { createCountryStyles } from '../lib/country-styles';
import { mapConfig } from '../lib/map-config';
import {
  getCountryInfo,
  getRegionInfo,
  type CountryFeature,
  type CountryInfo,
  type Level1Data,
  type RegionInfo,
} from '../model/country';

type UseCountriesMapResult = {
  clearSelection: () => void;
  countries: CountryInfo[];
  drawerOpen: boolean;
  isLoadingCountries: boolean;
  loadError: string | null;
  mapElementRef: React.RefObject<HTMLDivElement | null>;
  regions: RegionInfo[];
  selectionError: string | null;
  setLoadError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectionError: React.Dispatch<React.SetStateAction<string | null>>;
  selectCountryByCode: (countryCode: string) => void;
  selectRegionByCode: (regionCode: string) => void;
  selectedCountry: CountryInfo | null;
  selectedCountryCode: string;
  selectedRegionCode: string;
  zoomIn: () => void;
  zoomOut: () => void;
};

type ViewPadding = [number, number, number, number];

function refreshFeature(feature: CountryFeature | null) {
  if (feature) {
    feature.changed();
  }
}

function refreshFeatures(features: CountryFeature[]) {
  features.forEach(refreshFeature);
}

function clampZoom(zoom: number) {
  return Math.min(mapConfig.maxZoom, Math.max(mapConfig.minZoom, zoom));
}

export function useCountriesMap(): UseCountriesMapResult {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OlMap | null>(null);
  const countryFeaturesByCodeRef = useRef<Map<string, CountryFeature[]>>(new Map());
  const regionFeaturesByCodeRef = useRef<Map<string, CountryFeature>>(new Map());
  const regionLoadControllerRef = useRef<AbortController | null>(null);
  const clearRegionFeaturesRef = useRef<(() => void) | null>(null);
  const setRegionFeaturesRef = useRef<((geoJson: Level1Data) => CountryFeature[]) | null>(null);
  const didFitInitialCountryRef = useRef(false);
  const selectedCountryCodeRef = useRef('');
  const hoveredFeatureRef = useRef<CountryFeature | null>(null);
  const selectedFeaturesRef = useRef<CountryFeature[]>([]);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedRegionCode, setSelectedRegionCode] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loadLevel1Data } = useLevel1DataCache();
  const styles = useMemo(() => createCountryStyles(), []);

  const zoomBy = useCallback((step: number) => {
    const view = mapRef.current?.getView();
    if (!view) {
      return;
    }

    view.animate({
      duration: mapConfig.animationDuration,
      zoom: clampZoom((view.getZoom() ?? mapConfig.defaultZoom) + step),
    });
  }, []);

  const zoomIn = useCallback(() => zoomBy(1), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(-1), [zoomBy]);

  const clearSelection = useCallback(() => {
    const currentSelected = selectedFeaturesRef.current;
    const currentHovered = hoveredFeatureRef.current;
    selectedFeaturesRef.current = [];
    hoveredFeatureRef.current = null;
    regionLoadControllerRef.current?.abort();
    clearRegionFeaturesRef.current?.();
    regionFeaturesByCodeRef.current = new Map();
    setRegions([]);
    setSelectedCountry(null);
    setSelectedCountryCode('');
    setSelectedRegionCode('');
    selectedCountryCodeRef.current = '';
    setDrawerOpen(false);
    refreshFeatures(currentSelected);
    refreshFeature(currentHovered);
    mapRef.current?.getTargetElement().style.removeProperty('cursor');
  }, []);

  const fitFeatures = useCallback((features: CountryFeature[], padding?: ViewPadding) => {
    const map = mapRef.current;
    if (!map || features.length === 0) {
      return;
    }

    const extent = features.reduce((combinedExtent, feature) => {
      const geometry = feature.getGeometry();
      return geometry ? extend(combinedExtent, geometry.getExtent()) : combinedExtent;
    }, createEmpty());

    if (extent.some((value) => !Number.isFinite(value))) {
      return;
    }

    const mapWidth = map.getSize()?.[0] || mapElementRef.current?.clientWidth || 0;
    const isCompactViewport = mapWidth < mapConfig.drawerWidth + 220;
    const rightPadding = isCompactViewport ? 72 : mapConfig.drawerWidth + 72;
    const viewPadding = padding || [72, rightPadding, 72, 72];

    map.getView().fit(extent, {
      duration: mapConfig.animationDuration,
      padding: viewPadding,
      maxZoom: mapConfig.maxCountryZoom,
    });
  }, []);

  const syncRegionOptions = useCallback((features: CountryFeature[]) => {
    const regionsByCode = new Map<string, RegionInfo>();
    const featuresByCode = new Map<string, CountryFeature>();

    features.forEach((feature) => {
      const region = getRegionInfo(feature);
      if (!region) {
        return;
      }

      if (!regionsByCode.has(region.code)) {
        regionsByCode.set(region.code, region);
        featuresByCode.set(region.code, feature);
      }
    });

    regionFeaturesByCodeRef.current = featuresByCode;
    setRegions(
      Array.from(regionsByCode.values())
        .sort((regionA, regionB) => regionA.name.localeCompare(regionB.name, 'it')),
    );
  }, []);

  const mountLevel1Layer = useCallback(async (countryCode: string) => {
    try {
      // Only one country's regional layer should ever be loading for the current selection.
      regionLoadControllerRef.current?.abort();
      const controller = new AbortController();
      regionLoadControllerRef.current = controller;

      const level1Data = await loadLevel1Data(countryCode, controller.signal);
      // Ignore late responses from countries that were selected before the latest click.
      if (selectedCountryCodeRef.current !== countryCode) {
        return;
      }

      const regionFeatures = setRegionFeaturesRef.current?.(level1Data) || [];
      syncRegionOptions(regionFeatures);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      clearRegionFeaturesRef.current?.();
      regionFeaturesByCodeRef.current = new Map();
      setRegions([]);
      if (error instanceof Level1DataFetchError && error.status === 404) {
        return;
      }

      setSelectionError('Regioni non disponibili per il paese selezionato');
    }
  }, [loadLevel1Data, syncRegionOptions]);

  const selectFeatures = useCallback((features: CountryFeature[]) => {
    const previousSelected = selectedFeaturesRef.current;
    selectedFeaturesRef.current = features;
    setSelectedCountry(getCountryInfo(features[0] || null));
    setSelectedRegionCode(getRegionInfo(features[0] || null)?.code || '');
    setDrawerOpen(true);
    refreshFeatures(previousSelected);
    refreshFeatures(features);
    fitFeatures(features);
  }, [fitFeatures]);

  const selectCountry = useCallback((features: CountryFeature[]) => {
    const country = getCountryInfo(features[0] || null);
    if (!country?.iso2) {
      setSelectionError('Paese non disponibile');
      return;
    }

    clearRegionFeaturesRef.current?.();
    regionFeaturesByCodeRef.current = new Map();
    setRegions([]);
    setSelectedRegionCode('');
    setSelectedCountryCode(country.iso2);
    selectedCountryCodeRef.current = country.iso2;
    selectFeatures(features);
    void mountLevel1Layer(country.iso2);
  }, [mountLevel1Layer, selectFeatures]);

  const selectCountryByCode = useCallback(
    (countryCode: string) => {
      if (!countryCode) {
        clearSelection();
        return;
      }

      const features = countryFeaturesByCodeRef.current.get(countryCode);
      if (features) {
        selectCountry(features);
      } else {
        setSelectionError('Paese non disponibile');
      }
    },
    [clearSelection, selectCountry],
  );

  const selectRegionByCode = useCallback(
    (regionCode: string) => {
      if (!regionCode) {
        setSelectedRegionCode('');
        const selectedCountryFeatures = selectedCountryCodeRef.current
          ? countryFeaturesByCodeRef.current.get(selectedCountryCodeRef.current)
          : null;
        if (selectedCountryFeatures) {
          selectFeatures(selectedCountryFeatures);
        }
        return;
      }

      const feature = regionFeaturesByCodeRef.current.get(regionCode);
      if (feature) {
        selectFeatures([feature]);
      } else {
        setSelectionError('Regione non disponibile');
      }
    },
    [selectFeatures],
  );

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    setIsLoadingCountries(true);
    setLoadError(null);

    const { abortCountryLoad, map, countrySource, regionSource, findCountryAtPixel, findRegionAtPixel, setRegionFeatures } = createCountriesMap({
      target: mapElementRef.current,
      hoveredFeatureRef,
      selectedFeaturesRef,
      styles,
    });

    mapRef.current = map;
    clearRegionFeaturesRef.current = () => regionSource.clear();
    setRegionFeaturesRef.current = setRegionFeatures;

    const syncCountryOptions = () => {
      const countriesByCode = new Map<string, CountryInfo>();
      const featuresByCode = new Map<string, CountryFeature[]>();

      countrySource.getFeatures().forEach((feature) => {
        const country = getCountryInfo(feature);
        if (!country?.iso2) {
          return;
        }

        if (!countriesByCode.has(country.iso2)) {
          countriesByCode.set(country.iso2, country);
        }

        featuresByCode.set(country.iso2, [...(featuresByCode.get(country.iso2) || []), feature]);
      });

      const nextCountries = Array.from(countriesByCode.values())
        .sort((countryA, countryB) => countryA.name.localeCompare(countryB.name, 'it'));

      countryFeaturesByCodeRef.current = featuresByCode;
      setCountries(nextCountries);

      // Center on Italy once the world layer is available, without selecting it.
      if (!didFitInitialCountryRef.current) {
        const initialFeature = featuresByCode.get(mapConfig.initialCountryCode);
        if (initialFeature) {
          didFitInitialCountryRef.current = true;
          fitFeatures(initialFeature, [72, 72, 72, 72]);
        }
      }
    };

    const setHoveredFeature = (feature: CountryFeature | null) => {
      const currentHovered = hoveredFeatureRef.current;
      if (currentHovered === feature) {
        return;
      }

      hoveredFeatureRef.current = feature;
      refreshFeature(currentHovered);
      refreshFeature(feature);
      map.getTargetElement().style.cursor = feature ? 'pointer' : '';
    };

    const pointerMoveKey = map.on('pointermove', (event) => {
      if (!event.dragging) {
        // When a country is open, regions take precedence over the underlying world feature.
        setHoveredFeature(findRegionAtPixel(event.pixel) || findCountryAtPixel(event.pixel));
      }
    });

    const singleClickKey = map.on('singleclick', (event) => {
      // Region clicks update the details panel; country clicks replace the active region layer.
      const regionFeature = findRegionAtPixel(event.pixel);
      const feature = regionFeature || findCountryAtPixel(event.pixel);

      if (regionFeature) {
        selectFeatures([regionFeature]);
      } else if (feature) {
        const country = getCountryInfo(feature);
        const countryFeatures = country?.iso2 ? countryFeaturesByCodeRef.current.get(country.iso2) : null;
        selectCountry(countryFeatures || [feature]);
      } else {
        clearSelection();
      }
    });

    const handlePointerLeave = () => {
      setHoveredFeature(null);
    };

    map.getTargetElement().addEventListener('pointerleave', handlePointerLeave);

    const featuresLoadEndKey = countrySource.on('featuresloadend', syncCountryOptions);
    const featuresLoadEndLoadingKey = countrySource.on('featuresloadend', () => {
      setIsLoadingCountries(false);
    });
    const featuresLoadErrorKey = countrySource.on('featuresloaderror', () => {
      setIsLoadingCountries(false);
      setLoadError('Impossibile caricare i confini dei paesi');
    });
    syncCountryOptions();

    return () => {
      map.getTargetElement().removeEventListener('pointerleave', handlePointerLeave);
      unByKey([pointerMoveKey, singleClickKey, featuresLoadEndKey, featuresLoadEndLoadingKey, featuresLoadErrorKey]);
      abortCountryLoad();
      regionLoadControllerRef.current?.abort();
      countryFeaturesByCodeRef.current = new Map();
      regionFeaturesByCodeRef.current = new Map();
      clearRegionFeaturesRef.current = null;
      setRegionFeaturesRef.current = null;
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [clearSelection, fitFeatures, selectCountry, selectFeatures, styles]);

  return {
    clearSelection,
    countries,
    drawerOpen,
    isLoadingCountries,
    loadError,
    mapElementRef,
    regions,
    selectionError,
    setLoadError,
    setSelectionError,
    selectCountryByCode,
    selectRegionByCode,
    selectedCountry,
    selectedCountryCode,
    selectedRegionCode,
    zoomIn,
    zoomOut,
  };
}
