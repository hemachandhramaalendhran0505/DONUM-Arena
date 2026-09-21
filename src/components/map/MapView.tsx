/**
 * DONUM — map surface.
 *
 * Renders a real Google Map when `VITE_GOOGLE_MAPS_API_KEY` is configured, and
 * an accurate schematic map (correct relative geography, distances and routes)
 * otherwise. Markers are role-aware: current location, pickup and destination.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { boundsOf, projectToPercent, roadDistanceKm } from '@/utils/geo';
import { cn } from '@/utils/cn';
import { MapPin, Navigation, Package, Warehouse } from 'lucide-react';

export type MarkerKind = 'current' | 'pickup' | 'destination' | 'donation' | 'request';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  sublabel?: string;
  kind: MarkerKind;
  active?: boolean;
  onClick?: () => void;
}

const MARKER_STYLE: Record<MarkerKind, { ring: string; dot: string; glyph: typeof MapPin }> = {
  current: { ring: 'bg-sky-500/20', dot: 'bg-sky-500', glyph: Navigation },
  pickup: { ring: 'bg-primary/20', dot: 'bg-primary', glyph: Package },
  destination: { ring: 'bg-success/20', dot: 'bg-success', glyph: Warehouse },
  donation: { ring: 'bg-primary/20', dot: 'bg-primary', glyph: Package },
  request: { ring: 'bg-warning/20', dot: 'bg-warning', glyph: MapPin },
};

const PIN_COLORS: Record<MarkerKind, string> = {
  current: '#0EA5E9',
  pickup: '#6C3CE9',
  destination: '#22C55E',
  donation: '#6C3CE9',
  request: '#F59E0B',
};

interface MapViewProps {
  markers: MapMarker[];
  /** Draw a route line between the markers, in order. */
  route?: boolean;
  className?: string;
  height?: string;
}

export function MapView({ markers, route = false, className, height = 'h-72' }: MapViewProps) {
  const { available } = useGoogleMaps();
  return available ? (
    <GoogleMapSurface markers={markers} route={route} className={className} height={height} />
  ) : (
    <SchematicMap markers={markers} route={route} className={className} height={height} />
  );
}

// ---------------------------------------------------------------------------
// Real Google Maps
// ---------------------------------------------------------------------------

function GoogleMapSurface({ markers, route, className, height }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Array<{ setMap: (m: google.maps.Map | null) => void }>>([]);

  useEffect(() => {
    if (!ref.current || !window.google?.maps) return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(ref.current, {
        center: { lat: markers[0]?.latitude ?? 12.9716, lng: markers[0]?.longitude ?? 77.5946 },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { elementType: 'geometry', stylers: [{ color: '#f8f7fc' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e0f0' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        ],
      });
    }

    const map = mapRef.current;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    markers.forEach((m) => {
      const position = { lat: m.latitude, lng: m.longitude };
      bounds.extend(position);
      const marker = new google.maps.Marker({
        position,
        map,
        title: m.label,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: m.active ? 11 : 9,
          fillColor: PIN_COLORS[m.kind],
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });
      if (m.onClick) marker.addListener('click', m.onClick);
      overlaysRef.current.push(marker);
    });

    if (route && markers.length > 1) {
      const line = new google.maps.Polyline({
        path: markers.map((m) => ({ lat: m.latitude, lng: m.longitude })),
        map,
        strokeColor: '#6C3CE9',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: '55%' }],
      });
      overlaysRef.current.push(line);
    }

    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].latitude, lng: markers[0].longitude });
      map.setZoom(15);
    } else if (markers.length > 1) {
      map.fitBounds(bounds, 64);
    }
  }, [markers, route]);

  return <div ref={ref} className={cn('w-full overflow-hidden rounded-2xl', height, className)} />;
}

// ---------------------------------------------------------------------------
// Schematic fallback map — real coordinates, projected to a clean canvas
// ---------------------------------------------------------------------------

function SchematicMap({ markers, route, className, height }: MapViewProps) {
  const bounds = useMemo(() => boundsOf(markers), [markers]);
  const points = useMemo(
    () => markers.map((m) => ({ marker: m, pos: projectToPercent(m, bounds) })),
    [markers, bounds],
  );

  const totalKm = useMemo(() => {
    if (!route || markers.length < 2) return null;
    let sum = 0;
    for (let i = 1; i < markers.length; i += 1) sum += roadDistanceKm(markers[i - 1], markers[i]);
    return sum;
  }, [route, markers]);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-ink/5 bg-gradient-to-br from-primary-50/70 via-white to-surface',
        height,
        className,
      )}
      role="img"
      aria-label={`Map showing ${markers.map((m) => m.label).join(', ')}`}
    >
      <div className="absolute inset-0 grid-noise opacity-60" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[20, 40, 60, 80].map((v) => (
          <g key={v} stroke="rgba(23,19,33,0.05)" strokeWidth="0.25">
            <line x1={v} y1="0" x2={v} y2="100" />
            <line x1="0" y1={v} x2="100" y2={v} />
          </g>
        ))}
        {route && points.length > 1 && (
          <polyline
            points={points.map((p) => `${p.pos.x},${p.pos.y}`).join(' ')}
            fill="none"
            stroke="#6C3CE9"
            strokeWidth="0.9"
            strokeDasharray="2.5 1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {points.map(({ marker, pos }) => {
        const style = MARKER_STYLE[marker.kind];
        const Glyph = style.glyph;
        return (
          <button
            key={marker.id}
            type="button"
            onClick={marker.onClick}
            disabled={!marker.onClick}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className={cn(
              'group absolute -translate-x-1/2 -translate-y-1/2 focus-ring',
              marker.onClick ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <span className="relative grid place-items-center">
              <span className={cn('absolute h-9 w-9 rounded-full', style.ring, marker.active && 'animate-ping')} />
              <span
                className={cn(
                  'relative grid h-8 w-8 place-items-center rounded-full text-white shadow-lg ring-[3px] ring-white transition-transform group-hover:scale-110',
                  style.dot,
                )}
              >
                <Glyph className="h-4 w-4" />
              </span>
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-max max-w-[140px] -translate-x-1/2 truncate rounded-lg bg-white/95 px-2 py-1 text-[11px] font-semibold text-ink shadow-soft ring-1 ring-ink/5">
              {marker.label}
            </span>
          </button>
        );
      })}

      {totalKm !== null && (
        <div className="absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-soft ring-1 ring-ink/5">
          Route · {totalKm.toFixed(1)} km
        </div>
      )}
      <div className="absolute bottom-3 right-3 rounded-lg bg-white/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink/45">
        Schematic view
      </div>
    </div>
  );
}

export function MapLegend({ items }: { items: Array<{ kind: MarkerKind; label: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <span key={item.kind} className="flex items-center gap-1.5 text-xs font-medium text-ink/55">
          <span className={cn('h-2.5 w-2.5 rounded-full', MARKER_STYLE[item.kind].dot)} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
