import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import SvgIcon from '@mui/material/SvgIcon';
import { CountriesMap } from '../components/CountriesMap';
import { CountryDetailsDrawer } from '../components/CountryDetailsDrawer';
import { CountrySelectorPanel } from '../components/CountrySelectorPanel';
import { useCountriesMap } from '../hooks/useCountriesMap';

export function CountriesMapPage() {
  const {
    countries,
    clearSelection,
    drawerOpen,
    isLoadingCountries,
    loadError,
    mapElementRef,
    regions,
    sublevel2Items,
    selectionError,
    setLoadError,
    setSelectionError,
    selectCountryByCode,
    selectRegionByCode,
    selectSublevel2ByCode,
    selectedFeature,
    selectedCountryCode,
    selectedRegionCode,
    selectedSublevel2Code,
    zoomIn,
    zoomOut,
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
        regions={regions}
        sublevel2Items={sublevel2Items}
        selectedCountryCode={selectedCountryCode}
        selectedRegionCode={selectedRegionCode}
        selectedSublevel2Code={selectedSublevel2Code}
        onCountryChange={selectCountryByCode}
        onRegionChange={selectRegionByCode}
        onSublevel2Change={selectSublevel2ByCode}
      />
      <Box className="map-zoom-controls" aria-label="Controlli zoom">
        <IconButton aria-label="Aumenta zoom" onClick={zoomIn} size="small">
          <SvgIcon fontSize="small" viewBox="0 0 24 24">
            <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
          </SvgIcon>
        </IconButton>
        <IconButton aria-label="Diminuisci zoom" onClick={zoomOut} size="small">
          <SvgIcon fontSize="small" viewBox="0 0 24 24">
            <path d="M5 11h14v2H5z" />
          </SvgIcon>
        </IconButton>
      </Box>
      <CountryDetailsDrawer feature={selectedFeature} onClose={clearSelection} open={drawerOpen} />
      <Snackbar
        open={selectionError !== null}
        autoHideDuration={3000}
        message={selectionError}
        onClose={() => setSelectionError(null)}
      />
    </Box>
  );
}
