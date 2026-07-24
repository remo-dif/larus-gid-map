import Box from '@mui/material/Box';
import { CountriesMap } from '../components/CountriesMap';
import { CountryDetailsDrawer } from '../components/CountryDetailsDrawer';
import { CountrySelectorPanel } from '../components/CountrySelectorPanel';
import { useCountriesMap } from '../hooks/useCountriesMap';

export function CountriesMapPage() {
  const {
    countries,
    drawerOpen,
    mapElementRef,
    selectCountryByCode,
    selectedCountry,
    selectedCountryCode,
  } = useCountriesMap();

  return (
    <Box className="app-shell">
      <CountriesMap mapElementRef={mapElementRef} />
      <CountrySelectorPanel
        countries={countries}
        selectedCountryCode={selectedCountryCode}
        onCountryChange={selectCountryByCode}
      />
      <CountryDetailsDrawer country={selectedCountry} open={drawerOpen} />
    </Box>
  );
}
