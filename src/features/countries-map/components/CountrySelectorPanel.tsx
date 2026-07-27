import { useCallback, type SyntheticEvent } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import type { CountryInfo } from '../model/country';

type CountrySelectorPanelProps = {
  countries: CountryInfo[];
  selectedCountryCode: string;
  onCountryChange: (countryCode: string) => void;
};

function hasCountryCode(country: CountryInfo): country is CountryInfo & { iso2: string } {
  return country.iso2 !== null;
}

export function CountrySelectorPanel({
  countries,
  selectedCountryCode,
  onCountryChange,
}: CountrySelectorPanelProps) {
  const selectableCountries = countries.filter(hasCountryCode);
  const selectedCountry =
    selectableCountries.find((country) => country.iso2 === selectedCountryCode) || null;

  const handleCountryChange = useCallback(
    (_event: SyntheticEvent, country: (CountryInfo & { iso2: string }) | null) => {
      onCountryChange(country?.iso2 || '');
    },
    [onCountryChange],
  );

  return (
    <Box className="country-selector-panel" component="section" aria-label="Selezione paese">
      <Autocomplete
        id="country-selector"
        size="small"
        options={selectableCountries}
        value={selectedCountry}
        onChange={handleCountryChange}
        getOptionKey={(country) => country.iso2}
        getOptionLabel={(country) => `${country.name} | ${country.iso2}`}
        renderInput={(params) => <TextField {...params} label="Paese" />}
      />
    </Box>
  );
}
