import Feature from 'ol/Feature';
import { describe, expect, it } from 'vitest';
import { getCountryInfo, type CountryFeature } from './country';

function createCountryFeature(properties: Record<string, unknown>): CountryFeature {
  const feature = new Feature();
  feature.setProperties(properties);

  return feature;
}

describe('getCountryInfo', () => {
  it('prefers Italian country names and ISO_A2 codes', () => {
    const country = getCountryInfo(createCountryFeature({
      NAME_IT: 'Italia',
      NAME_EN: 'Italy',
      ISO_A2: 'IT',
      GID_0: 'ITA',
    }));

    expect(country).toEqual({
      name: 'Italia',
      iso2: 'IT',
    });
  });

  it('falls back to English names and alternate country code properties', () => {
    const country = getCountryInfo(createCountryFeature({
      NAME_EN: 'France',
      ISO_CODE: 'FR',
    }));

    expect(country).toEqual({
      name: 'France',
      iso2: 'FR',
    });
  });

  it('returns a null country code when no ISO property is available', () => {
    const country = getCountryInfo(createCountryFeature({
      NAME_IT: 'Paese senza codice',
    }));

    expect(country).toEqual({
      name: 'Paese senza codice',
      iso2: null,
    });
  });

  it('returns null when no feature is provided', () => {
    expect(getCountryInfo(null)).toBeNull();
  });
});
