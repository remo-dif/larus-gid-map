import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useMapSelection } from './useMapSelection';

describe('useMapSelection', () => {
  it('selects features and clears selection state', () => {
    const { result } = renderHook(() => useMapSelection());

    act(() => {
      result.current.dispatchSelection({
        type: 'select-features',
        feature: { name: 'Abruzzo', iso2: 'ITA' },
        regionCode: 'ITA.1_1',
        sublevel2Code: '',
      });
    });

    expect(result.current.selectionState).toMatchObject({
      drawerOpen: true,
      selectedFeature: { name: 'Abruzzo', iso2: 'ITA' },
      selectedRegionCode: 'ITA.1_1',
      selectedSublevel2Code: '',
    });

    act(() => {
      result.current.dispatchSelection({ type: 'clear' });
    });

    expect(result.current.selectionState).toMatchObject({
      drawerOpen: false,
      selectedCountryCode: '',
      selectedFeature: null,
      selectedRegionCode: '',
      selectedSublevel2Code: '',
    });
  });

  it('keeps country selection and dependent level codes consistent', () => {
    const { result } = renderHook(() => useMapSelection());

    act(() => {
      result.current.dispatchSelection({ type: 'select-country', countryCode: 'IT' });
      result.current.dispatchSelection({ type: 'prepare-region', regionCode: 'ITA.1_1' });
      result.current.dispatchSelection({ type: 'set-sublevel2-code', sublevel2Code: 'ITA.1.3_1' });
    });

    expect(result.current.selectionState).toMatchObject({
      selectedCountryCode: 'IT',
      selectedRegionCode: 'ITA.1_1',
      selectedSublevel2Code: 'ITA.1.3_1',
    });

    act(() => {
      result.current.dispatchSelection({ type: 'select-country', countryCode: 'FR' });
    });

    expect(result.current.selectionState).toMatchObject({
      selectedCountryCode: 'FR',
      selectedRegionCode: '',
      selectedSublevel2Code: '',
    });
  });
});
