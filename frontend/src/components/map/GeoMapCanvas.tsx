import React, { useMemo } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { GeoNearbyItem } from '@/types';

// Fix default Leaflet marker asset resolution in Vite builds.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface GeoMapCanvasProps {
  center: [number, number];
  radiusKm: number;
  items: GeoNearbyItem[];
  selectedItemId?: string;
  onCenterChange: (center: [number, number]) => void;
  onSelectItem?: (item: GeoNearbyItem) => void;
  heightClassName?: string;
}

const CenterSync: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();

  React.useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
};

const ClickToRecenter: React.FC<{ onCenterChange: (center: [number, number]) => void }> = ({ onCenterChange }) => {
  useMapEvents({
    click(event) {
      onCenterChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
};

const GeoMapCanvas: React.FC<GeoMapCanvasProps> = ({
  center,
  radiusKm,
  items,
  selectedItemId,
  onCenterChange,
  onSelectItem,
  heightClassName = 'h-[460px]',
}) => {
  const renderedItems = useMemo(
    () =>
      items.filter(
        (item) =>
          !!item.location?.coordinates &&
          Number.isFinite(item.location.coordinates[0]) &&
          Number.isFinite(item.location.coordinates[1])
      ),
    [items]
  );

  return (
    <div className={`relative z-0 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-card ${heightClassName}`}>
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <CenterSync center={center} />
        <ClickToRecenter onCenterChange={onCenterChange} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.12 }}
        />

        <Marker position={center}>
          <Popup>Selected center</Popup>
        </Marker>

        {renderedItems.map((item) => {
          const [lat, lng] = item.location!.coordinates!;
          return (
            <Marker
              key={item.id}
              position={[lat, lng]}
              eventHandlers={{ click: () => onSelectItem?.(item) }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.city}</p>
                  <p className="mt-1 text-sm">LKR {item.price.toLocaleString()}</p>
                  <p className="text-xs text-blue-600">{item.distance} km away</p>
                  {selectedItemId === item.id && (
                    <p className="mt-1 text-xs font-medium text-emerald-600">Selected</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default GeoMapCanvas;
