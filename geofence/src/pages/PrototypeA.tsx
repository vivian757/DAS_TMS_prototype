import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Slider,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  MapContainer,
  TileLayer,
  Circle,
  Polygon,
  Marker,
  useMap,
  useMapEvents,
  Tooltip as LeafletTooltip,
} from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import CheckIcon from '@mui/icons-material/Check';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SensorsIcon from '@mui/icons-material/Sensors';

import { mockGeofences, Geofence, guessAddress, AuditEntry, centroidOf } from '../data/mockGeofences';
import { mockEvents } from '../data/mockEvents';
import {
  DeleteConfirmDialog,
  ToggleConfirmDialog,
  EditImpactConfirmDialog,
  EditConfirmDialog,
  BatchDeleteConfirmDialog,
} from '../components/GeofenceDialogs';
import GlobalMonitoringSettingsDialog, {
  DEFAULT_MONITORING_SETTINGS,
  MonitoringSettingsState,
} from '../components/GlobalMonitoringSettingsDialog';
import PolygonDrawLayer from '../components/PolygonDrawLayer';

const DRAWER_DEFAULT_WIDTH = 400;
const DRAWER_MIN_WIDTH = 320;
const TAIWAN_BOUNDS: L.LatLngBoundsLiteral = [
  [21.9, 119.8],
  [25.5, 122.2],
];

type DrawerMode = 'list' | 'detail' | 'edit' | 'create';

interface Draft {
  name: string;
  address: string;
  note: string;
  shape: '圓形' | '多邊形';
  radius: number;
  center: [number, number] | null;
  vertices: [number, number][];
}

