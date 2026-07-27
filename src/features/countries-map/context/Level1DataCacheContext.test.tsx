import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Level1DataCacheProvider, useLevel1DataCache } from './Level1DataCacheContext';
import type { Level1Data } from '../model/country';

function CacheProbe({
  countryCode,
  onLoaded,
  signal,
}: {
  countryCode: string;
  onLoaded: (data: Level1Data) => void;
  signal?: AbortSignal;
}) {
  const { loadLevel1Data } = useLevel1DataCache();

  useEffect(() => {
    void loadLevel1Data(countryCode, signal).then(onLoaded);
  }, [countryCode, loadLevel1Data, onLoaded, signal]);

  return <span>ready</span>;
}

function MissingProviderProbe() {
  useLevel1DataCache();
  return null;
}

describe('Level1DataCacheContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches level1 data once and serves cached values on later requests', async () => {
    const level1Data = { type: 'FeatureCollection', features: [] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(level1Data),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onLoaded = vi.fn();

    const { rerender } = render(
      <Level1DataCacheProvider>
        <CacheProbe key="first-load" countryCode="IT" onLoaded={onLoaded} />
      </Level1DataCacheProvider>,
    );

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(level1Data));

    rerender(
      <Level1DataCacheProvider>
        <CacheProbe key="cached-load" countryCode="IT" onLoaded={onLoaded} />
      </Level1DataCacheProvider>,
    );

    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/level1/IT.geojson', { signal: undefined });
  });

  it('deduplicates pending requests for the same country code', async () => {
    const level1Data = { type: 'FeatureCollection', features: [] };
    let resolveJson: (data: Level1Data) => void = () => undefined;
    const jsonPromise = new Promise<Level1Data>((resolve) => {
      resolveJson = resolve;
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(() => jsonPromise),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onLoaded = vi.fn();

    render(
      <Level1DataCacheProvider>
        <CacheProbe countryCode="FR" onLoaded={onLoaded} />
        <CacheProbe countryCode="FR" onLoaded={onLoaded} />
      </Level1DataCacheProvider>,
    );

    resolveJson(level1Data);

    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects failed responses and removes the pending request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const errors: unknown[] = [];

    function FailingProbe() {
      const { loadLevel1Data } = useLevel1DataCache();

      useEffect(() => {
        void loadLevel1Data('DE')
          .catch((error) => errors.push(error))
          .then(() => loadLevel1Data('DE'))
          .catch((error) => errors.push(error));
      }, [loadLevel1Data]);

      return <span>retry</span>;
    }

    render(
      <Level1DataCacheProvider>
        <FailingProbe />
      </Level1DataCacheProvider>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(errors).toHaveLength(1);
  });

  it('throws when the hook is used outside the provider', () => {
    expect(() => render(<MissingProviderProbe />)).toThrow(
      'useLevel1DataCache must be used inside Level1DataCacheProvider',
    );
  });
});
