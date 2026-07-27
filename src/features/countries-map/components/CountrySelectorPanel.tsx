import { useCallback, type SyntheticEvent } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import type { CountryInfo, RegionInfo } from '../model/country';

type CountrySelectorPanelProps = {
  countries: CountryInfo[];
  regions: RegionInfo[];
  selectedCountryCode: string;
  selectedRegionCode: string;
  onCountryChange: (countryCode: string) => void;
  onRegionChange: (regionCode: string) => void;
};

function hasCountryCode(country: CountryInfo): country is CountryInfo & { iso2: string } {
  return country.iso2 !== null;
}

export function CountrySelectorPanel({
  countries,
  regions,
  selectedCountryCode,
  selectedRegionCode,
  onCountryChange,
  onRegionChange,
}: CountrySelectorPanelProps) {
  const selectableCountries = countries.filter(hasCountryCode);
  const selectedCountry =
    selectableCountries.find((country) => country.iso2 === selectedCountryCode) || null;
  const selectedRegion = regions.find((region) => region.code === selectedRegionCode) || null;

  const handleCountryChange = useCallback(
    (_event: SyntheticEvent, country: (CountryInfo & { iso2: string }) | null) => {
      onCountryChange(country?.iso2 || '');
    },
    [onCountryChange],
  );

  const handleRegionChange = useCallback(
    (_event: SyntheticEvent, region: RegionInfo | null) => {
      onRegionChange(region?.code || '');
    },
    [onRegionChange],
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
      <Autocomplete
        disabled={regions.length === 0}
        id="region-selector"
        size="small"
        options={regions}
        value={selectedRegion}
        onChange={handleRegionChange}
        getOptionKey={(region) => region.code}
        getOptionLabel={(region) => `${region.name} | ${region.code}`}
        renderInput={(params) => <TextField {...params} label="Regione" />}
      />
    </Box>
  );
}