// Focus marker — used for both edit-in-progress and create-in-progress.
// 同一個視覺 = 當前操作中的圍籬中心點。
const focusMarkerIcon = L.divIcon({
  className: 'focus-center-marker',
  html: '<div style="width:14px;height:14px;background:#00658F;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Radius handle — a draggable dot on the circle's east edge for live resize.
const radiusHandleIcon = L.divIcon({
  className: 'radius-handle-marker',
  html: '<div style="width:16px;height:16px;background:#fff;border:2.5px solid #00658F;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.35);cursor:ew-resize;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Convert radius in meters to a position offset east of the center,
// accounting for latitude shrinkage of longitude degrees.
function radiusHandlePosition(
  center: [number, number],
  radius: number,
): [number, number] {
  const metersPerDegLng = 111320 * Math.cos((center[0] * Math.PI) / 180);
  return [center[0], center[1] + radius / metersPerDegLng];
}

function FitToMarkers({
  geofences,
  focusId,
  draftShape,
  draftCenter,
  draftRadius,
  draftVertices,
  triggerKey,
}: {
  geofences: Geofence[];
  focusId: string | null;
  draftShape: '圓形' | '多邊形' | null;
  draftCenter: [number, number] | null;
  draftRadius: number;
  draftVertices: [number, number][];
  triggerKey: string | number;
}) {
  const map = useMap();
  useEffect(() => {
    if (draftShape === '多邊形') {
      if (draftVertices.length >= 2) {
        const bounds = L.latLngBounds(
          draftVertices.map(([la, ln]) => L.latLng(la, ln)),
        ).pad(0.4);
        map.flyToBounds(bounds, { maxZoom: 16, duration: 0.5 });
        return;
      }
      if (draftCenter) {
        // 頂點尚未開始，但已透過地址定位 → focus 並放大到該位置
        map.flyTo(draftCenter, 16, { duration: 0.5 });
        return;
      }
      return;
    }
    if (draftShape === '圓形' && draftCenter) {
      const bounds = L.latLng(draftCenter[0], draftCenter[1]).toBounds(
        Math.max(draftRadius * 3, 600),
      );
      map.flyToBounds(bounds, { maxZoom: 15, duration: 0.5 });
      return;
    }
    if (focusId) {
      const g = geofences.find((x) => x.id === focusId);
      if (g) {
        if (g.type === '多邊形' && g.vertices && g.vertices.length >= 3) {
          const bounds = L.latLngBounds(
            g.vertices.map(([la, ln]) => L.latLng(la, ln)),
          ).pad(0.4);
          map.flyToBounds(bounds, { maxZoom: 15, duration: 0.6 });
        } else {
          const bounds = L.latLng(g.lat, g.lng).toBounds(
            Math.max((g.radius || 300) * 3, 600),
          );
          map.flyToBounds(bounds, { maxZoom: 15, duration: 0.6 });
        }
      }
      return;
    }
    if (geofences.length === 0) {
      map.fitBounds(TAIWAN_BOUNDS);
      return;
    }
    const bounds = new LatLngBounds(geofences.map((g) => [g.lat, g.lng]));
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 12, duration: 0.4 });
  }, [focusId, triggerKey, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function MapClickCatcher({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function PrototypeA() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<Geofence[]>(mockGeofences);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<DrawerMode>('list');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const [fitTrigger, setFitTrigger] = useState(0);
  const [deleting, setDeleting] = useState<Geofence | null>(null);
  const [toggling, setToggling] = useState<{ geofence: Geofence; nextEnabled: boolean } | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{
    updated: Geofence;
    original: Geofence;
    geometryChanged: boolean;
  } | null>(null);

  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);

  const [showOthersInForm, setShowOthersInForm] = useState(true);
  const [snack, setSnack] = useState<string | null>(null);
  const [tileStyle, setTileStyle] = useState<'color' | 'grayscale'>('color');
  const [monitoringSettings, setMonitoringSettings] =
    useState<MonitoringSettingsState>(DEFAULT_MONITORING_SETTINGS);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 從批次匯入頁返回時讀取結果，秀 snackbar
  useEffect(() => {
    const result = (location.state as { batchImportResult?: { success: number; failed: number } } | null)
      ?.batchImportResult;
    if (result) {
      setSnack(
        `已匯入：成功 ${result.success} 筆 · 失敗 ${result.failed} 筆`,
      );
      // 清掉 state 避免重整或返回時重複觸發
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      if (!splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const maxPx = rect.width * 0.5;
      const raw = e.clientX - rect.left;
      setDrawerWidth(Math.max(DRAWER_MIN_WIDTH, Math.min(maxPx, raw)));
    }
    function onUp() {
      setDragging(false);
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const matchedIds = useMemo(() => {
    const s = search.trim();
    if (!s) return null;
    return new Set(
      data.filter((g) => g.name.includes(s) || g.address.includes(s)).map((g) => g.id),
    );
  }, [data, search]);

  const focused = data.find((g) => g.id === focusId) ?? null;
  const isFormMode = mode === 'edit' || mode === 'create';

  function circleStyle(g: Geofence) {
    const isBeingEdited = mode === 'edit' && g.id === focusId;
    if (isBeingEdited) {
      // 原本那個被編輯的圓不再畫 (改用 draft circle 代替)
      return { opacity: 0, fillOpacity: 0, weight: 0 };
    }
    // In form mode, hide other geofences entirely unless user explicitly opts in
    if (isFormMode && !showOthersInForm) {
      return { opacity: 0, fillOpacity: 0, weight: 0 };
    }
    // In form mode with opt-in, show others in subdued primary color so they're
    // visible as context without competing with the navy draft shape
    if (isFormMode && showOthersInForm) {
      const refColor = theme.palette.dasPrimary.primary;
      return {
        color: refColor,
        fillColor: refColor,
        fillOpacity: 0.14,
        weight: 1.5,
        opacity: 0.8,
      };
    }
    const isFocused = g.id === focusId && !isFormMode;
    const dimmedBySearch = matchedIds !== null && !matchedIds.has(g.id);
    // Focus 時其他圍籬用 80% 透明度呈現（還看得到，只是退到背景）
    const softened = focusId !== null && !isFocused;
    const baseColor = '#27AAE1';
    return {
      color: isFocused ? theme.palette.dasPrimary.dark01 : baseColor,
      fillColor: isFocused ? theme.palette.dasPrimary.dark01 : baseColor,
      fillOpacity: dimmedBySearch ? 0.02 : isFocused ? 0.35 : softened ? 0.14 : 0.18,
      weight: isFocused ? 3 : dimmedBySearch ? 1 : 1.5,
      opacity: dimmedBySearch ? 0.22 : softened ? 0.8 : 1,
    };
  }

  function goToList() {
    setMode('list');
    setFocusId(null);
    setDraft(null);
  }

  // 從 detail 返回 list 時保留當前地圖視野與 focus 狀態
  // 要「回到全貌」請按右下角的「顯示全部」
  function backToListKeepView() {
    setMode('list');
    setDraft(null);
  }

  function focusGeofence(id: string) {
    // 如果正在編輯／建立，不要隨便切換
    if (isFormMode) return;
    setFocusId(id);
    setMode('detail');
  }

  function startEdit(g: Geofence) {
    setFocusId(g.id);
    setMode('edit');
    setDraft({
      name: g.name,
      address: g.address,
      note: g.note ?? '',
      shape: g.type,
      radius: g.radius || 200,
      center: [g.lat, g.lng],
      vertices: g.vertices ? [...g.vertices] : [],
    });
  }

  function startCreate(opts?: { center?: [number, number] }) {
    setFocusId(null);
    setMode('create');
    setDraft({
      name: '',
      address: '',
      note: '',
      shape: '圓形',
      radius: 200,
      center: opts?.center ?? null,
      vertices: [],
    });
  }

  function cancelForm() {
    if (mode === 'edit' && focusId) {
      setMode('detail');
      setDraft(null);
    } else {
      goToList();
    }
  }

  function handleMapClickForForm(lat: number, lng: number) {
    if (!isFormMode) return;
    setDraft((d) => {
      if (!d) return d;
      if (d.shape === '多邊形') {
        return { ...d, vertices: [...d.vertices, [lat, lng]] };
      }
      return {
        ...d,
        center: [lat, lng],
        address: guessAddress(lat, lng),
      };
    });
  }

  function applyEdit(updated: Geofence) {
    setData((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setMode('detail');
    setDraft(null);
    setSnack(`已更新圍籬「${updated.name}」`);
  }

  function commitForm() {
    if (!draft) return;
    if (draft.shape === '圓形' && !draft.center) return;
    if (draft.shape === '多邊形' && draft.vertices.length < 3) return;

    const today = '2026-04-23';
    const nowTime = `${today} 10:00`;
    const actor = '王小美';

    const [lat, lng] =
      draft.shape === '多邊形'
        ? centroidOf(draft.vertices)
        : (draft.center as [number, number]);

    if (mode === 'edit' && focused) {
      let summary = '更新圍籬內容';
      if (draft.shape === '圓形') {
        if (focused.radius !== draft.radius) {
          summary = `調整半徑 ${focused.radius}m → ${draft.radius}m`;
        } else if (focused.lat !== lat || focused.lng !== lng) {
          summary = '更新中心點位置';
        }
      } else if (
        JSON.stringify(focused.vertices ?? []) !== JSON.stringify(draft.vertices)
      ) {
        summary = `更新多邊形頂點（${focused.vertices?.length ?? 0} → ${draft.vertices.length} 個）`;
      }
      if (focused.name !== draft.name.trim()) summary = '更新圍籬名稱';
      const newEntry: AuditEntry = { time: nowTime, user: actor, role: '調度員', summary };
      const updated: Geofence = {
        ...focused,
        name: draft.name.trim(),
        address: draft.address.trim() || `地圖座標 (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        note: draft.note.trim() || undefined,
        radius: draft.shape === '圓形' ? draft.radius : 0,
        vertices: draft.shape === '多邊形' ? draft.vertices : undefined,
        lat,
        lng,
        updatedAt: today,
        auditLog: [newEntry, ...focused.auditLog],
      };
      const addressChanged = focused.address !== updated.address;
      const radiusChanged =
        draft.shape === '圓形' && focused.radius !== draft.radius;
      const centerChanged =
        draft.shape === '圓形' && (focused.lat !== lat || focused.lng !== lng);
      const verticesChanged =
        draft.shape === '多邊形' &&
        JSON.stringify(focused.vertices ?? []) !==
          JSON.stringify(draft.vertices);
      const geometryChanged =
        addressChanged || radiusChanged || centerChanged || verticesChanged;

      setPendingEdit({ updated, original: focused, geometryChanged });
      return;
    }

    // create
    const g: Geofence = {
      id: `GF-NEW-${Date.now()}`,
      name: draft.name.trim(),
      type: draft.shape,
      address: draft.address.trim() || `地圖座標 (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      lat,
      lng,
      radius: draft.shape === '圓形' ? draft.radius : 0,
      vertices: draft.shape === '多邊形' ? draft.vertices : undefined,
      note: draft.note.trim() || undefined,
      isEnabled: true,
      usingOrderCount: 0,
      creationMethod: '手動建立',
      createdBy: actor,
      createdAt: today,
      updatedAt: today,
      auditLog: [{ time: nowTime, user: actor, role: '調度員', summary: '建立圍籬' }],
    };
    setData((prev) => [g, ...prev]);
    setFocusId(g.id);
    setMode('detail');
    setDraft(null);
    setSnack(`已新增圍籬「${g.name}」`);
  }

  function requestToggleEnabled(g: Geofence) {
    setToggling({ geofence: g, nextEnabled: !g.isEnabled });
  }

  function confirmToggleEnabled() {
    if (!toggling) return;
    const { geofence, nextEnabled } = toggling;
    const today = '2026-04-23';
    const entry: AuditEntry = {
      time: `${today} 10:00`,
      user: '王小美',
      role: '調度員',
      summary: nextEnabled ? '啟用' : '停用',
    };
    setData((prev) =>
      prev.map((p) =>
        p.id === geofence.id
          ? {
              ...p,
              isEnabled: nextEnabled,
              updatedAt: today,
              auditLog: [entry, ...p.auditLog],
            }
          : p,
      ),
    );
    setToggling(null);
  }

  return (
    <Box ref={splitRef} sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* LEFT DRAWER */}
      <Box
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          bgcolor: '#fff',
          borderRight: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 2,
          ...(dragging && { pointerEvents: 'none' }),
        }}
      >
        {mode === 'list' && (
          <BrowseList
            geofences={data}
            matchedIds={matchedIds}
            search={search}
            onSearchChange={setSearch}
            onFocus={(id) => focusGeofence(id)}
            onCreate={startCreate}
            onBatchImport={() => navigate('/a/batch-import')}
            selectedIds={selectedIds}
            onToggleRow={(id) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onToggleAllVisible={(visible) => {
              const allSelected =
                visible.length > 0 &&
                visible.every((g) => selectedIds.has(g.id));
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (allSelected) {
                  visible.forEach((g) => next.delete(g.id));
                } else {
                  visible.forEach((g) => next.add(g.id));
                }
                return next;
              });
            }}
            onClearSelection={() => setSelectedIds(new Set())}
            onBatchDelete={() => setBatchDeleteOpen(true)}
          />
        )}
        {mode === 'detail' && focused && (
          <FocusedDetail
            g={focused}
            onStartEdit={() => startEdit(focused)}
            onDelete={() => setDeleting(focused)}
            onBack={backToListKeepView}
          />
        )}
        {isFormMode && draft && (
          <FormDrawer
            mode={mode}
            draft={draft}
            existingNames={data
              .filter((g) => !(mode === 'edit' && g.id === focusId))
              .map((g) => g.name)}
            onChange={setDraft}
            onCancel={cancelForm}
            onCommit={commitForm}
          />
        )}
      </Box>

      {/* Resizer */}
      <Box
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        sx={{
          flex: '0 0 8px',
          cursor: 'col-resize',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.dasGrey.grey05,
          zIndex: 3,
          '&:hover .resizer-grip, &:active .resizer-grip': {
            opacity: 1,
            bgcolor: theme.palette.dasPrimary.primary,
          },
        }}
      >
        <Box
          className="resizer-grip"
          sx={{
            width: 3,
            height: 48,
            borderRadius: 1,
            bgcolor: theme.palette.dasGrey.grey03,
            opacity: dragging ? 1 : 0.5,
            transition: 'opacity 120ms, background-color 120ms',
          }}
        />
      </Box>

      {/* MAP */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          bgcolor: theme.palette.dasGrey.grey05,
          ...(dragging && { pointerEvents: 'none' }),
        }}
      >
        <MapContainer
          bounds={TAIWAN_BOUNDS}
          style={{ height: '100%', width: '100%', cursor: isFormMode ? 'crosshair' : '' }}
          scrollWheelZoom
          attributionControl={false}
        >
          <TileLayer
            key={tileStyle}
            url={
              tileStyle === 'grayscale'
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />
          <FitToMarkers
            geofences={data}
            focusId={focusId}
            draftShape={isFormMode && draft ? draft.shape : null}
            draftCenter={isFormMode ? draft?.center ?? null : null}
            draftRadius={draft?.radius ?? 200}
            draftVertices={isFormMode && draft?.shape === '多邊形' ? draft.vertices : []}
            triggerKey={`${mode}-${focusId}-${draft?.shape ?? ''}-${draft?.center?.[0] ?? ''}-${draft?.center?.[1] ?? ''}-${draft?.vertices.length ?? 0}-${fitTrigger}`}
          />
          <MapClickCatcher
            enabled={isFormMode && draft?.shape !== '多邊形'}
            onClick={handleMapClickForForm}
          />

          {data.map((g) => {
            const tooltip = !isFormMode ? (
              <LeafletTooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <Box sx={{ px: 0.5, maxWidth: 260 }}>
                  <Typography variant="footnote" sx={{ fontWeight: 600, display: 'block' }}>
                    {g.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#5C5F61', display: 'block', lineHeight: 1.5 }}
                  >
                    {g.address}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#5C5F61' }}>
                    {g.type === '多邊形'
                      ? `${g.vertices?.length ?? 0} 個頂點`
                      : `半徑 ${g.radius}m`}
                  </Typography>
                </Box>
              </LeafletTooltip>
            ) : null;
            if (g.type === '多邊形' && g.vertices && g.vertices.length >= 3) {
              return (
                <Polygon
                  key={g.id}
                  positions={g.vertices}
                  pathOptions={circleStyle(g)}
                  eventHandlers={{ click: () => focusGeofence(g.id) }}
                >
                  {tooltip}
                </Polygon>
              );
            }
            return (
              <Circle
                key={g.id}
                center={[g.lat, g.lng]}
                radius={g.radius}
                pathOptions={circleStyle(g)}
                eventHandlers={{ click: () => focusGeofence(g.id) }}
              >
                {tooltip}
              </Circle>
            );
          })}

          {/* Draft：圓形 或 多邊形 = 當前操作中的圍籬 */}
          {isFormMode && draft?.shape === '圓形' && draft.center && (
            <>
              <Circle
                center={draft.center}
                radius={draft.radius}
                pathOptions={{
                  color: theme.palette.dasPrimary.dark01,
                  fillColor: theme.palette.dasPrimary.dark01,
                  fillOpacity: 0.35,
                  weight: 2.5,
                }}
              />
              <Marker position={draft.center} icon={focusMarkerIcon} />
              <Marker
                position={radiusHandlePosition(draft.center, draft.radius)}
                icon={radiusHandleIcon}
                draggable
                eventHandlers={{
                  drag: (e) => {
                    if (!draft.center) return;
                    const marker = e.target as L.Marker;
                    const pos = marker.getLatLng();
                    const distance = L.latLng(
                      draft.center[0],
                      draft.center[1],
                    ).distanceTo(pos);
                    const clamped = Math.max(
                      50,
                      Math.min(5000, Math.round(distance)),
                    );
                    setDraft((d) => (d ? { ...d, radius: clamped } : d));
                  },
                }}
              />
            </>
          )}
          {isFormMode && draft?.shape === '多邊形' && (
            <PolygonDrawLayer
              vertices={draft.vertices}
              onChange={(v) =>
                setDraft((d) => (d ? { ...d, vertices: v } : d))
              }
              color={theme.palette.dasPrimary.dark01}
            />
          )}
        </MapContainer>

        {/* Tile style toggle — always visible */}
        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 500,
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow: '0px 2px 6px rgba(0,0,0,0.18)',
          }}
        >
          <ToggleButtonGroup
            value={tileStyle}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (v === 'color' || v === 'grayscale') setTileStyle(v);
            }}
            sx={{
              '& .MuiToggleButton-root': {
                py: 0.5,
                px: 1.25,
                fontSize: 12,
                textTransform: 'none',
                border: 'none',
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: theme.palette.dasPrimary.primary,
                color: '#fff',
                '&:hover': { bgcolor: theme.palette.dasPrimary.dark02 },
              },
            }}
          >
            <ToggleButton value="color">彩色</ToggleButton>
            <ToggleButton value="grayscale">灰階</ToggleButton>
          </ToggleButtonGroup>
        </Paper>

        {/* "顯示全部" icon — sits above the color toggle */}
        {(mode === 'list' || (mode === 'detail' && focused)) && (
          <Tooltip title="顯示全部" placement="left">
            <IconButton
              size="small"
              onClick={() => {
                setFocusId(null);
                setFitTrigger((x) => x + 1);
                if (mode === 'detail') setMode('list');
              }}
              sx={{
                position: 'absolute',
                bottom: 64,
                right: 16,
                zIndex: 500,
                width: 36,
                height: 36,
                bgcolor: '#fff',
                color: theme.palette.dasDark.dark01,
                boxShadow: '0px 2px 6px rgba(0,0,0,0.18)',
                borderRadius: 1.5,
                '&:hover': { bgcolor: '#fff' },
              }}
            >
              <CenterFocusStrongIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* 監控 Toolbar — top-right 卡片
            隱藏於新增/編輯流程,避免中途切換 context */}
        {!isFormMode && (
          <Paper
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 500,
              borderRadius: 2,
              boxShadow: '0px 2px 8px rgba(0,0,0,0.16)',
              bgcolor: '#fff',
              overflow: 'hidden',
              minWidth: 280,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                px: 2,
                py: 1.25,
              }}
            >
              <SensorsIcon
                sx={{ fontSize: 18, color: theme.palette.dasDark.dark03 }}
              />
              <Typography
                sx={{ fontSize: 14, color: theme.palette.dasDark.dark03 }}
              >
                偵測頻率：每
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 0.75,
                  border: `1px solid ${theme.palette.dasGrey.grey04}`,
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.palette.dasDark.dark01,
                  minWidth: 24,
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {monitoringSettings.detectFrequencyMin}
              </Box>
              <Typography
                sx={{ fontSize: 14, color: theme.palette.dasDark.dark03 }}
              >
                分鐘
              </Typography>
            </Box>

            <Box sx={{ height: '1px', bgcolor: theme.palette.dasGrey.grey04 }} />

            <Box sx={{ display: 'flex' }}>
              <Button
                fullWidth
                startIcon={<TuneOutlinedIcon sx={{ fontSize: 18 }} />}
                onClick={() => setRulesDialogOpen(true)}
                sx={{
                  py: 1,
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.palette.dasPrimary.primary,
                  borderRadius: 0,
                  textTransform: 'none',
                }}
              >
                設定監控
              </Button>
              <Box sx={{ width: '1px', bgcolor: theme.palette.dasGrey.grey04 }} />
              <Button
                fullWidth
                startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
                onClick={() => setExportOpen(true)}
                sx={{
                  py: 1,
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.palette.dasPrimary.primary,
                  borderRadius: 0,
                  textTransform: 'none',
                }}
              >
                匯出事件
              </Button>
            </Box>
          </Paper>
        )}


        {isFormMode && (
          <Paper
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              px: 1,
              py: 0.25,
              zIndex: 500,
              borderRadius: 1.5,
              boxShadow: '0px 2px 4px rgba(0,0,0,0.18)',
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={showOthersInForm}
                  onChange={(e) => setShowOthersInForm(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: theme.palette.dasDark.dark01 }}>
                  顯示其他圍籬
                </Typography>
              }
              sx={{ m: 0, '& .MuiCheckbox-root': { p: 0.75 } }}
            />
          </Paper>
        )}

        {/* Bottom-center strip: shape toolbar (create mode) + hint (by shape) */}
        {isFormMode && draft && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              zIndex: 500,
            }}
          >
            {draft.shape === '圓形' && (
              <Paper
                sx={{
                  px: 2,
                  py: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(0,0,0,0.78)',
                  color: '#fff',
                  borderRadius: 2,
                  boxShadow: '0px 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#fff' }} />
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                  直接在地圖上點擊設定中心點，拖移圓形邊框可調整半徑
                </Typography>
              </Paper>
            )}

            {draft.shape === '多邊形' && (
              <Paper
                sx={{
                  pl: 2,
                  pr: 1,
                  py: 0.75,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: 'rgba(0,0,0,0.78)',
                  color: '#fff',
                  borderRadius: 2,
                  boxShadow: '0px 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#fff' }} />
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
                  已有 {draft.vertices.length} 個頂點（拖曳頂點移動位置 · 點擊右鍵刪除頂點）
                </Typography>
                <Box sx={{ width: '1px', height: 20, bgcolor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />
                <Button
                  size="small"
                  startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                  onClick={() =>
                    setDraft((d) => (d ? { ...d, vertices: [] } : d))
                  }
                  disabled={draft.vertices.length === 0}
                  sx={{
                    color: '#fff',
                    minWidth: 0,
                    '&:disabled': { color: 'rgba(255,255,255,0.35)' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  重新繪製
                </Button>
              </Paper>
            )}
          </Box>
        )}

      </Box>

      <DeleteConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            setData((prev) => prev.filter((p) => p.id !== deleting.id));
            if (focusId === deleting.id) {
              goToList();
            }
          }
          setDeleting(null);
        }}
      />

      <BatchDeleteConfirmDialog
        targets={batchDeleteOpen ? data.filter((g) => selectedIds.has(g.id)) : []}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={() => {
          const count = selectedIds.size;
          setData((prev) => prev.filter((p) => !selectedIds.has(p.id)));
          if (focusId && selectedIds.has(focusId)) goToList();
          setSelectedIds(new Set());
          setBatchDeleteOpen(false);
          setSnack(`已刪除 ${count} 個圍籬`);
        }}
      />

      <EditImpactConfirmDialog
        open={Boolean(pendingEdit?.geometryChanged)}
        onClose={() => setPendingEdit(null)}
        onConfirm={() => {
          if (pendingEdit) applyEdit(pendingEdit.updated);
          setPendingEdit(null);
        }}
      />

      <EditConfirmDialog
        open={Boolean(pendingEdit && !pendingEdit.geometryChanged)}
        onClose={() => setPendingEdit(null)}
        onConfirm={() => {
          if (pendingEdit) applyEdit(pendingEdit.updated);
          setPendingEdit(null);
        }}
      />

      <ToggleConfirmDialog
        target={toggling}
        onClose={() => setToggling(null)}
        onConfirm={confirmToggleEnabled}
      />

      <Snackbar
        open={Boolean(snack)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSnack(null)}
          sx={{ boxShadow: '0px 3px 6px rgba(0,0,0,0.2)' }}
        >
          {snack}
        </Alert>
      </Snackbar>

      <GlobalMonitoringSettingsDialog
        open={rulesDialogOpen}
        onClose={() => setRulesDialogOpen(false)}
        state={monitoringSettings}
        onChange={setMonitoringSettings}
      />


      <ExportRecordsDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onConfirm={(label, count) => {
          setExportOpen(false);
          setSnack(`已匯出 ${label} ${count} 筆事件紀錄`);
        }}
      />
    </Box>
  );
}

const EXPORT_ROW_LIMIT = 10000;

function ExportRecordsDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (rangeLabel: string, count: number) => void;
}) {
  const theme = useTheme();
  type Preset = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';
  const TODAY = '2026-04-23';
  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState('2026-04-17');
  const [customTo, setCustomTo] = useState(TODAY);
  const [geofenceFilter, setGeofenceFilter] = useState<Geofence | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<'over_limit' | null>(null);

  useEffect(() => {
    if (open) {
      setPreset('today');
      setCustomFrom('2026-04-17');
      setCustomTo(TODAY);
      setGeofenceFilter(null);
      setVehicleFilter(null);
      setIsExporting(false);
      setExportError(null);
    }
  }, [open]);

  const dateRange = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const todayEnd = new Date(`${TODAY}T23:59:59`).getTime();
    function dateStr(ts: number) {
      const d = new Date(ts);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    if (preset === 'today') return { from: TODAY, to: TODAY };
    if (preset === 'yesterday') {
      const y = dateStr(todayEnd - dayMs);
      return { from: y, to: y };
    }
    if (preset === 'last7')
      return { from: dateStr(todayEnd - 6 * dayMs), to: TODAY };
    if (preset === 'last30')
      return { from: dateStr(todayEnd - 29 * dayMs), to: TODAY };
    return { from: customFrom, to: customTo };
  }, [preset, customFrom, customTo]);

  const rangeLabel =
    preset === 'today'
      ? '今天'
      : preset === 'yesterday'
        ? '昨天'
        : preset === 'last7'
          ? '近 7 天'
          : preset === 'last30'
            ? '近 30 天'
            : `${dateRange.from} ~ ${dateRange.to}`;

  const vehicleOptions = useMemo(() => {
    const set = new Set<string>();
    mockEvents.forEach((e) => set.add(e.vehicle));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    const from = `${dateRange.from} 00:00`;
    const to = `${dateRange.to} 23:59`;
    return mockEvents.filter((e) => {
      if (e.type !== '進入' && e.type !== '離開') return false;
      if (e.time < from || e.time > to) return false;
      if (geofenceFilter && e.geofenceId !== geofenceFilter.id) return false;
      if (vehicleFilter && e.vehicle !== vehicleFilter) return false;
      return true;
    });
  }, [dateRange, geofenceFilter, vehicleFilter]);

  // 條件變動時清掉先前點擊匯出後的錯誤提示
  useEffect(() => {
    setExportError(null);
  }, [dateRange, geofenceFilter, vehicleFilter]);

  // preset === 'last30' 作為情境範例，demo「超過下載上限」的警示狀態
  const simulatedOverLimit = preset === 'last30';
  const customInvalid =
    preset === 'custom' &&
    (!customFrom || !customTo || customFrom > customTo);
  const disabled = customInvalid || isExporting;

  function handleExport() {
    if (filtered.length > EXPORT_ROW_LIMIT || simulatedOverLimit) {
      setExportError('over_limit');
      return;
    }
    setExportError(null);
    setIsExporting(true);
    window.setTimeout(() => {
      onConfirm(rangeLabel, filtered.length);
    }, 1500);
  }

  return (
    <>
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5Bold">匯出事件</Typography>
      </DialogTitle>
      <DialogContent dividers>
        {/* 日期範圍(必填) */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="headline"
            sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
          >
            日期範圍 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={preset}
            onChange={(_, v) => {
              if (v) setPreset(v as Preset);
            }}
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                py: 0.5,
                px: 1.5,
                fontSize: 13,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: theme.palette.dasPrimary.lite03,
                color: theme.palette.dasPrimary.dark01,
                borderColor: theme.palette.dasPrimary.primary,
                '&:hover': { bgcolor: theme.palette.dasPrimary.lite02 },
              },
            }}
          >
            <ToggleButton value="today">今天</ToggleButton>
            <ToggleButton value="yesterday">昨天</ToggleButton>
            <ToggleButton value="last7">近 7 天</ToggleButton>
            <ToggleButton value="last30">近 30 天</ToggleButton>
            <ToggleButton value="custom">自訂</ToggleButton>
          </ToggleButtonGroup>
          {preset === 'custom' && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                type="date"
                label="開始日期"
                InputLabelProps={{ shrink: true }}
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
                至
              </Typography>
              <TextField
                size="small"
                type="date"
                label="結束日期"
                InputLabelProps={{ shrink: true }}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </Box>
          )}
        </Box>

        {/* 篩選 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="headline"
              sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
            >
              圍籬
            </Typography>
            <Autocomplete
              size="small"
              value={geofenceFilter}
              onChange={(_, v) => setGeofenceFilter(v)}
              options={mockGeofences}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} placeholder="全部" />
              )}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="headline"
              sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
            >
              車輛
            </Typography>
            <Autocomplete
              size="small"
              value={vehicleFilter}
              onChange={(_, v) => setVehicleFilter(v)}
              options={vehicleOptions}
              renderInput={(params) => (
                <TextField {...params} placeholder="全部" />
              )}
            />
          </Box>
        </Box>

        {/* 提醒 callout */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 0.75,
            px: 1.25,
            py: 0.75,
            borderRadius: 1,
            bgcolor: theme.palette.dasPrimary.lite03,
            border: `1px solid ${theme.palette.dasPrimary.lite04}`,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 16,
              color: theme.palette.dasPrimary.dark01,
              mt: '2px',
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontSize: 12,
              color: theme.palette.dasPrimary.dark01,
              lineHeight: 1.5,
            }}
          >
            提醒：若匯出的時間範圍較長，可能因筆數較多而導致等待時間延長與匯出失敗。
          </Typography>
        </Box>

      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="secondary" disabled={isExporting}>
          取消
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          color="primary"
          disabled={disabled}
          startIcon={
            isExporting ? (
              <CircularProgress size={14} sx={{ color: '#fff' }} />
            ) : undefined
          }
        >
          {isExporting ? '匯出中⋯' : '匯出'}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={exportError === 'over_limit'}
      onClose={() => setExportError(null)}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5Bold">無法匯出</Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          筆數已達上限（{EXPORT_ROW_LIMIT.toLocaleString()} 筆），建議縮小範圍。
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={() => setExportError(null)}
          variant="contained"
          color="primary"
        >
          知道了
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

