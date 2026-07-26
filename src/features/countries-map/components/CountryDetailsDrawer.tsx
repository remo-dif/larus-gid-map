import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import { mapConfig } from '../lib/map-config';
import type { CountryInfo } from '../model/country';

type CountryDetailsDrawerProps = {
  country: CountryInfo | null;
  open: boolean;
};

export function CountryDetailsDrawer({ country, open }: CountryDetailsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      variant="persistent"
      transitionDuration={mapConfig.animationDuration}
      PaperProps={{
        className: 'country-drawer',
        sx: { width: `min(${mapConfig.drawerWidth}px, calc(100vw - 24px))` },
      }}
    >
      <Box className="drawer-content">
        {country && (
          <Typography className="country-title" component="h1">
            {country.iso2 === null ? country.name : `${country.name} | ${country.iso2}`}
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}
