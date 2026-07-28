import { useCallback, type SyntheticEvent } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import type { CountryInfo, RegionInfo, Sublevel2Info } from '../model/country';

type CountrySelectorPanelProps = {
  countries: CountryInfo[];
  regions: RegionInfo[];
  sublevel2Items: Sublevel2Info[];
  selectedCountryCode: string;
  selectedRegionCode: string;
  selectedSublevel2Code: string;
  onCountryChange: (countryCode: string) => void;
  onRegionChange: (regionCode: string) => void;
  onSublevel2Change: (sublevel2Code: string) => void;
};

function hasCountryCode(country: CountryInfo): country is CountryInfo & { iso2: string } {
  return country.iso2 !== null;
}

export function CountrySelectorPanel({
  countries,
  regions,
  sublevel2Items,
  selectedCountryCode,
  selectedRegionCode,
  selectedSublevel2Code,
  onCountryChange,
  onRegionChange,
  onSublevel2Change,
}: CountrySelectorPanelProps) {
  const selectableCountries = countries.filter(hasCountryCode);
  const selectedCountry =
    selectableCountries.find((country) => country.iso2 === selectedCountryCode) || null;
  const selectedRegion = regions.find((region) => region.code === selectedRegionCode) || null;
  const selectedSublevel2 =
    sublevel2Items.find((sublevel2) => sublevel2.code === selectedSublevel2Code) || null;

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

  const handleSublevel2Change = useCallback(
    (_event: SyntheticEvent, sublevel2: Sublevel2Info | null) => {
      onSublevel2Change(sublevel2?.code || '');
    },
    [onSublevel2Change],
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
        getOptionLabel={(region) => region.name}
        renderInput={(params) => <TextField {...params} label="Sottolivello 1" />}
      />
      <Autocomplete
        disabled={sublevel2Items.length === 0}
        id="sublevel2-selector"
        size="small"
        options={sublevel2Items}
        value={selectedSublevel2}
        onChange={handleSublevel2Change}
        getOptionKey={(sublevel2) => sublevel2.code}
        getOptionLabel={(sublevel2) => sublevel2.name}
        renderInput={(params) => <TextField {...params} label="Sottolivello 2" />}
      />
    </Box>
  );
}
