import { useReducer } from 'react';
import type { FeatureDisplayInfo } from '../model/country';

type SelectionState = {
  drawerOpen: boolean;
  selectedCountryCode: string;
  selectedFeature: FeatureDisplayInfo | null;
  selectedRegionCode: string;
  selectedSublevel2Code: string;
};

type SelectionAction =
  | { type: 'clear' }
  | { type: 'clear-region' }
  | { type: 'prepare-region'; regionCode: string }
  | { type: 'select-country'; countryCode: string }
  | { type: 'select-features'; feature: FeatureDisplayInfo | null; regionCode: string; sublevel2Code: string }
  | { type: 'set-sublevel2-code'; sublevel2Code: string };

const initialSelectionState: SelectionState = {
  drawerOpen: false,
  selectedCountryCode: '',
  selectedFeature: null,
  selectedRegionCode: '',
  selectedSublevel2Code: '',
};

function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  switch (action.type) {
    case 'clear':
      return initialSelectionState;
    case 'clear-region':
      return {
        ...state,
        selectedRegionCode: '',
        selectedSublevel2Code: '',
      };
    case 'prepare-region':
      return {
        ...state,
        selectedRegionCode: action.regionCode,
        selectedSublevel2Code: '',
      };
    case 'select-country':
      return {
        ...state,
        selectedCountryCode: action.countryCode,
        selectedRegionCode: '',
        selectedSublevel2Code: '',
      };
    case 'select-features':
      return {
        ...state,
        drawerOpen: true,
        selectedFeature: action.feature,
        selectedRegionCode: action.regionCode,
        selectedSublevel2Code: action.sublevel2Code,
      };
    case 'set-sublevel2-code':
      return {
        ...state,
        selectedSublevel2Code: action.sublevel2Code,
      };
    default:
      return state;
  }
}

export function useMapSelection() {
  const [selectionState, dispatchSelection] = useReducer(selectionReducer, initialSelectionState);

  return {
    dispatchSelection,
    selectionState,
  };
}
