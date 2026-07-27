import Feature from 'ol/Feature';
import type Geometry from 'ol/geom/Geometry';

export type CountryFeature = Feature<Geometry>;

export type CountryInfo = {
  name: string;
  iso2: string | null;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getStringProperty(feature: CountryFeature, key: string): string | undefined {
  const value = feature.get(key);
  return isNonEmptyString(value) ? value : undefined;
}

export function getCountryInfo(feature: CountryFeature | null): CountryInfo | null {
  if (!feature) {
    return null;
  }

  return {
    name:
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
