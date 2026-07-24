type CountriesMapProps = {
  mapElementRef: React.RefObject<HTMLDivElement | null>;
};

export function CountriesMap({ mapElementRef }: CountriesMapProps) {
  return <div ref={mapElementRef} className="map-root" />;
}