function BrowseList({
  geofences,
  matchedIds,
  search,
  onSearchChange,
  onFocus,
  onCreate,
  onBatchImport,
  selectedIds,
  onToggleRow,
  onToggleAllVisible,
  onClearSelection,
  onBatchDelete,
}: {
  geofences: Geofence[];
  matchedIds: Set<string> | null;
  search: string;
  onSearchChange: (v: string) => void;
  onFocus: (id: string) => void;
  onCreate: () => void;
  onBatchImport: () => void;
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAllVisible: (visible: Geofence[]) => void;
  onClearSelection: () => void;
  onBatchDelete: () => void;
}) {
  const theme = useTheme();
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const visible = matchedIds
    ? geofences.filter((g) => matchedIds.has(g.id))
    : geofences;
  const visibleSelectedCount = visible.filter((g) => selectedIds.has(g.id)).length;
  const visibleAllSelected =
    visible.length > 0 && visibleSelectedCount === visible.length;
  const visibleSomeSelected =
    visibleSelectedCount > 0 && !visibleAllSelected;
  const selectionCount = selectedIds.size;

  return (
    <>
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5Bold" sx={{ mb: 0.25, display: 'block' }}>
              電子圍籬
            </Typography>
            <Typography
              variant="footnote"
              sx={{ color: theme.palette.dasGrey.grey01, display: 'block', lineHeight: 1.5 }}
            >
              管理車輛進出的監控範圍
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="small"
            endIcon={<ArrowDropDownIcon />}
            onClick={(e) => setAddMenuAnchor(e.currentTarget)}
            sx={{ flexShrink: 0, fontSize: 14, fontWeight: 600 }}
          >
            新增
          </Button>
          <Menu
            anchorEl={addMenuAnchor}
            open={Boolean(addMenuAnchor)}
            onClose={() => setAddMenuAnchor(null)}
            PaperProps={{ sx: { minWidth: 200, mt: 1 } }}
          >
            <MenuItem
              onClick={() => {
                setAddMenuAnchor(null);
                onCreate();
              }}
            >
              <Typography variant="body1">新增單筆</Typography>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAddMenuAnchor(null);
                onBatchImport();
              }}
            >
              <Typography variant="body1">批次匯入</Typography>
            </MenuItem>
          </Menu>
        </Box>
        <TextField
          placeholder="搜尋名稱 / 地址"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.dasGrey.grey02 }} />
              </InputAdornment>
            ),
          }}
        />
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            minHeight: 32,
          }}
        >
          <Checkbox
            size="small"
            checked={visibleAllSelected}
            indeterminate={visibleSomeSelected}
            onChange={() => onToggleAllVisible(visible)}
            disabled={visible.length === 0}
            sx={{ p: 0.5 }}
          />
          {selectionCount > 0 ? (
            <>
              <Typography
                variant="footnote"
                sx={{ color: theme.palette.dasDark.dark01, fontWeight: 500 }}
              >
                已選 {selectionCount} 項
              </Typography>
              <Button
                size="small"
                onClick={onClearSelection}
                sx={{
                  color: theme.palette.dasGrey.grey01,
                  minWidth: 0,
                  px: 0.5,
                  fontSize: 12,
                }}
              >
                取消
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="text"
                onClick={onBatchDelete}
                startIcon={
                  <DeleteOutlineIcon sx={{ color: theme.palette.dasRed.main }} />
                }
                sx={{
                  minWidth: 0,
                  px: 1,
                  color: theme.palette.dasDark.dark01,
                  fontWeight: 500,
                }}
              >
                刪除
              </Button>
            </>
          ) : (
            <Typography
              variant="footnote"
              sx={{ color: theme.palette.dasGrey.grey01 }}
            >
              {search ? `符合 ${visible.length} 筆` : `共 ${geofences.length} 筆`}
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {visible.slice(0, 50).map((g) => {
          const isChecked = selectedIds.has(g.id);
          return (
          <Box
            key={g.id}
            onClick={() => onFocus(g.id)}
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
              cursor: 'pointer',
              bgcolor: isChecked ? theme.palette.dasPrimary.lite03 : 'transparent',
              '&:hover': { bgcolor: theme.palette.dasPrimary.lite03 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Checkbox
                size="small"
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleRow(g.id)}
                sx={{ p: 0.5, mt: -0.5, ml: -0.5 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {g.name}
                </Typography>
                {(() => {
                  const addressList =
                    g.type === '多邊形' && g.vertices && g.vertices.length > 0
                      ? g.vertices.map((v) => guessAddress(v[0], v[1]))
                      : [g.address];
                  const hasMultiple = addressList.length > 1;
                  const displayText = addressList.join(', ');
                  return (
                    <Tooltip
                      title={
                        hasMultiple ? (
                          <Box sx={{ py: 0.25 }}>
                            {addressList.map((a, idx) => (
                              <Typography
                                key={idx}
                                sx={{ fontSize: 12, lineHeight: 1.6, display: 'block' }}
                              >
                                {idx + 1}. {a}
                              </Typography>
                            ))}
                          </Box>
                        ) : (
                          ''
                        )
                      }
                      placement="top"
                      arrow
                      disableHoverListener={!hasMultiple}
                      disableFocusListener={!hasMultiple}
                      disableTouchListener={!hasMultiple}
                    >
                      <Typography
                        variant="footnote"
                        sx={{
                          display: 'block',
                          color: theme.palette.dasGrey.grey01,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayText}
                      </Typography>
                    </Tooltip>
                  );
                })()}
                <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
                  <Chip
                    label={
                      g.type === '多邊形'
                        ? `${g.vertices?.length ?? 0} 個頂點`
                        : `半徑 ${g.radius}m`
                    }
                    size="small"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                </Stack>
              </Box>
            </Box>
          </Box>
          );
        })}
        {visible.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: theme.palette.dasGrey.grey01 }}>
              沒有符合的圍籬
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
}

function FocusedDetail({
  g,
  onStartEdit,
  onDelete,
  onBack,
}: {
  g: Geofence;
  onStartEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const theme = useTheme();

  return (
    <>
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <IconButton size="small" onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5Bold" sx={{ display: 'block' }}>
            {g.name}
          </Typography>
          <Typography variant="footnote" sx={{ color: theme.palette.dasGrey.grey01 }}>
            {g.type}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.5, flex: 1, overflow: 'auto' }}>
        {g.type === '多邊形' ? (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="footnote"
              sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.5 }}
            >
              頂點地址（{g.vertices?.length ?? 0} 個）
            </Typography>
            {g.vertices && g.vertices.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {g.vertices.map((v, i) => (
                  <Box
                    key={i}
                    sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.dasGrey.grey01,
                        minWidth: 20,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}.
                    </Typography>
                    <Typography variant="body1">
                      {guessAddress(v[0], v[1])}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body1">—</Typography>
            )}
          </Box>
        ) : (
          <>
            <Field
              label="中心點地址"
              value={g.address}
              secondary={`${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`}
            />
            <Field label="半徑" value={`${g.radius}m`} />
          </>
        )}
        <Field label="備註" value={g.note || '—'} />
        <Field label="建立日期" value={g.createdAt} />
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button onClick={onDelete} color="error">
          刪除
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onStartEdit} variant="contained" color="primary">
          編輯
        </Button>
      </Box>
    </>
  );
}

