import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';

export type CountryFeature = Feature<Geometry>;

export type CountryInfo = {
  name: string;
  iso2: string | null;
};

function getStringProperty(feature: CountryFeature, key: string): string | undefined {
  const value = feature.get(key);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function getCountryInfo(feature: CountryFeature | null): CountryInfo | null {
  if (!feature) {
    return null;
  }

  return {
    name: getStringProperty(feature, 'NAME_IT') || getStringProperty(feature, 'NAME_EN') || 'Paese',
    iso2:
      getStringProperty(feature, 'ISO_A2') ||
      getStringProperty(feature, 'ISO_CODE') ||
      getStringProperty(feature, 'GID_0') ||
      null,
  };
}
