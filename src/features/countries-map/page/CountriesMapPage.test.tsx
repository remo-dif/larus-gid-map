import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CountriesMapPage } from './CountriesMapPage';
import { useCountriesMap } from '../hooks/useCountriesMap';
import type { CountryInfo, RegionInfo } from '../model/country';

vi.mock('../hooks/useCountriesMap');

const mockedUseCountriesMap = vi.mocked(useCountriesMap);

function renderCountriesMapPage(overrides: Partial<ReturnType<typeof useCountriesMap>> = {}) {
  const defaults: ReturnType<typeof useCountriesMap> = {
    clearSelection: vi.fn(),
    countries: [],
    drawerOpen: false,
    isLoadingCountries: false,
    loadError: null,
    mapElementRef: createRef<HTMLDivElement>(),
    regions: [],
    selectionError: null,
    setLoadError: vi.fn(),
    setSelectionError: vi.fn(),
    selectCountryByCode: vi.fn(),
    selectRegionByCode: vi.fn(),
    selectedCountry: null,
    selectedCountryCode: '',
    selectedRegionCode: '',
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  };

  mockedUseCountriesMap.mockReturnValue({
    ...defaults,
    ...overrides,
  });

  return render(<CountriesMapPage />);
}

describe('CountriesMapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a centered loading indicator while countries are loading', () => {
    renderCountriesMapPage({ isLoadingCountries: true });

    expect(screen.getByLabelText('Caricamento confini paesi')).toBeInTheDocument();
  });

  it('shows and dismisses the country load error banner', async () => {
    const setLoadError = vi.fn();

    renderCountriesMapPage({
      loadError: 'Impossibile caricare i confini dei paesi',
      setLoadError,
    });

    expect(screen.getByText('Impossibile caricare i confini dei paesi')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(setLoadError).toHaveBeenCalledWith(null);
  });

  it('shows the non-blocking selection error snackbar', () => {
    renderCountriesMapPage({
      selectionError: 'Paese non disponibile',
    });

    expect(screen.getByText('Paese non disponibile')).toBeInTheDocument();
  });

  it('passes countries and selection callbacks into the selector panel', async () => {
    const countries: CountryInfo[] = [{ name: 'Italia', iso2: 'IT' }];
    const regions: RegionInfo[] = [{ name: 'Abruzzo', code: 'ITA.1_1' }];
    const selectCountryByCode = vi.fn();
    const selectRegionByCode = vi.fn();

    renderCountriesMapPage({
      countries,
      regions,
      selectCountryByCode,
      selectRegionByCode,
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Paese' }));
    await userEvent.click(screen.getByRole('option', { name: 'Italia | IT' }));
    await userEvent.click(screen.getByRole('combobox', { name: 'Regione' }));
    await userEvent.click(screen.getByRole('option', { name: 'Abruzzo | ITA.1_1' }));

    expect(selectCountryByCode).toHaveBeenCalledWith('IT');
    expect(selectRegionByCode).toHaveBeenCalledWith('ITA.1_1');
  });

  it('calls map zoom callbacks from the overlay controls', async () => {
    const zoomIn = vi.fn();
    const zoomOut = vi.fn();

    renderCountriesMapPage({ zoomIn, zoomOut });

    await userEvent.click(screen.getByRole('button', { name: 'Aumenta zoom' }));
    await userEvent.click(screen.getByRole('button', { name: 'Diminuisci zoom' }));

    expect(zoomIn).toHaveBeenCalledTimes(1);
    expect(zoomOut).toHaveBeenCalledTimes(1);
  });
});