function FormDrawer({
  mode,
  draft,
  existingNames,
  onChange,
  onCancel,
  onCommit,
}: {
  mode: 'edit' | 'create';
  draft: Draft;
  existingNames: string[];
  onChange: (d: Draft) => void;
  onCancel: () => void;
  onCommit: () => void;
}) {
  const theme = useTheme();
  const [nameErrorShown, setNameErrorShown] = useState<string | null>(null);
  const [vertexInputs, setVertexInputs] = useState<string[]>(['']);
  const [editingVertexIndex, setEditingVertexIndex] = useState<number | null>(null);
  const [editingVertexText, setEditingVertexText] = useState<string>('');
  const [userTouchedInput, setUserTouchedInput] = useState(false);
  const prevVertexCountRef = useRef(draft.vertices.length);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (
      editingVertexIndex !== null &&
      editingVertexIndex >= draft.vertices.length
    ) {
      setEditingVertexIndex(null);
      setEditingVertexText('');
    }
  }, [draft.vertices.length, editingVertexIndex]);

  // 使用者還沒碰過輸入欄位時，若直接在地圖上點擊加入第一個頂點，
  // 就清掉預設那個空輸入列（避免畫面多出一個沒人要用的輸入框）。
  useEffect(() => {
    const prev = prevVertexCountRef.current;
    const cur = draft.vertices.length;
    if (
      prev === 0 &&
      cur === 1 &&
      !userTouchedInput &&
      vertexInputs.length === 1 &&
      vertexInputs[0] === ''
    ) {
      setVertexInputs([]);
    }
    prevVertexCountRef.current = cur;
  }, [draft.vertices.length, userTouchedInput, vertexInputs]);

  // 已確認頂點 + 輸入列全被清空時，至少保留一個空輸入列，
  // 讓使用者能繼續操作。
  useEffect(() => {
    if (
      draft.shape === '多邊形' &&
      draft.vertices.length === 0 &&
      vertexInputs.length === 0
    ) {
      setVertexInputs(['']);
    }
  }, [draft.shape, draft.vertices.length, vertexInputs.length]);

  // 真實 geocoder 失敗時會回最相近結果；prototype 用 char-code hash 模擬「一律成功」。
  function geocodeToCoord(
    addr: string,
    anchor: [number, number] | null,
  ): [number, number] | null {
    const trimmed = addr.trim();
    if (!trimmed) return null;
    const coordMatch = trimmed.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (isFinite(lat) && isFinite(lng)) return [lat, lng];
    }
    const codeSum = Array.from(trimmed).reduce((s, c) => s + c.charCodeAt(0), 0);
    if (anchor) {
      // 有 anchor（上一個頂點）→ 於其周圍 ±0.008° 取點，頂點自然成群
      const offsetLat = ((codeSum % 160) - 80) / 10000;
      const offsetLng = ((codeSum % 140) - 70) / 10000;
      return [anchor[0] + offsetLat, anchor[1] + offsetLng];
    }
    return [22.9 + ((codeSum % 250) / 100), 120.1 + ((codeSum % 180) / 100)];
  }

  function geocodeAddress() {
    const coord = geocodeToCoord(draft.address, null);
    if (!coord) return;
    onChange({ ...draft, center: coord });
  }

  function updateVertexInput(i: number, text: string) {
    setUserTouchedInput(true);
    setVertexInputs((rows) => rows.map((r, idx) => (idx === i ? text : r)));
  }

  function submitVertexInput(i: number) {
    const text = (vertexInputs[i] ?? '').trim();
    if (!text) return;
    setUserTouchedInput(true);
    const anchor =
      draft.vertices.length > 0
        ? draft.vertices[draft.vertices.length - 1]
        : null;
    const coord = geocodeToCoord(text, anchor);
    if (!coord) return;
    onChange({ ...draft, vertices: [...draft.vertices, coord] });
    setVertexInputs((rows) => {
      const next = rows.filter((_, idx) => idx !== i);
      return next.length === 0 ? [''] : next;
    });
  }

  function addVertexInput() {
    setUserTouchedInput(true);
    setVertexInputs((rows) => [...rows, '']);
  }

  function deleteVertexInput(i: number) {
    setUserTouchedInput(true);
    setVertexInputs((rows) => {
      const next = rows.filter((_, idx) => idx !== i);
      return next.length === 0 ? [''] : next;
    });
  }

  function removeVertex(index: number) {
    onChange({
      ...draft,
      vertices: draft.vertices.filter((_, i) => i !== index),
    });
  }

  function startEditVertex(index: number) {
    const v = draft.vertices[index];
    if (!v) return;
    setEditingVertexIndex(index);
    setEditingVertexText(guessAddress(v[0], v[1]));
  }

  function confirmEditVertex() {
    if (editingVertexIndex === null) return;
    const text = editingVertexText.trim();
    if (!text) return;
    const oldCoord = draft.vertices[editingVertexIndex];
    const coord = geocodeToCoord(text, oldCoord ?? null);
    if (!coord) return;
    onChange({
      ...draft,
      vertices: draft.vertices.map((v, i) =>
        i === editingVertexIndex ? coord : v,
      ),
    });
    setEditingVertexIndex(null);
    setEditingVertexText('');
  }

  function cancelEditVertex() {
    setEditingVertexIndex(null);
    setEditingVertexText('');
  }

  function handleVertexDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleVertexDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleVertexDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...draft.vertices];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange({ ...draft, vertices: next });
    setDragIndex(null);
  }

  function handleVertexDragEnd() {
    setDragIndex(null);
  }

  function handleCommit() {
    const trimmed = draft.name.trim();
    if (!trimmed) {
      setNameErrorShown('請輸入圍籬名稱');
      return;
    }
    if (existingNames.includes(trimmed)) {
      setNameErrorShown('此名稱已存在，請換一個');
      return;
    }
    if (draft.shape === '圓形' && !draft.center) return;
    if (draft.shape === '多邊形' && draft.vertices.length < 3) return;
    setNameErrorShown(null);
    onCommit();
  }

  return (
    <>
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <IconButton size="small" onClick={onCancel}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5Bold" sx={{ display: 'block' }}>
            {mode === 'create' ? '新增圍籬' : '編輯圍籬'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.5, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Typography
            variant="headline"
            sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
          >
            圍籬名稱 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={draft.name}
            onChange={(e) => {
              onChange({ ...draft, name: e.target.value });
              if (nameErrorShown) setNameErrorShown(null);
            }}
            error={Boolean(nameErrorShown)}
            helperText={nameErrorShown ?? undefined}
          />
        </Box>

        <Box>
          <Typography
            variant="headline"
            sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
          >
            類型 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
          </Typography>
          {mode === 'edit' ? (
            <Box
              sx={{
                px: 1.5,
                minHeight: 40,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 1,
                border: `1px solid ${theme.palette.dasGrey.grey04}`,
                bgcolor: theme.palette.dasGrey.grey06,
                color: theme.palette.dasGrey.grey01,
              }}
            >
              <Typography variant="body1">{draft.shape}</Typography>
            </Box>
          ) : (
          <ToggleButtonGroup
            value={draft.shape}
            exclusive
            size="small"
            fullWidth
            onChange={(_, v) => {
              if (v === '圓形' || v === '多邊形') onChange({ ...draft, shape: v });
            }}
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                py: 1.25,
                px: 1.25,
                alignItems: 'flex-start',
                textAlign: 'left',
              },
              '& .MuiToggleButton-root.Mui-selected': {
                bgcolor: theme.palette.dasPrimary.lite03,
                color: theme.palette.dasPrimary.dark01,
                borderColor: theme.palette.dasPrimary.primary,
                '&:hover': {
                  bgcolor: theme.palette.dasPrimary.lite02,
                },
              },
            }}
          >
            <ToggleButton value="圓形">
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  圓形
                </Typography>
                <Typography
                  variant="footnote"
                  sx={{
                    color: 'inherit',
                    opacity: 0.75,
                    mt: 0.25,
                    lineHeight: 1.4,
                    textTransform: 'none',
                  }}
                >
                  適合倉儲、集散點等定點型地點
                </Typography>
              </Box>
            </ToggleButton>
            <ToggleButton value="多邊形">
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  多邊形
                </Typography>
                <Typography
                  variant="footnote"
                  sx={{
                    color: 'inherit',
                    opacity: 0.75,
                    mt: 0.25,
                    lineHeight: 1.4,
                    textTransform: 'none',
                  }}
                >
                  適合廠區、碼頭等不規則範圍
                </Typography>
              </Box>
            </ToggleButton>
          </ToggleButtonGroup>
          )}
        </Box>

        {draft.shape === '圓形' && (
          <Box>
            <Typography
              variant="headline"
              sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
            >
              中心點地址 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                px: 1.25,
                py: 0.75,
                mb: 1,
                borderRadius: 1,
                bgcolor: theme.palette.dasPrimary.lite03,
                border: `1px solid ${theme.palette.dasPrimary.lite04}`,
              }}
            >
              <InfoOutlinedIcon
                sx={{
                  fontSize: 16,
                  color: theme.palette.dasPrimary.dark01,
                  mt: '2px',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: 12,
                  color: theme.palette.dasPrimary.dark01,
                  lineHeight: 1.5,
                }}
              >
                輸入地址後按 Enter 自動定位，或直接在地圖上點擊設定中心點
              </Typography>
            </Box>
            <TextField
              fullWidth
              size="small"
              value={draft.address}
              placeholder="輸入地址或經緯度"
              onChange={(e) => onChange({ ...draft, address: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') geocodeAddress();
              }}
              onBlur={geocodeAddress}
            />
          </Box>
        )}

        {draft.shape === '圓形' ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
              <Typography variant="headline" sx={{ color: theme.palette.dasGrey.grey01 }}>
                半徑 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
              </Typography>
              <Box sx={{ flex: 1 }} />
              <TextField
                size="small"
                type="number"
                value={draft.radius}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isFinite(n)) return;
                  onChange({ ...draft, radius: Math.max(50, Math.min(5000, n)) });
                }}
                inputProps={{ min: 50, max: 5000, step: 10, style: { textAlign: 'right' } }}
                sx={{ width: 90 }}
              />
              <Typography variant="body1" sx={{ ml: 0.75, color: theme.palette.dasGrey.grey01 }}>
                m
              </Typography>
            </Box>
            <Slider
              value={draft.radius}
              min={50}
              max={5000}
              step={50}
              onChange={(_, v) => onChange({ ...draft, radius: v as number })}
              marks={[
                { value: 50, label: '50m' },
                { value: 1000, label: '1km' },
                { value: 5000, label: '5km' },
              ]}
              sx={{
                color: theme.palette.dasPrimary.primary,
                '& .MuiSlider-markLabel': { fontSize: 12 },
                '& .MuiSlider-markLabel[data-index="0"]': { transform: 'translateX(0)' },
                '& .MuiSlider-markLabel[data-index="2"]': { transform: 'translateX(-100%)' },
              }}
            />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
              <Typography variant="headline" sx={{ color: theme.palette.dasGrey.grey01 }}>
                頂點地址 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
              </Typography>
              <Typography
                variant="footnote"
                sx={{ color: theme.palette.dasGrey.grey01 }}
              >
                至少 3 個
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.75,
                px: 1.25,
                py: 0.75,
                mt: 1,
                mb: 1.5,
                borderRadius: 1,
                bgcolor: theme.palette.dasPrimary.lite03,
                border: `1px solid ${theme.palette.dasPrimary.lite04}`,
              }}
            >
              <InfoOutlinedIcon
                sx={{
                  fontSize: 16,
                  color: theme.palette.dasPrimary.dark01,
                  mt: '2px',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: 12,
                  color: theme.palette.dasPrimary.dark01,
                  lineHeight: 1.5,
                }}
              >
                依序輸入頂點地址，按下加入後地圖會自動定位該頂點，並連成多邊形邊界。也可直接於地圖上點擊加入。
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {draft.vertices.map((v, i) =>
                editingVertexIndex === i ? (
                  <Box
                    key={`edit-${i}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Box sx={{ width: 18, flexShrink: 0 }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.dasGrey.grey01,
                        minWidth: 20,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}.
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      autoFocus
                      value={editingVertexText}
                      onChange={(e) => setEditingVertexText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingVertexText.trim()) {
                          e.preventDefault();
                          confirmEditVertex();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEditVertex();
                        }
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={confirmEditVertex}
                      disabled={!editingVertexText.trim()}
                      aria-label="套用編輯"
                      sx={{ color: theme.palette.dasPrimary.primary }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={cancelEditVertex}
                      aria-label="取消編輯"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box
                    key={`committed-${i}`}
                    draggable={editingVertexIndex === null}
                    onDragStart={(e) => handleVertexDragStart(e, i)}
                    onDragOver={handleVertexDragOver}
                    onDrop={(e) => handleVertexDrop(e, i)}
                    onDragEnd={handleVertexDragEnd}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      py: 0.5,
                      opacity: dragIndex === i ? 0.4 : 1,
                      transition: 'opacity 120ms',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: theme.palette.dasGrey.grey02,
                        cursor: editingVertexIndex === null ? 'grab' : 'default',
                        '&:active': {
                          cursor: editingVertexIndex === null ? 'grabbing' : 'default',
                        },
                        flexShrink: 0,
                      }}
                      aria-label="拖曳調整順序"
                    >
                      <DragIndicatorIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.dasGrey.grey01,
                        minWidth: 20,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}.
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: theme.palette.dasDark.dark01,
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={guessAddress(v[0], v[1])}
                    >
                      {guessAddress(v[0], v[1])}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => startEditVertex(i)}
                      aria-label={`編輯頂點 ${i + 1}`}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => removeVertex(i)}
                      aria-label={`刪除頂點 ${i + 1}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ),
              )}

              {vertexInputs.map((text, i) => (
                <Box
                  key={`input-${i}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Box sx={{ width: 18, flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.dasGrey.grey01,
                      minWidth: 20,
                      flexShrink: 0,
                    }}
                  >
                    {draft.vertices.length + i + 1}.
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    value={text}
                    placeholder="輸入地址或經緯度"
                    onChange={(e) => updateVertexInput(i, e.target.value)}
                  />
                  <IconButton
                    size="small"
                    onClick={() => submitVertexInput(i)}
                    disabled={!text.trim()}
                    aria-label="加入頂點"
                    sx={{ color: theme.palette.dasPrimary.primary }}
                  >
                    <AddLocationAltOutlinedIcon fontSize="small" />
                  </IconButton>
                  {draft.vertices.length + vertexInputs.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => deleteVertexInput(i)}
                      aria-label={`刪除輸入列 ${i + 1}`}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            <Button
              size="small"
              variant="text"
              startIcon={<AddIcon />}
              onClick={addVertexInput}
              sx={{
                alignSelf: 'flex-start',
                mt: 1.25,
                color: theme.palette.dasPrimary.primary,
                textTransform: 'none',
              }}
            >
              新增
            </Button>
          </Box>
        )}

        <Box>
          <Typography
            variant="headline"
            sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
          >
            備註
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            value={draft.note}
            onChange={(e) => onChange({ ...draft, note: e.target.value })}
          />
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button onClick={onCancel} fullWidth color="secondary">
          取消
        </Button>
        <Button
          onClick={handleCommit}
          disabled={
            draft.shape === '圓形'
              ? !draft.center
              : draft.vertices.length < 3
          }
          fullWidth
          variant="contained"
          color="primary"
        >
          {mode === 'create' ? '儲存' : '更新'}
        </Button>
      </Box>
    </>
  );
}

function Field({
  label,
  value,
  secondary,
}: {
  label: string;
  value: string;
  secondary?: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="footnote"
        sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.25 }}
      >
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
      {secondary && (
        <Typography
          variant="footnote"
          sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mt: 0.25 }}
        >
          {secondary}
        </Typography>
      )}
    </Box>
  );
}

