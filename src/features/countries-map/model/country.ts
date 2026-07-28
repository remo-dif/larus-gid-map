import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';

export type CountryFeature = Feature<Geometry>;

export type FeatureDisplayInfo = {
  name: string;
  iso2: string | null;
};

export type CountryInfo = FeatureDisplayInfo;

export type RegionInfo = {
  name: string;
  code: string;
};

export type Sublevel2Info = {
  name: string;
  code: string;
};

type GeoJsonPosition = number[];

type GeoJsonGeometry =
  | { type: 'Point'; coordinates: GeoJsonPosition }
  | { type: 'MultiPoint' | 'LineString'; coordinates: GeoJsonPosition[] }
  | { type: 'MultiLineString' | 'Polygon'; coordinates: GeoJsonPosition[][] }
  | { type: 'MultiPolygon'; coordinates: GeoJsonPosition[][][] }
  | { type: 'GeometryCollection'; geometries: GeoJsonGeometry[] }
  | null;

export type Level1Data = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: GeoJsonGeometry;
    properties?: Record<string, unknown> | null;
  }>;
};

export type Sublevel2Data = Level1Data;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getStringProperty(feature: CountryFeature, key: string): string | undefined {
  const value = feature.get(key);
  return isNonEmptyString(value) ? value : undefined;
}

export function getFeatureDisplayInfo(feature: CountryFeature | null): FeatureDisplayInfo | null {
  if (!feature) {
    return null;
  }

  return {
    name:
      getStringProperty(feature, 'NAME_2') ||
      getStringProperty(feature, 'NAME_1') ||
      getStringProperty(feature, 'NAME_IT') ||
      getStringProperty(feature, 'NAME_EN') ||
      'Paese',
    iso2:
      getStringProperty(feature, 'ISO_A2') ||
      getStringProperty(feature, 'ISO_CODE') ||
      getStringProperty(feature, 'GID_0') ||
      null,
  };
}

export function getCountryInfo(feature: CountryFeature | null): CountryInfo | null {
  return getFeatureDisplayInfo(feature);
}

export function getRegionInfo(feature: CountryFeature | null): RegionInfo | null {
  if (!feature) {
    return null;
  }

  const code = getStringProperty(feature, 'GID_1');
  if (!code) {
    return null;
  }

  return {
    name:
      getStringProperty(feature, 'NAME_1') ||
      getStringProperty(feature, 'NAME_IT') ||
      getStringProperty(feature, 'NAME_EN') ||
      'Regione',
    code,
  };
}

export function getSublevel2Info(feature: CountryFeature | null): Sublevel2Info | null {
  if (!feature) {
    return null;
  }

  const code = getStringProperty(feature, 'GID_2');
  if (!code) {
    return null;
  }

  return {
    name:
      getStringProperty(feature, 'NAME_2') ||
      getStringProperty(feature, 'NAME_IT') ||
      getStringProperty(feature, 'NAME_EN') ||
      'Sottolivello 2',
    code,
  };
}
