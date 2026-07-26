import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CountrySelectorPanel } from './CountrySelectorPanel';
import type { CountryInfo } from '../model/country';

const countries: CountryInfo[] = [
  { name: 'Italia', iso2: 'IT' },
  { name: 'Senza codice', iso2: null },
  { name: 'Francia', iso2: 'FR' },
];

describe('CountrySelectorPanel', () => {
  it('renders only countries with a selectable ISO code', async () => {
    render(
      <CountrySelectorPanel
        countries={countries}
        selectedCountryCode=""
        onCountryChange={vi.fn()}
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
        selectedCountryCode=""
        onCountryChange={onCountryChange}
      />,
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Paese' }));
    await userEvent.click(screen.getByRole('option', { name: 'Francia | FR' }));

    expect(onCountryChange).toHaveBeenCalledWith('FR');
  });
});
