import { beforeEach, describe, expect, it, vi } from 'vitest';

const olState = vi.hoisted(() => ({
  addedFeatures: [] as unknown[][],
  layers: [] as any[],
  maps: [] as any[],
  readFeatures: vi.fn(),
  sources: [] as any[],
}));

vi.mock('ol/Feature', () => {
  class MockFeature {
    properties: Record<string, unknown>;

    constructor(properties: Record<string, unknown> = {}) {
      this.properties = properties;
    }

    changed = vi.fn();
    get = vi.fn((key: string) => this.properties[key]);
    getGeometry = vi.fn();
  }

  return {
    default: MockFeature,
  };
});

vi.mock('ol/format/GeoJSON', () => ({
  default: vi.fn().mockImplementation(function MockGeoJSON() {
    return {
    readFeatures: olState.readFeatures,
    };
  }),
}));

vi.mock('ol/source/Vector', () => ({
  default: vi.fn().mockImplementation(function MockVectorSource(options = {}) {
    const source = {
      options,
      addFeatures: vi.fn((features: unknown[]) => olState.addedFeatures.push(features)),
      clear: vi.fn(),
    };
    olState.sources.push(source);
    return source;
  }),
}));

vi.mock('ol/layer/Vector', () => ({
  default: vi.fn().mockImplementation(function MockVectorLayer(options = {}) {
    const layer = { options };
    olState.layers.push(layer);
    return layer;
  }),
}));

vi.mock('ol/layer/Tile', () => ({
  default: vi.fn().mockImplementation(function MockTileLayer(options = {}) {
    return { options };
  }),
}));

vi.mock('ol/source/OSM', () => ({
  default: vi.fn().mockImplementation(function MockOSM(options = {}) {
    return { options };
  }),
}));

vi.mock('ol/View', () => ({
  default: vi.fn().mockImplementation(function MockView(options = {}) {
    return { options };
  }),
}));

vi.mock('ol/Map', () => ({
  default: vi.fn().mockImplementation(function MockMap(options = {}) {
    const targetElement = document.createElement('div');
    const map = {
      featureAtPixel: null as unknown,
      featureLayer: null as unknown,
      options,
      forEachFeatureAtPixel: vi.fn(function (
        this: { featureAtPixel: unknown; featureLayer: unknown },
        _pixel,
        callback,
        hitOptions,
      ) {
        if (!this.featureAtPixel || !hitOptions.layerFilter(this.featureLayer)) {
          return undefined;
        }

        return callback(this.featureAtPixel);
      }),
      getTargetElement: vi.fn(() => targetElement),
      setTarget: vi.fn(),
    };
    olState.maps.push(map);
    return map;
  }),
}));

