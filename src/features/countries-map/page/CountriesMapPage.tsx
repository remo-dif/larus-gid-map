import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import { CountriesMap } from '../components/CountriesMap';
import { CountryDetailsDrawer } from '../components/CountryDetailsDrawer';
import { CountrySelectorPanel } from '../components/CountrySelectorPanel';
import { useCountriesMap } from '../hooks/useCountriesMap';

export function CountriesMapPage() {
  const {
    countries,
    drawerOpen,
    isLoadingCountries,
    loadError,
    mapElementRef,
    selectionError,
    setLoadError,
    setSelectionError,
    selectCountryByCode,
    selectedCountry,
    selectedCountryCode,
  } = useCountriesMap();

  return (
    <Box className="app-shell">
      <CountriesMap mapElementRef={mapElementRef} />
      {isLoadingCountries && (
        <Box
          alignItems="center"
          display="flex"
          justifyContent="center"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.38)',
          }}
        >
          <CircularProgress aria-label="Caricamento confini paesi" />
        </Box>
      )}
      {loadError && (
        <Alert
          severity="error"
          onClose={() => setLoadError(null)}
          sx={{
            position: 'absolute',
            top: 72,
            left: 12,
            zIndex: 3,
            width: 'min(420px, calc(100vw - 24px))',
          }}
        >
          {loadError}
        </Alert>
      )}
      <CountrySelectorPanel
        countries={countries}
        selectedCountryCode={selectedCountryCode}
        onCountryChange={selectCountryByCode}
      />
      <CountryDetailsDrawer country={selectedCountry} open={drawerOpen} />
      <Snackbar
        open={selectionError !== null}
        autoHideDuration={3000}
        message={selectionError}
        onClose={() => setSelectionError(null)}
      />
    </Box>
  );
}
