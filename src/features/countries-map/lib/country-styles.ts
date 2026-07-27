import { Fill, Stroke, Style } from 'ol/style';

export type CountryStyles = {
  invisible: Style;
  region: Style;
  hover: Style;
  selected: Style;
};

export function createCountryStyles(): CountryStyles {
  return {
    invisible: new Style({
      fill: new Fill({ color: 'rgba(255, 255, 255, 0)' }),
      stroke: new Stroke({ color: 'rgba(255, 255, 255, 0)', width: 1 }),
    }),
    region: new Style({
      fill: new Fill({ color: 'rgba(255, 255, 255, 0.01)' }),
      stroke: new Stroke({ color: 'rgba(38, 108, 155, 0.55)', width: 1.4 }),
    }),
    hover: new Style({
      fill: new Fill({ color: 'rgba(255, 152, 0, 0.06)' }),
      stroke: new Stroke({ color: '#FF9800', width: 3 }),
    }),
    selected: new Style({
      fill: new Fill({ color: 'rgba(38, 108, 155, 0.08)' }),
      stroke: new Stroke({ color: '#266C9B', width: 3.5 }),
    }),
  };
}
