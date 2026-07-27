import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Level1DataCacheProvider } from './features/countries-map/context/Level1DataCacheContext';
import './styles.css';
import 'ol/ol.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <Level1DataCacheProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Level1DataCacheProvider>,
);
