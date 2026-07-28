import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import { mapConfig } from '../lib/map-config';
import type { Level1Data } from '../model/country';

type Level1DataCacheContextValue = {
  loadLevel1Data: (countryCode: string, signal?: AbortSignal) => Promise<Level1Data>;
  loadLevel2Data: (level1Code: string, signal?: AbortSignal) => Promise<Level1Data>;
};

const Level1DataCacheContext = createContext<Level1DataCacheContextValue | null>(null);

export class Level1DataFetchError extends Error {
  constructor(
    public readonly countryCode: string,
    public readonly status: number,
  ) {
    super(`Level1 data request failed for ${countryCode} with status ${status}`);
    this.name = 'Level1DataFetchError';
  }
}

export class Level2DataFetchError extends Error {
  constructor(
    public readonly level1Code: string,
    public readonly status: number,
  ) {
    super(`Level2 data request failed for ${level1Code} with status ${status}`);
    this.name = 'Level2DataFetchError';
  }
}

type Level1DataCacheProviderProps = {
  children: ReactNode;
};

export function Level1DataCacheProvider({ children }: Level1DataCacheProviderProps) {
  const cacheRef = useRef<Map<string, Level1Data>>(new Map());
  const level2CacheRef = useRef<Map<string, Level1Data>>(new Map());
  // Keep in-flight fetches shared so fast repeated selections do not hit the same file twice.
  const pendingRequestsRef = useRef<Map<string, Promise<Level1Data>>>(new Map());
  const pendingLevel2RequestsRef = useRef<Map<string, Promise<Level1Data>>>(new Map());

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
          throw new Level1DataFetchError(countryCode, response.status);
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

  const loadLevel2Data = useCallback(async (level1Code: string, signal?: AbortSignal) => {
    const cachedData = level2CacheRef.current.get(level1Code);
    if (cachedData) {
      return cachedData;
    }

    const pendingRequest = pendingLevel2RequestsRef.current.get(level1Code);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = fetch(mapConfig.level2GeoJsonUrl(level1Code), { signal })
      .then((response) => {
        if (!response.ok) {
          throw new Level2DataFetchError(level1Code, response.status);
        }

        return response.json() as Promise<Level1Data>;
      })
      .then((data) => {
        level2CacheRef.current.set(level1Code, data);
        return data;
      })
      .finally(() => {
        pendingLevel2RequestsRef.current.delete(level1Code);
      });

    pendingLevel2RequestsRef.current.set(level1Code, request);
    return request;
  }, []);

  const value = useMemo(() => ({ loadLevel1Data, loadLevel2Data }), [loadLevel1Data, loadLevel2Data]);

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
