import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCountriesMap } from './useCountriesMap';
import { createCountriesMap } from '../lib/create-countries-map';
import { Level1DataFetchError, useLevel1DataCache } from '../context/Level1DataCacheContext';

vi.mock('../context/Level1DataCacheContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/Level1DataCacheContext')>();

  return {
    ...actual,
    useLevel1DataCache: vi.fn(),
  };
});
vi.mock('../lib/create-countries-map');

type EventHandler = (event?: any) => void;

function createMockFeature(properties: Record<string, string>, extent = [0, 0, 1, 1]) {
  return {
    changed: vi.fn(),
    get: vi.fn((key: string) => properties[key]),
    getGeometry: vi.fn(() => ({
      getExtent: vi.fn(() => extent),
    })),
  };
}

function createMapHarness() {
  const eventHandlers = new Map<string, EventHandler>();
  const sourceHandlers = new Map<string, EventHandler[]>();
  const targetElement = document.createElement('div');
  const italyFeature = createMockFeature({
    NAME_IT: 'Italia',
    NAME_EN: 'Italy',
    ISO_A2: 'IT',
  }, [10, 20, 30, 40]);
  const chinaMainFeature = createMockFeature({
    NAME_IT: 'Cina',
    ISO_A2: 'CN',
  }, [100, 100, 150, 150]);
  const chinaFragmentFeature = createMockFeature({
    NAME_IT: 'Cina',
    ISO_A2: 'CN',
  }, [200, 220, 250, 260]);
  const franceFeature = createMockFeature({
    NAME_IT: 'Francia',
    ISO_A2: 'FR',
  }, [1, 2, 3, 4]);
  const regionFeature = createMockFeature({
    NAME_1: 'Abruzzo',
    GID_1: 'ITA.1_1',
  }, [11, 21, 12, 22]);
  const animate = vi.fn();
  const fit = vi.fn();
  const getZoom = vi.fn(() => 5);
  const clearRegionSource = vi.fn();
  const setRegionFeatures = vi.fn();
  const abortCountryLoad = vi.fn();
  const setTarget = vi.fn();
  const findCountryAtPixel = vi.fn();
  const findRegionAtPixel = vi.fn();

  const countrySource = {
    getFeatures: vi.fn(() => [franceFeature, chinaMainFeature, chinaFragmentFeature, italyFeature]),
    on: vi.fn((eventName: string, handler: EventHandler) => {
      sourceHandlers.set(eventName, [...(sourceHandlers.get(eventName) || []), handler]);
      return { eventName, handler };
    }),
  };
  const regionSource = {
    clear: clearRegionSource,
  };
  const map = {
    getSize: vi.fn(() => [1200, 800]),
    getTargetElement: vi.fn(() => targetElement),
    getView: vi.fn(() => ({ animate, fit, getZoom })),
    on: vi.fn((eventName: string, handler: EventHandler) => {
      eventHandlers.set(eventName, handler);
      return { eventName, handler };
    }),
    setTarget,
  };

  vi.mocked(createCountriesMap).mockReturnValue({
    abortCountryLoad,
    map: map as never,
    countrySource: countrySource as never,
    regionSource: regionSource as never,
    findCountryAtPixel,
    findRegionAtPixel,
    setRegionFeatures,
  });

  return {
    abortCountryLoad,
    clearRegionSource,
    countrySource,
    eventHandlers,
    findCountryAtPixel,
    findRegionAtPixel,
    animate,
    fit,
    getZoom,
    chinaFragmentFeature,
    chinaMainFeature,
    franceFeature,
    italyFeature,
    regionFeature,
    setRegionFeatures,
    setTarget,
    sourceHandlers,
    targetElement,
  };
}

