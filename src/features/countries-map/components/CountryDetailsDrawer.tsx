import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Typography from '@mui/material/Typography';
import { mapConfig } from '../lib/map-config';
import type { FeatureDisplayInfo } from '../model/country';

type CountryDetailsDrawerProps = {
  feature: FeatureDisplayInfo | null;
  onClose: () => void;
  open: boolean;
};

export function CountryDetailsDrawer({ feature, onClose, open }: CountryDetailsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      variant="persistent"
      transitionDuration={mapConfig.animationDuration}
      PaperProps={{
        className: 'country-drawer',
        sx: { width: `min(${mapConfig.drawerWidth}px, 100vw)` },
      }}
    >
      <Box className="drawer-content">
        <IconButton
          aria-label="Chiudi paese"
          className="drawer-close-button"
          onClick={onClose}
          size="small"
        >
          <SvgIcon fontSize="small" viewBox="0 0 24 24">
            <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z" />
          </SvgIcon>
        </IconButton>
        {feature && (
          <Typography className="country-title" component="h1">
            {feature.iso2 === null ? feature.name : `${feature.name} | ${feature.iso2}`}
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}
