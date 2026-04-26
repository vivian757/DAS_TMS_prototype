import { useMemo, useState } from 'react';
import { Marker, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

function vertexIcon(num: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};color:#fff;
      border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:600;line-height:1;
      box-shadow:0 2px 4px rgba(0,0,0,0.35);
      cursor:move;
      user-select:none;
    ">${num}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function PolygonDrawLayer({
  vertices,
  onChange,
  color,
}: {
  vertices: [number, number][];
  onChange: (v: [number, number][]) => void;
  color: string;
}) {
  const [hoverPoint, setHoverPoint] = useState<[number, number] | null>(null);

  useMapEvents({
    click(e) {
      onChange([...vertices, [e.latlng.lat, e.latlng.lng]]);
    },
    mousemove(e) {
      setHoverPoint([e.latlng.lat, e.latlng.lng]);
    },
    mouseout() {
      setHoverPoint(null);
    },
  });

  const icons = useMemo(
    () => vertices.map((_, i) => vertexIcon(i + 1, color)),
    [vertices.length, color],
  );

  function updateVertex(idx: number, lat: number, lng: number) {
    const next = vertices.map((v, i) => (i === idx ? ([lat, lng] as [number, number]) : v));
    onChange(next);
  }

  function removeVertex(idx: number) {
    onChange(vertices.filter((_, i) => i !== idx));
  }

  return (
    <>
      {vertices.length >= 3 && (
        <Polygon
          positions={vertices}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.18,
            weight: 2.5,
          }}
          interactive={false}
        />
      )}
      {vertices.length === 2 && (
        <Polyline
          positions={vertices}
          pathOptions={{ color, weight: 2.5, dashArray: '6 4' }}
          interactive={false}
        />
      )}
      {/* Rubber-band preview: 從最後一個頂點拉到游標位置 */}
      {hoverPoint && vertices.length >= 1 && (
        <Polyline
          positions={[vertices[vertices.length - 1], hoverPoint]}
          pathOptions={{
            color,
            weight: 2,
            dashArray: '4 4',
            opacity: 0.7,
          }}
          interactive={false}
        />
      )}
      {/* 當已有 ≥ 3 個頂點，也預覽閉合線（回到第一個頂點），引導用戶看到整體形狀 */}
      {hoverPoint && vertices.length >= 2 && (
        <Polyline
          positions={[hoverPoint, vertices[0]]}
          pathOptions={{
            color,
            weight: 1.5,
            dashArray: '2 4',
            opacity: 0.4,
          }}
          interactive={false}
        />
      )}
      {vertices.map((v, idx) => (
        <Marker
          key={idx}
          position={v}
          draggable
          icon={icons[idx]}
          eventHandlers={{
            drag(e) {
              const latlng = (e.target as L.Marker).getLatLng();
              updateVertex(idx, latlng.lat, latlng.lng);
            },
            dragend(e) {
              const latlng = (e.target as L.Marker).getLatLng();
              updateVertex(idx, latlng.lat, latlng.lng);
            },
            contextmenu() {
              removeVertex(idx);
            },
          }}
        />
      ))}
    </>
  );
}
