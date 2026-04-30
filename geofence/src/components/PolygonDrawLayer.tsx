import { useMemo, useState } from 'react';
import { CircleMarker, Marker, Polygon, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const ERROR_RED = '#E03C2E';
const EDGE_HIT_TOLERANCE_PX = 12;

// 點 P 到線段 AB 的最近距離與投影點（以像素為單位）
function pointToSegment(
  p: L.Point,
  a: L.Point,
  b: L.Point,
): { dist: number; proj: L.Point } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return { dist: Math.hypot(dx, dy), proj: a };
  }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = L.point(a.x + t * abx, a.y + t * aby);
  return { dist: Math.hypot(p.x - proj.x, p.y - proj.y), proj };
}

function vertexIcon(
  num: number,
  color: string,
  opts: { highlight?: boolean; showNumber?: boolean; isStart?: boolean } = {},
) {
  const { highlight = false, showNumber = true, isStart = false } = opts;

  if (!showNumber) {
    // 起點：靶心樣式（同心圓），標示「點回來閉合」的目標
    if (isStart) {
      const size = highlight ? 22 : 14;
      const innerSize = highlight ? 8 : 5;
      return L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};
          border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
          display:flex;align-items:center;justify-content:center;
          cursor:${highlight ? 'pointer' : 'move'};
        "><div style="
          width:${innerSize}px;height:${innerSize}px;border-radius:50%;background:#fff;
        "></div></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    }
    const size = highlight ? 18 : 12;
    return L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};
        border:2px solid #fff;
        box-shadow:0 1px 3px rgba(0,0,0,0.35);
        cursor:${highlight ? 'pointer' : 'move'};
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${highlight ? 28 : 22}px;height:${highlight ? 28 : 22}px;border-radius:50%;
      background:${highlight ? '#fff' : color};color:${highlight ? color : '#fff'};
      border:${highlight ? `3px solid ${color}` : '2px solid #fff'};
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:600;line-height:1;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      cursor:${highlight ? 'pointer' : 'move'};
      user-select:none;
    ">${num}</div>`,
    iconSize: [highlight ? 28 : 22, highlight ? 28 : 22],
    iconAnchor: [highlight ? 14 : 11, highlight ? 14 : 11],
  });
}

