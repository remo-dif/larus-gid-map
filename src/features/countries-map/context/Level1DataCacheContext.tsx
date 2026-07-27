import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { mapConfig } from '../lib/map-config';
import type { Level1Data } from '../model/country';

type Level1DataCacheContextValue = {
  loadLevel1Data: (countryCode: string, signal?: AbortSignal) => Promise<Level1Data>;
};

const Level1DataCacheContext = createContext<Level1DataCacheContextValue | null>(null);

type Level1DataCacheProviderProps = {
  children: ReactNode;
};

export function Level1DataCacheProvider({ children }: Level1DataCacheProviderProps) {
  const cacheRef = useRef<Map<string, Level1Data>>(new Map());
  // Keep in-flight fetches shared so fast repeated selections do not hit the same file twice.
  const pendingRequestsRef = useRef<Map<string, Promise<Level1Data>>>(new Map());

  const loadLevel1Data = useCallback(async (countryCode: string, signal?: AbortSignal) => {
    const cachedData = cacheRef.current.get(countryCode);
    if (cachedData) {
      return cachedData;
    }

    const pendingRequest = pendingRequestsRef.current.get(countryCode);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = fetch(mapConfig.level1GeoJsonUrl(countryCode), { signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Level1 data not found for ${countryCode}`);
        }

        return response.json() as Promise<Level1Data>;
      })
      .then((data) => {
        cacheRef.current.set(countryCode, data);
        return data;
      })
      .finally(() => {
        pendingRequestsRef.current.delete(countryCode);
      });

    pendingRequestsRef.current.set(countryCode, request);
    return request;
  }, []);

  const value = useMemo(() => ({ loadLevel1Data }), [loadLevel1Data]);

  return (
    <Level1DataCacheContext.Provider value={value}>
      {children}
    </Level1DataCacheContext.Provider>
  );
}

export function useLevel1DataCache() {
  const context = useContext(Level1DataCacheContext);
  if (!context) {
    throw new Error('useLevel1DataCache must be used inside Level1DataCacheProvider');
  }

  return context;
}
