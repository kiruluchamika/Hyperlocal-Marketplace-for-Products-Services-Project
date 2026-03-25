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
import { GeoNearbyItem } from '@/types';

const centerMarkerIcon = L.divIcon({
  className: 'geo-center-marker-icon',
  html: `
    <div style="
      width: 18px;
      height: 18px;
      border-radius: 9999px;
      background: #2563eb;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.22);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const getServiceMarkerIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'geo-service-marker-icon',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        background: ${isSelected ? '#2563eb' : '#0f766e'};
        border: 2px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.35);
      ">
        <div style="
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: #ffffff;
        "></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

interface GeoMapCanvasProps {
  center: [number, number];
  radiusKm: number;
  items: GeoNearbyItem[];
  selectedItemId?: string;
  onCenterChange: (center: [number, number]) => void;
  onSelectItem?: (item: GeoNearbyItem) => void;
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
    <div className="relative z-0 h-[460px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-card">
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

        <Marker position={center} icon={centerMarkerIcon}>
          <Popup>Selected center</Popup>
        </Marker>

        {renderedItems.map((item) => {
          const [lat, lng] = item.location!.coordinates!;
          return (
            <Marker
              key={item.id}
              position={[lat, lng]}
              icon={getServiceMarkerIcon(selectedItemId === item.id)}
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
