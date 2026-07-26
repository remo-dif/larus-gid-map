import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map from 'ol/Map';
import { unByKey } from 'ol/Observable';
import { createCountriesMap } from '../lib/create-countries-map';
import { createCountryStyles } from '../lib/country-styles';
import { mapConfig } from '../lib/map-config';
import { getCountryInfo, type CountryFeature, type CountryInfo } from '../model/country';

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

function refreshFeature(feature: CountryFeature | null) {
  if (feature) {
    feature.changed();
  }
}

export function useCountriesMap(): UseCountriesMapResult {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const countryFeaturesByCodeRef = useRef<globalThis.Map<string, CountryFeature>>(new globalThis.Map());
  const hoveredFeatureRef = useRef<CountryFeature | null>(null);
  const selectedFeatureRef = useRef<CountryFeature | null>(null);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const styles = useMemo(() => createCountryStyles(), []);

  const clearSelection = useCallback(() => {
    const currentSelected = selectedFeatureRef.current;
    selectedFeatureRef.current = null;
    setSelectedCountry(null);
    setDrawerOpen(false);
    refreshFeature(currentSelected);
  }, []);

  const selectCountry = useCallback((feature: CountryFeature) => {
    const previousSelected = selectedFeatureRef.current;
    selectedFeatureRef.current = feature;
    setSelectedCountry(getCountryInfo(feature));
    setDrawerOpen(true);
    refreshFeature(previousSelected);
    refreshFeature(feature);

    const map = mapRef.current;
    const geometry = feature.getGeometry();
    if (!map || !geometry) {
      return;
    }

    const mapWidth = map.getSize()?.[0] || mapElementRef.current?.clientWidth || 0;
    const isCompactViewport = mapWidth < mapConfig.drawerWidth + 220;
    const rightPadding = isCompactViewport ? 72 : mapConfig.drawerWidth + 72;

    map.getView().fit(geometry.getExtent(), {
      duration: mapConfig.animationDuration,
      padding: [72, rightPadding, 72, 72],
      maxZoom: mapConfig.maxCountryZoom,
    });
  }, []);

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

    const { abortCountryLoad, map, countrySource, findCountryAtPixel } = createCountriesMap({
      target: mapElementRef.current,
      hoveredFeatureRef,
      selectedFeatureRef,
      styles,
    });

    mapRef.current = map;

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
        setHoveredFeature(findCountryAtPixel(event.pixel));
      }
    });

    const singleClickKey = map.on('singleclick', (event) => {
      const feature = findCountryAtPixel(event.pixel);

      if (feature) {
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
      countryFeaturesByCodeRef.current = new globalThis.Map();
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [clearSelection, selectCountry, styles]);

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
    selectedCountryCode: selectedCountry?.iso2 || '',
  };
}