describe('createCountriesMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    olState.addedFeatures = [];
    olState.layers = [];
    olState.maps = [];
    olState.readFeatures.mockReset();
    olState.sources = [];
  });

  it('loads world features and wires country and region layer hit testing', async () => {
    const { default: Feature } = await import('ol/Feature');
    const { createCountriesMap } = await import('./create-countries-map');
    const selectedFeature = new Feature({ ISO_A2: 'IT' });
    const hoveredFeature = new Feature({ ISO_A2: 'FR' });
    const countryFeature = new Feature({ ISO_A2: 'DE' });
    const regionFeature = new Feature({ GID_1: 'ITA.1_1' });
    const sublevel2Feature = new Feature({ GID_2: 'ITA.1.3_1' });
    const target = document.createElement('div');
    const styles = {
      invisible: { name: 'invisible' },
      region: { name: 'region' },
      sublevel2: { name: 'sublevel2' },
      hover: { name: 'hover' },
      selected: { name: 'selected' },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    olState.readFeatures.mockReturnValueOnce([countryFeature]);

    const context = createCountriesMap({
      target,
      hoveredFeatureRef: { current: hoveredFeature },
      selectedFeaturesRef: { current: [selectedFeature] },
      styles: styles as never,
    });

    const countrySource = olState.sources[0];
    const success = vi.fn();
    countrySource.options.loader([0, 0, 1, 1], 1, 'EPSG:3857', success, vi.fn());
    await vi.waitFor(() => expect(success).toHaveBeenCalledWith([countryFeature]));

    expect(fetchMock).toHaveBeenCalledWith('/countries/world_raw.geojson', {
      signal: expect.any(AbortSignal),
    });
    expect(countrySource.addFeatures).toHaveBeenCalledWith([countryFeature]);

    const countryLayer = olState.layers[0];
    const regionLayer = olState.layers[1];
    const sublevel2Layer = olState.layers[2];
    expect(countryLayer.options.style(selectedFeature)).toBe(styles.selected);
    expect(countryLayer.options.style(hoveredFeature)).toBe(styles.hover);
    expect(countryLayer.options.style(countryFeature)).toBe(styles.invisible);
    expect(regionLayer.options.style(countryFeature)).toBe(styles.region);
    expect(sublevel2Layer.options.style(countryFeature)).toBe(styles.sublevel2);

    const map = olState.maps[0];
    map.featureAtPixel = countryFeature;
    map.featureLayer = countryLayer;
    expect(context.findCountryAtPixel([1, 2])).toBe(countryFeature);
    expect(context.findRegionAtPixel([1, 2])).toBeNull();

    map.featureAtPixel = regionFeature;
    map.featureLayer = regionLayer;
    expect(context.findRegionAtPixel([1, 2])).toBe(regionFeature);
    expect(context.findCountryAtPixel([1, 2])).toBeNull();

    map.featureAtPixel = sublevel2Feature;
    map.featureLayer = sublevel2Layer;
    expect(context.findSublevel2AtPixel([1, 2])).toBe(sublevel2Feature);
    expect(context.findRegionAtPixel([1, 2])).toBeNull();
  });

  it('clears and mounts region features from GeoJSON data', async () => {
    const { default: Feature } = await import('ol/Feature');
    const { createCountriesMap } = await import('./create-countries-map');
    const regionFeature = new Feature({ GID_1: 'ITA.1_1' });
    olState.readFeatures.mockReturnValue([regionFeature]);

    const context = createCountriesMap({
      target: document.createElement('div'),
      hoveredFeatureRef: { current: null },
      selectedFeaturesRef: { current: [] },
      styles: {
        invisible: {},
        region: {},
        sublevel2: {},
        hover: {},
        selected: {},
      } as never,
    });

    const mountedFeatures = context.setRegionFeatures({ type: 'FeatureCollection', features: [] });
    const regionSource = olState.sources[1];

    expect(regionSource.clear).toHaveBeenCalled();
    expect(regionSource.addFeatures).toHaveBeenCalledWith([regionFeature]);
    expect(mountedFeatures).toEqual([regionFeature]);
  });

  it('clears and mounts sublevel 2 features from GeoJSON data', async () => {
    const { default: Feature } = await import('ol/Feature');
    const { createCountriesMap } = await import('./create-countries-map');
    const sublevel2Feature = new Feature({ GID_2: 'ITA.1.3_1' });
    olState.readFeatures.mockReturnValue([sublevel2Feature]);

    const context = createCountriesMap({
      target: document.createElement('div'),
      hoveredFeatureRef: { current: null },
      selectedFeaturesRef: { current: [] },
      styles: {
        invisible: {},
        region: {},
        sublevel2: {},
        hover: {},
        selected: {},
      } as never,
    });

    const mountedFeatures = context.setSublevel2Features({ type: 'FeatureCollection', features: [] });
    const sublevel2Source = olState.sources[2];

    expect(sublevel2Source.clear).toHaveBeenCalled();
    expect(sublevel2Source.addFeatures).toHaveBeenCalledWith([sublevel2Feature]);
    expect(mountedFeatures).toEqual([sublevel2Feature]);
  });

  it('reports loader failures and ignores aborted requests', async () => {
    const { createCountriesMap } = await import('./create-countries-map');
    const context = createCountriesMap({
      target: document.createElement('div'),
      hoveredFeatureRef: { current: null },
      selectedFeaturesRef: { current: [] },
      styles: {
        invisible: {},
        region: {},
        sublevel2: {},
        hover: {},
        selected: {},
      } as never,
    });
    const countrySource = olState.sources[0];
    const failure = vi.fn();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }));
    countrySource.options.loader([0, 0, 1, 1], 1, 'EPSG:3857', vi.fn(), failure);
    await vi.waitFor(() => expect(failure).toHaveBeenCalledTimes(1));

    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(abortError));
    countrySource.options.loader([0, 0, 1, 1], 1, 'EPSG:3857', vi.fn(), failure);
    await Promise.resolve();

    expect(failure).toHaveBeenCalledTimes(1);
    context.abortCountryLoad();
  });

  it('styles every selected country fragment in a multi-feature country', async () => {
    const { default: Feature } = await import('ol/Feature');
    const { createCountriesMap } = await import('./create-countries-map');
    const chinaMainFeature = new Feature({ ISO_A2: 'CN' });
    const chinaFragmentFeature = new Feature({ ISO_A2: 'CN' });
    const otherFeature = new Feature({ ISO_A2: 'FR' });
    const styles = {
      invisible: { name: 'invisible' },
      region: { name: 'region' },
      sublevel2: { name: 'sublevel2' },
      hover: { name: 'hover' },
      selected: { name: 'selected' },
    };

    createCountriesMap({
      target: document.createElement('div'),
      hoveredFeatureRef: { current: null },
      selectedFeaturesRef: { current: [chinaMainFeature, chinaFragmentFeature] },
      styles: styles as never,
    });

    const countryLayer = olState.layers[0];

    expect(countryLayer.options.style(chinaMainFeature)).toBe(styles.selected);
    expect(countryLayer.options.style(chinaFragmentFeature)).toBe(styles.selected);
    expect(countryLayer.options.style(otherFeature)).toBe(styles.invisible);
  });
});
