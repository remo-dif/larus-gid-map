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

const sublevel2Items = [
  { name: 'Chieti', code: 'ITA.1.1_1' },
  { name: 'Pescara', code: 'ITA.1.3_1' },
];

describe('CountrySelectorPanel', () => {
  it('renders only countries with a selectable ISO code', async () => {
    render(
      <CountrySelectorPanel
        countries={countries}
        regions={[]}
        sublevel2Items={[]}
        selectedCountryCode=""
        selectedRegionCode=""
        selectedSublevel2Code=""
        onCountryChange={vi.fn()}
        onRegionChange={vi.fn()}
        onSublevel2Change={vi.fn()}
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
        sublevel2Items={[]}
        selectedCountryCode=""
        selectedRegionCode=""
        selectedSublevel2Code=""
        onCountryChange={onCountryChange}
        onRegionChange={vi.fn()}
        onSublevel2Change={vi.fn()}
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
        sublevel2Items={[]}
        selectedCountryCode="IT"
        selectedRegionCode=""
        selectedSublevel2Code=""
        onCountryChange={vi.fn()}
        onRegionChange={onRegionChange}
        onSublevel2Change={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Sottolivello 1' }));
    await userEvent.click(screen.getByRole('option', { name: 'Lazio' }));

    expect(onRegionChange).toHaveBeenCalledWith('ITA.7_1');
  });

  it('calls onSublevel2Change with the selected sublevel 2 code', async () => {
    const onSublevel2Change = vi.fn();

    render(
      <CountrySelectorPanel
        countries={countries}
        regions={regions}
        sublevel2Items={sublevel2Items}
        selectedCountryCode="IT"
        selectedRegionCode="ITA.1_1"
        selectedSublevel2Code=""
        onCountryChange={vi.fn()}
        onRegionChange={vi.fn()}
        onSublevel2Change={onSublevel2Change}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Sottolivello 2' }));
    await userEvent.click(screen.getByRole('option', { name: 'Pescara' }));

    expect(onSublevel2Change).toHaveBeenCalledWith('ITA.1.3_1');
  });
});