function HookProbe() {
  const countriesMap = useCountriesMap();

  return (
    <section>
      <div ref={countriesMap.mapElementRef} data-testid="map" />
      <div data-testid="countries">{countriesMap.countries.map((country) => country.iso2).join(',')}</div>
      <div data-testid="selected-code">{countriesMap.selectedCountryCode}</div>
      <div data-testid="selected-name">{countriesMap.selectedCountry?.name || ''}</div>
      <div data-testid="drawer-open">{String(countriesMap.drawerOpen)}</div>
      <div data-testid="selection-error">{countriesMap.selectionError || ''}</div>
      <div data-testid="load-error">{countriesMap.loadError || ''}</div>
      <div data-testid="loading">{String(countriesMap.isLoadingCountries)}</div>
      <button type="button" onClick={() => countriesMap.selectCountryByCode('IT')}>select IT</button>
      <button type="button" onClick={() => countriesMap.selectCountryByCode('CN')}>select CN</button>
      <button type="button" onClick={() => countriesMap.selectCountryByCode('')}>clear</button>
      <button type="button" onClick={() => countriesMap.selectCountryByCode('XX')}>select missing</button>
      <button type="button" onClick={countriesMap.clearSelection}>close</button>
      <button type="button" onClick={countriesMap.zoomIn}>zoom in</button>
      <button type="button" onClick={countriesMap.zoomOut}>zoom out</button>
    </section>
  );
}

