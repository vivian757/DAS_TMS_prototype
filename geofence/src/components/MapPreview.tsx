import { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import PolygonDrawLayer from './PolygonDrawLayer';

const markerIcon = L.divIcon({
  className: 'center-marker',
  html: '<div style="width:12px;height:12px;background:#27AAE1;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function FitRadius({ center, radius }: { center: [number, number]; radius: number }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(center[0], center[1]).toBounds(radius * 2).pad(0.2);
    map.fitBounds(bounds, { maxZoom: 16 });
  }, [center, radius, map]);
  return null;
}

function FitVertices({ vertices, fallbackCenter }: {
  vertices: [number, number][];
  fallbackCenter: [number, number];
}) {
  const map = useMap();
  const n = vertices.length;
  const firstLat = vertices[0]?.[0] ?? 0;
  const firstLng = vertices[0]?.[1] ?? 0;
  useEffect(() => {
    if (vertices.length >= 2) {
      const bounds = L.latLngBounds(vertices.map(([la, ln]) => L.latLng(la, ln))).pad(0.25);
      map.fitBounds(bounds, { maxZoom: 16 });
    } else if (vertices.length === 1) {
      map.setView(vertices[0], 16);
    } else {
      // 頂點尚未開始，但地址已定位 → focus 並放大至目標位置
      map.flyTo(fallbackCenter, 16, { duration: 0.5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, firstLat, firstLng, fallbackCenter[0], fallbackCenter[1]]);
  return null;
}

function ClickCatcher({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type CircleProps = {
  shape?: 'circle';
  center: [number, number];
  radius: number;
  height?: number | string;
  onCenterChange?: (lat: number, lng: number) => void;
};

type PolygonProps = {
  shape: 'polygon';
  center: [number, number];
  vertices: [number, number][];
  onVerticesChange: (v: [number, number][]) => void;
  height?: number | string;
};

type MapPreviewProps = CircleProps | PolygonProps;

export default function MapPreview(props: MapPreviewProps) {
  const height = props.height ?? 260;

  if (props.shape === 'polygon') {
    const { center, vertices, onVerticesChange } = props;
    return (
      <MapContainer
        center={center}
        zoom={14}
        style={{
          height,
          width: '100%',
          borderRadius: 8,
          cursor: 'crosshair',
        }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <PolygonDrawLayer vertices={vertices} onChange={onVerticesChange} color="#00658F" />
        <FitVertices vertices={vertices} fallbackCenter={center} />
      </MapContainer>
    );
  }

  const { center, radius, onCenterChange } = props;
  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{
        height,
        width: '100%',
        borderRadius: 8,
        cursor: onCenterChange ? 'crosshair' : '',
      }}
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickCatcher onClick={onCenterChange} />
      <Marker position={center} icon={markerIcon} />
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color: '#27AAE1',
          fillColor: '#27AAE1',
          fillOpacity: 0.15,
          weight: 2,
        }}
      />
      <FitRadius center={center} radius={radius} />
    </MapContainer>
  );
}