export default function PolygonDrawLayer({
  vertices,
  closed = false,
  showVertexNumbers = true,
  autoCloseOnThird = false,
  crossingEdges,
  fillRule = 'evenodd',
  insertOnEdge = false,
  dashedClosingEdge = false,
  onChange,
  onClose,
  color,
}: {
  vertices: [number, number][];
  closed?: boolean;
  showVertexNumbers?: boolean;
  autoCloseOnThird?: boolean;
  crossingEdges?: Set<number>;
  fillRule?: 'evenodd' | 'nonzero';
  insertOnEdge?: boolean;
  dashedClosingEdge?: boolean;
  onChange: (v: [number, number][]) => void;
  onClose?: () => void;
  color: string;
}) {
  const [hoverPoint, setHoverPoint] = useState<[number, number] | null>(null);
  const [hoverFirst, setHoverFirst] = useState(false);
  const [edgeHover, setEdgeHover] = useState<{
    idx: number;
    proj: [number, number];
  } | null>(null);

  // 計算 click / hover 是否落在某條邊的容差內，回傳 idx + 投影點
  function hitTestEdge(
    map: L.Map,
    latlng: L.LatLng,
  ): { idx: number; latlng: L.LatLng } | null {
    if (vertices.length < 2) return null;
    const clickPt = map.latLngToLayerPoint(latlng);
    let best: { idx: number; dist: number; proj: L.Point } | null = null;
    const segs: { idx: number; from: [number, number]; to: [number, number] }[] = [];
    for (let i = 0; i < vertices.length - 1; i++) {
      segs.push({ idx: i, from: vertices[i], to: vertices[i + 1] });
    }
    if (closed && vertices.length >= 3) {
      segs.push({
        idx: vertices.length - 1,
        from: vertices[vertices.length - 1],
        to: vertices[0],
      });
    }
    for (const seg of segs) {
      const a = map.latLngToLayerPoint(L.latLng(seg.from[0], seg.from[1]));
      const b = map.latLngToLayerPoint(L.latLng(seg.to[0], seg.to[1]));
      const { dist, proj } = pointToSegment(clickPt, a, b);
      if (
        dist < EDGE_HIT_TOLERANCE_PX &&
        (!best || dist < best.dist)
      ) {
        best = { idx: seg.idx, dist, proj };
      }
    }
    if (!best) return null;
    return { idx: best.idx, latlng: map.layerPointToLatLng(best.proj) };
  }

  useMapEvents({
    click(e) {
      const map = e.target as L.Map;
      // 任意邊插入：先嘗試 hit-test 邊
      if (insertOnEdge) {
        const hit = hitTestEdge(map, e.latlng);
        if (hit) {
          const newV: [number, number] = [hit.latlng.lat, hit.latlng.lng];
          const next = [
            ...vertices.slice(0, hit.idx + 1),
            newV,
            ...vertices.slice(hit.idx + 1),
          ];
          onChange(next);
          return;
        }
      }
      // 自動閉合模式：閉合是視覺結果，不阻擋繼續加點
      if (closed && !autoCloseOnThird) return;
      onChange([...vertices, [e.latlng.lat, e.latlng.lng]]);
    },
    mousemove(e) {
      setHoverPoint([e.latlng.lat, e.latlng.lng]);
      if (insertOnEdge) {
        const map = e.target as L.Map;
        const hit = hitTestEdge(map, e.latlng);
        if (hit) {
          setEdgeHover({ idx: hit.idx, proj: [hit.latlng.lat, hit.latlng.lng] });
        } else {
          setEdgeHover(null);
        }
      }
    },
    mouseout() {
      setHoverPoint(null);
      setEdgeHover(null);
    },
  });

  // 自動閉合模式不需要 hover-to-close 提示
  const canCloseTarget = !autoCloseOnThird && !closed && vertices.length >= 3;

  const icons = useMemo(
    () =>
      vertices.map((_, i) =>
        vertexIcon(i + 1, color, {
          highlight: canCloseTarget && i === 0 && hoverFirst,
          showNumber: showVertexNumbers,
          isStart: i === 0,
        }),
      ),
    [vertices.length, color, canCloseTarget, hoverFirst, showVertexNumbers],
  );

  // 個別 edges（讓有交叉的能單獨上紅色）
  const edgeList = useMemo(() => {
    const list: {
      idx: number;
      from: [number, number];
      to: [number, number];
    }[] = [];
    for (let i = 0; i < vertices.length - 1; i++) {
      list.push({ idx: i, from: vertices[i], to: vertices[i + 1] });
    }
    if (closed && vertices.length >= 3) {
      list.push({
        idx: vertices.length - 1,
        from: vertices[vertices.length - 1],
        to: vertices[0],
      });
    }
    return list;
  }, [vertices, closed]);

  function updateVertex(idx: number, lat: number, lng: number) {
    const next = vertices.map((v, i) =>
      i === idx ? ([lat, lng] as [number, number]) : v,
    );
    onChange(next);
  }

  function removeVertex(idx: number) {
    onChange(vertices.filter((_, i) => i !== idx));
  }

  return (
    <>
      {/* 已閉合 → 填色 polygon (不畫描邊，邊線由下面個別 Polyline 負責) */}
      {closed && vertices.length >= 3 && (
        <Polygon
          positions={vertices}
          pathOptions={{
            stroke: false,
            fillColor: color,
            fillOpacity: 0.15,
            fillRule,
          }}
          interactive={false}
        />
      )}

      {/* 邊線：個別渲染才能上紅色標示交叉 */}
      {edgeList.map((e) => {
        const isCrossing = crossingEdges?.has(e.idx) ?? false;
        return (
          <Polyline
            key={e.idx}
            positions={[e.from, e.to]}
            pathOptions={{
              color: isCrossing ? ERROR_RED : color,
              weight: isCrossing ? 3.5 : 2.5,
            }}
            interactive={false}
          />
        );
      })}

      {/* 補線預覽：≥3 點未閉合時顯示 V_last → V_first 虛線（讓用戶看見系統會幫他補的線） */}
      {dashedClosingEdge && !closed && vertices.length >= 3 && (
        <Polyline
          positions={[vertices[vertices.length - 1], vertices[0]]}
          pathOptions={{
            color,
            weight: 2,
            dashArray: '6 6',
            opacity: 0.7,
          }}
          interactive={false}
        />
      )}

      {/* 任意邊插入：hover 在邊上時顯示插入預覽（外環光暈 + 內圓點） */}
      {insertOnEdge && edgeHover && (
        <>
          <CircleMarker
            center={edgeHover.proj}
            radius={14}
            pathOptions={{
              color,
              weight: 1,
              fillColor: color,
              fillOpacity: 0.15,
            }}
            interactive={false}
          />
          <CircleMarker
            center={edgeHover.proj}
            radius={7}
            pathOptions={{
              color: '#fff',
              weight: 2.5,
              fillColor: color,
              fillOpacity: 1,
            }}
            interactive={false}
          />
        </>
      )}

      {/* Rubber-band preview: 從最後一個座標拉到游標位置
          （未閉合時都顯示；autoCloseOnThird 模式即使閉合後也持續顯示，因為仍可繼續加點）
          insertOnEdge 模式且 hover 在邊上時：讓位給插入預覽 */}
      {(!closed || autoCloseOnThird) &&
        hoverPoint &&
        vertices.length >= 1 &&
        !(insertOnEdge && edgeHover) && (
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

      {/* autoCloseOnThird 模式：另一條預覽邊「hover → 第 1 點」，呈現會自動閉合的形狀 */}
      {autoCloseOnThird &&
        hoverPoint &&
        vertices.length >= 2 &&
        !(insertOnEdge && edgeHover) && (
          <Polyline
            positions={[hoverPoint, vertices[0]]}
            pathOptions={{
              color,
              weight: 2,
              dashArray: '4 4',
              opacity: 0.7,
            }}
            interactive={false}
          />
        )}

      {/* ≥3 座標時顯示「可閉合」預覽線（從游標 / 最後座標 拉回第 1 個座標） */}
      {canCloseTarget && hoverPoint && !(insertOnEdge && edgeHover) && (
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

      {vertices.map((v, idx) => {
        const isFirstAndCanClose = canCloseTarget && idx === 0;
        return (
          <Marker
            key={idx}
            position={v}
            draggable
            icon={icons[idx]}
            eventHandlers={{
              click() {
                if (isFirstAndCanClose && onClose) onClose();
              },
              mouseover() {
                if (isFirstAndCanClose) setHoverFirst(true);
              },
              mouseout() {
                setHoverFirst(false);
              },
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
        );
      })}
    </>
  );
}
