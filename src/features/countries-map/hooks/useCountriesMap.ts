import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map from 'ol/Map';
import { unByKey } from 'ol/Observable';
import { useLevel1DataCache } from '../context/Level1DataCacheContext';
import { createCountriesMap } from '../lib/create-countries-map';
import { createCountryStyles } from '../lib/country-styles';
import { mapConfig } from '../lib/map-config';
import { getCountryInfo, type CountryFeature, type CountryInfo, type Level1Data } from '../model/country';

type UseCountriesMapResult = {
  clearSelection: () => void;
  countries: CountryInfo[];
  drawerOpen: boolean;
  isLoadingCountries: boolean;
  loadError: string | null;
  mapElementRef: React.RefObject<HTMLDivElement | null>;
  selectionError: string | null;
  setLoadError: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectionError: React.Dispatch<React.SetStateAction<string | null>>;
  selectCountryByCode: (countryCode: string) => void;
  selectedCountry: CountryInfo | null;
  selectedCountryCode: string;
};

type ViewPadding = [number, number, number, number];

function refreshFeature(feature: CountryFeature | null) {
  if (feature) {
    feature.changed();
  }
}

export function useCountriesMap(): UseCountriesMapResult {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const countryFeaturesByCodeRef = useRef<globalThis.Map<string, CountryFeature>>(new globalThis.Map());
  const regionLoadControllerRef = useRef<AbortController | null>(null);
  const clearRegionFeaturesRef = useRef<(() => void) | null>(null);
  const setRegionFeaturesRef = useRef<((geoJson: Level1Data) => CountryFeature[]) | null>(null);
  const didFitInitialCountryRef = useRef(false);
  const selectedCountryCodeRef = useRef('');
  const hoveredFeatureRef = useRef<CountryFeature | null>(null);
  const selectedFeatureRef = useRef<CountryFeature | null>(null);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { loadLevel1Data } = useLevel1DataCache();
  const styles = useMemo(() => createCountryStyles(), []);

  const clearSelection = useCallback(() => {
    const currentSelected = selectedFeatureRef.current;
    const currentHovered = hoveredFeatureRef.current;
    selectedFeatureRef.current = null;
    hoveredFeatureRef.current = null;
    regionLoadControllerRef.current?.abort();
    clearRegionFeaturesRef.current?.();
    setSelectedCountry(null);
    setSelectedCountryCode('');
    selectedCountryCodeRef.current = '';
    setDrawerOpen(false);
    refreshFeature(currentSelected);
    refreshFeature(currentHovered);
    mapRef.current?.getTargetElement().style.removeProperty('cursor');
  }, []);

  const fitFeature = useCallback((feature: CountryFeature, padding?: ViewPadding) => {
    const map = mapRef.current;
    const geometry = feature.getGeometry();
    if (!map || !geometry) {
      return;
    }

    const mapWidth = map.getSize()?.[0] || mapElementRef.current?.clientWidth || 0;
    const isCompactViewport = mapWidth < mapConfig.drawerWidth + 220;
    const rightPadding = isCompactViewport ? 72 : mapConfig.drawerWidth + 72;
    const viewPadding = padding || [72, rightPadding, 72, 72];

    map.getView().fit(geometry.getExtent(), {
      duration: mapConfig.animationDuration,
      padding: viewPadding,
      maxZoom: mapConfig.maxCountryZoom,
    });
  }, []);

  const mountLevel1Layer = useCallback(async (countryCode: string) => {
    try {
      regionLoadControllerRef.current?.abort();
      const controller = new AbortController();
      regionLoadControllerRef.current = controller;

      const level1Data = await loadLevel1Data(countryCode, controller.signal);
      if (selectedCountryCodeRef.current !== countryCode) {
        return;
      }

      setRegionFeaturesRef.current?.(level1Data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      clearRegionFeaturesRef.current?.();
      setSelectionError('Regioni non disponibili per il paese selezionato');
    }
  }, [loadLevel1Data]);

  const selectFeature = useCallback((feature: CountryFeature) => {
    const previousSelected = selectedFeatureRef.current;
    selectedFeatureRef.current = feature;
    setSelectedCountry(getCountryInfo(feature));
    setDrawerOpen(true);
    refreshFeature(previousSelected);
    refreshFeature(feature);
    fitFeature(feature);
  }, [fitFeature]);

  const selectCountry = useCallback((feature: CountryFeature) => {
    const country = getCountryInfo(feature);
    if (!country?.iso2) {
      setSelectionError('Paese non disponibile');
      return;
    }

    clearRegionFeaturesRef.current?.();
    setSelectedCountryCode(country.iso2);
    selectedCountryCodeRef.current = country.iso2;
    selectFeature(feature);
    void mountLevel1Layer(country.iso2);
  }, [mountLevel1Layer, selectFeature]);

  const selectCountryByCode = useCallback(
    (countryCode: string) => {
      if (!countryCode) {
        clearSelection();
        return;
      }

      const feature = countryFeaturesByCodeRef.current.get(countryCode);
      if (feature) {
        selectCountry(feature);
      } else {
        setSelectionError('Paese non disponibile');
      }
    },
    [clearSelection, selectCountry],
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
      selectedFeatureRef,
      styles,
    });

    mapRef.current = map;
    clearRegionFeaturesRef.current = () => regionSource.clear();
    setRegionFeaturesRef.current = setRegionFeatures;

    const syncCountryOptions = () => {
      const featuresByCode = new globalThis.Map<string, CountryFeature>();
      const nextCountries = countrySource
        .getFeatures()
        .reduce<CountryInfo[]>((countriesList, feature) => {
          const country = getCountryInfo(feature);
          if (country) {
            countriesList.push(country);
          }

          if (country && country.iso2 !== null) {
            featuresByCode.set(country.iso2, feature);
          }

          return countriesList;
        }, [])
        .sort((countryA, countryB) => countryA.name.localeCompare(countryB.name, 'it'));

      countryFeaturesByCodeRef.current = featuresByCode;
      setCountries(nextCountries);

      if (!didFitInitialCountryRef.current) {
        const initialFeature = featuresByCode.get(mapConfig.initialCountryCode);
        if (initialFeature) {
          didFitInitialCountryRef.current = true;
          fitFeature(initialFeature, [72, 72, 72, 72]);
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
        setHoveredFeature(findRegionAtPixel(event.pixel) || findCountryAtPixel(event.pixel));
      }
    });

    const singleClickKey = map.on('singleclick', (event) => {
      const regionFeature = findRegionAtPixel(event.pixel);
      const feature = regionFeature || findCountryAtPixel(event.pixel);

      if (regionFeature) {
        selectFeature(regionFeature);
      } else if (feature) {
        selectCountry(feature);
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
      countryFeaturesByCodeRef.current = new globalThis.Map();
      clearRegionFeaturesRef.current = null;
      setRegionFeaturesRef.current = null;
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [clearSelection, fitFeature, selectCountry, selectFeature, styles]);

  return {
    clearSelection,
    countries,
    drawerOpen,
    isLoadingCountries,
    loadError,
    mapElementRef,
    selectionError,
    setLoadError,
    setSelectionError,
    selectCountryByCode,
    selectedCountry,
    selectedCountryCode,
  };
}
