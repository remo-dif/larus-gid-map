import Feature from 'ol/Feature';
import { describe, expect, it } from 'vitest';
import {
  getCountryInfo,
  getFeatureDisplayInfo,
  getRegionInfo,
  type CountryFeature,
} from './country';

function createCountryFeature(properties: Record<string, unknown>): CountryFeature {
  const feature = new Feature();
  feature.setProperties(properties);

  return feature;
}

describe('getFeatureDisplayInfo', () => {
  it('prefers level2, level1, Italian country names and ISO_A2 codes', () => {
    const feature = getFeatureDisplayInfo(createCountryFeature({
      NAME_2: 'Pescara',
      NAME_1: 'Abruzzo',
      NAME_IT: 'Italia',
      NAME_EN: 'Italy',
      ISO_A2: 'IT',
      GID_0: 'ITA',
    }));

    expect(feature).toEqual({
      name: 'Pescara',
      iso2: 'IT',
    });
  });

  it('falls back to English names and alternate country code properties', () => {
    const feature = getFeatureDisplayInfo(createCountryFeature({
      NAME_EN: 'France',
      ISO_CODE: 'FR',
    }));

    expect(feature).toEqual({
      name: 'France',
      iso2: 'FR',
    });
  });

  it('returns a null country code when no ISO property is available', () => {
    const feature = getFeatureDisplayInfo(createCountryFeature({
      NAME_IT: 'Paese senza codice',
    }));

    expect(feature).toEqual({
      name: 'Paese senza codice',
      iso2: null,
    });
  });

  it('ignores empty and whitespace-only string properties', () => {
    const feature = getFeatureDisplayInfo(createCountryFeature({
      NAME_1: '   ',
      NAME_IT: '',
      NAME_EN: 'Italy',
      ISO_A2: ' ',
      GID_0: 'ITA',
    }));

    expect(feature).toEqual({
      name: 'Italy',
      iso2: 'ITA',
    });
  });

  it('returns null when no feature is provided', () => {
    expect(getFeatureDisplayInfo(null)).toBeNull();
  });
});

describe('getCountryInfo', () => {
  it('wraps feature display info for country-specific call sites', () => {
    expect(getCountryInfo(createCountryFeature({
      NAME_IT: 'Italia',
      ISO_A2: 'IT',
    }))).toEqual({
      name: 'Italia',
      iso2: 'IT',
    });
  });
});

describe('getRegionInfo', () => {
  it('returns level1 region names and GID_1 codes', () => {
    const region = getRegionInfo(createCountryFeature({
      NAME_1: 'Abruzzo',
      GID_1: 'ITA.1_1',
    }));

    expect(region).toEqual({
      name: 'Abruzzo',
      code: 'ITA.1_1',
    });
  });

  it('returns null when the level1 code is missing', () => {
    expect(getRegionInfo(createCountryFeature({ NAME_1: 'Senza codice' }))).toBeNull();
  });
});
