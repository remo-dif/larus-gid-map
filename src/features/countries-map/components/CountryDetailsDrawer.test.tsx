import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CountryDetailsDrawer } from './CountryDetailsDrawer';

describe('CountryDetailsDrawer', () => {
  it('renders country details and closes from the icon button', async () => {
    const onClose = vi.fn();

    render(
      <CountryDetailsDrawer
        feature={{ name: 'Italia', iso2: 'IT' }}
        onClose={onClose}
        open
      />,
    );

    expect(screen.getByRole('heading', { name: 'Italia | IT' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Chiudi paese' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a country without ISO code', () => {
    render(
      <CountryDetailsDrawer
        feature={{ name: 'Abruzzo', iso2: null }}
        onClose={vi.fn()}
        open
      />,
    );

    expect(screen.getByRole('heading', { name: 'Abruzzo' })).toBeInTheDocument();
  });
});
