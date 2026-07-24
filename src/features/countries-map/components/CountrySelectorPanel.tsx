import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import type { CountryInfo } from '../model/country';

type CountrySelectorPanelProps = {
  countries: CountryInfo[];
  selectedCountryCode: string;
  onCountryChange: (countryCode: string) => void;
};

export function CountrySelectorPanel({
  countries,
  selectedCountryCode,
  onCountryChange,
}: CountrySelectorPanelProps) {
  const handleCountryChange = (event: SelectChangeEvent) => {
    onCountryChange(event.target.value);
  };

  return (
    <Box className="country-selector-panel" component="section" aria-label="Selezione paese">
      <FormControl fullWidth size="small">
        <InputLabel id="country-selector-label">Paese</InputLabel>
        <Select
          labelId="country-selector-label"
          id="country-selector"
          label="Paese"
          value={selectedCountryCode}
          onChange={handleCountryChange}
          displayEmpty={false}
        >
          <MenuItem value="">
            <em>Nessuna selezione</em>
          </MenuItem>
          {countries.map((country) => (
            <MenuItem key={country.iso2} value={country.iso2}>
              {country.name} | {country.iso2}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