describe('useCountriesMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs country options and fits the initial map view on Italy', async () => {
    const harness = createMapHarness();
    vi.mocked(useLevel1DataCache).mockReturnValue({
      loadLevel1Data: vi.fn(),
    });

    render(<HookProbe />);

    await waitFor(() => expect(screen.getByTestId('countries')).toHaveTextContent('CN,FR,IT'));
    expect(harness.fit).toHaveBeenCalledWith([10, 20, 30, 40], {
      duration: 850,
      padding: [72, 72, 72, 72],
      maxZoom: 7,
    });
  });

  it('deduplicates multi-fragment countries and fits the full selected extent', async () => {
    const harness = createMapHarness();
    vi.mocked(useLevel1DataCache).mockReturnValue({
      loadLevel1Data: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
    });

    render(<HookProbe />);

    await userEvent.click(screen.getByRole('button', { name: 'select CN' }));

    await waitFor(() => expect(screen.getByTestId('selected-code')).toHaveTextContent('CN'));
    expect(screen.getByTestId('countries')).toHaveTextContent('CN,FR,IT');
    expect(harness.chinaMainFeature.changed).toHaveBeenCalled();
    expect(harness.chinaFragmentFeature.changed).toHaveBeenCalled();
    expect(harness.fit).toHaveBeenLastCalledWith([100, 100, 250, 260], {
      duration: 850,
      padding: [72, 592, 72, 72],
      maxZoom: 7,
    });
  });

  it('zooms the map view in and out from controls', async () => {
    const harness = createMapHarness();
    vi.mocked(useLevel1DataCache).mockReturnValue({
      loadLevel1Data: vi.fn(),
    });

    render(<HookProbe />);

    await userEvent.click(screen.getByRole('button', { name: 'zoom in' }));
    await userEvent.click(screen.getByRole('button', { name: 'zoom out' }));

    expect(harness.animate).toHaveBeenNthCalledWith(1, {
      duration: 850,
      zoom: 6,
    });
    expect(harness.animate).toHaveBeenNthCalledWith(2, {
      duration: 850,
      zoom: 4,
    });
  });

  it('selects a country, caches its level1 data through the provider API, and mounts regions', async () => {
    const harness = createMapHarness();
    const level1Data = { type: 'FeatureCollection', features: [] };
    const loadLevel1Data = vi.fn().mockResolvedValue(level1Data);
    vi.mocked(useLevel1DataCache).mockReturnValue({ loadLevel1Data });

    render(<HookProbe />);

    await userEvent.click(screen.getByRole('button', { name: 'select IT' }));

    await waitFor(() => expect(loadLevel1Data).toHaveBeenCalledWith('IT', expect.any(AbortSignal)));
    expect(harness.clearRegionSource).toHaveBeenCalled();
    expect(harness.setRegionFeatures).toHaveBeenCalledWith(level1Data);
    expect(screen.getByTestId('selected-code')).toHaveTextContent('IT');
    expect(screen.getByTestId('selected-name')).toHaveTextContent('Italia');
    expect(screen.getByTestId('drawer-open')).toHaveTextContent('true');
  });

  it('reports missing countries selected from outside the map', async () => {
    createMapHarness();
    vi.mocked(useLevel1DataCache).mockReturnValue({
      loadLevel1Data: vi.fn(),
    });

    render(<HookProbe />);

    await userEvent.click(screen.getByRole('button', { name: 'select missing' }));

    expect(screen.getByTestId('selection-error')).toHaveTextContent('Paese non disponibile');
  });

  it('handles pointer move, region clicks, empty map clicks, and cleanup', async () => {
    const harness = createMapHarness();
    vi.mocked(useLevel1DataCache).mockReturnValue({
      loadLevel1Data: vi.fn(),
    });
    const { unmount } = render(<HookProbe />);

    await waitFor(() => expect(harness.eventHandlers.has('pointermove')).toBe(true));

    harness.findRegionAtPixel.mockReturnValueOnce(harness.regionFeature);
    act(() => {
      harness.eventHandlers.get('pointermove')?.({ dragging: false, pixel: [1, 2] });
    });

    expect(harness.targetElement.style.cursor).toBe('pointer');

    harness.findRegionAtPixel.mockReturnValueOnce(harness.regionFeature);
    act(() => {
      harness.eventHandlers.get('singleclick')?.({ pixel: [1, 2] });
    });

    expect(screen.getByTestId('selected-name')).toHaveTextContent('Abruzzo');

    harness.findRegionAtPixel.mockReturnValue(null);
    harness.findCountryAtPixel.mockReturnValueOnce(harness.chinaFragmentFeature);
    act(() => {
      harness.eventHandlers.get('singleclick')?.({ pixel: [3, 4] });
    });

    expect(screen.getByTestId('selected-code')).toHaveTextContent('CN');
    expect(harness.fit).toHaveBeenLastCalledWith([100, 100, 250, 260], {
      duration: 850,
      padding: [72, 592, 72, 72],
      maxZoom: 7,
    });

    harness.findRegionAtPixel.mockReturnValue(null);
    harness.findCountryAtPixel.mockReturnValue(null);
    act(() => {
      harness.eventHandlers.get('singleclick')?.({ pixel: [5, 6] });
    });

    expect(screen.getByTestId('drawer-open')).toHaveTextContent('false');

    unmount();

    expect(harness.abortCountryLoad).toHaveBeenCalled();
    expect(harness.setTarget).toHaveBeenCalledWith(undefined);
  });

  it('shows load and region errors from map source and level1 failures', async () => {
    const harness = createMapHarness();
    const loadLevel1Data = vi.fn().mockRejectedValue(new Error('no regions'));
    vi.mocked(useLevel1DataCache).mockReturnValue({ loadLevel1Data });

    render(<HookProbe />);

    act(() => {
      harness.sourceHandlers.get('featuresloaderror')?.forEach((handler) => handler());
    });

    expect(screen.getByTestId('load-error')).toHaveTextContent('Impossibile caricare i confini dei paesi');

    await userEvent.click(screen.getByRole('button', { name: 'select IT' }));

    await waitFor(() => {
      expect(screen.getByTestId('selection-error')).toHaveTextContent(
        'Regioni non disponibili per il paese selezionato',
      );
    });
  });

  it('silently clears regions when level1 data is missing with 404', async () => {
    const harness = createMapHarness();
    const loadLevel1Data = vi.fn().mockRejectedValue(new Level1DataFetchError('IT', 404));
    vi.mocked(useLevel1DataCache).mockReturnValue({ loadLevel1Data });

    render(<HookProbe />);

    await userEvent.click(screen.getByRole('button', { name: 'select IT' }));

    await waitFor(() => expect(loadLevel1Data).toHaveBeenCalledWith('IT', expect.any(AbortSignal)));
    expect(harness.clearRegionSource).toHaveBeenCalled();
    expect(screen.getByTestId('selection-error')).toBeEmptyDOMElement();
  });
});
