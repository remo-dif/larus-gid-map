import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CountrySelectorPanel } from './CountrySelectorPanel';
import type { CountryInfo, RegionInfo } from '../model/country';

const countries: CountryInfo[] = [
  { name: 'Italia', iso2: 'IT' },
  { name: 'Senza codice', iso2: null },
  { name: 'Francia', iso2: 'FR' },
];

const regions: RegionInfo[] = [
  { name: 'Abruzzo', code: 'ITA.1_1' },
  { name: 'Lazio', code: 'ITA.7_1' },
];

describe('CountrySelectorPanel', () => {
  it('renders only countries with a selectable ISO code', async () => {
    render(
      <CountrySelectorPanel
        countries={countries}
        regions={[]}
        selectedCountryCode=""
        selectedRegionCode=""
        onCountryChange={vi.fn()}
        onRegionChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Paese' }));

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('Italia | IT')).toBeInTheDocument();
    expect(within(listbox).getByText('Francia | FR')).toBeInTheDocument();
    expect(within(listbox).queryByText('Senza codice')).not.toBeInTheDocument();
  });

  it('calls onCountryChange with the selected country code', async () => {
    const onCountryChange = vi.fn();

    render(
      <CountrySelectorPanel
        countries={countries}
        regions={[]}
        selectedCountryCode=""
        selectedRegionCode=""
        onCountryChange={onCountryChange}
        onRegionChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Paese' }));
    await userEvent.click(screen.getByRole('option', { name: 'Francia | FR' }));

    expect(onCountryChange).toHaveBeenCalledWith('FR');
  });

  it('calls onRegionChange with the selected region code', async () => {
    const onRegionChange = vi.fn();

    render(
      <CountrySelectorPanel
        countries={countries}
        regions={regions}
        selectedCountryCode="IT"
        selectedRegionCode=""
        onCountryChange={vi.fn()}
        onRegionChange={onRegionChange}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Regione' }));
    await userEvent.click(screen.getByRole('option', { name: 'Lazio | ITA.7_1' }));

    expect(onRegionChange).toHaveBeenCalledWith('ITA.7_1');
  });
});
