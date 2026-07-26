import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CountriesMapPage } from './CountriesMapPage';
import { useCountriesMap } from '../hooks/useCountriesMap';
import type { CountryInfo } from '../model/country';

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
    selectionError: null,
    setLoadError: vi.fn(),
    setSelectionError: vi.fn(),
    selectCountryByCode: vi.fn(),
    selectedCountry: null,
    selectedCountryCode: '',
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
    const selectCountryByCode = vi.fn();

    renderCountriesMapPage({
      countries,
      selectCountryByCode,
    });

    await userEvent.click(screen.getByRole('combobox', { name: 'Paese' }));
    await userEvent.click(screen.getByRole('option', { name: 'Italia | IT' }));

    expect(selectCountryByCode).toHaveBeenCalledWith('IT');
  });
});
