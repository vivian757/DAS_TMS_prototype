import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
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
  useMap,
  Tooltip as LeafletTooltip,
} from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { mockGeofences, Geofence, mockOrdersForGeofence } from '../data/mockGeofences';
import {
  GeofenceFormDialog,
  DeleteConfirmDialog,
  BatchDeleteConfirmDialog,
} from '../components/GeofenceDialogs';
import GeofenceOrdersButton from '../components/GeofenceOrdersButton';
import BatchImportDialog from '../components/BatchImportDialog';
import GlobalMonitoringSettingsDialog, {
  DEFAULT_MONITORING_SETTINGS,
  MonitoringSettingsState,
} from '../components/GlobalMonitoringSettingsDialog';
import {
  mockEvents,
  GeofenceEvent,
  EventType,
  EventSeverity,
  isToday,
  isThisWeek,
} from '../data/mockEvents';

const PAGE_SIZE = 20;
const TAIWAN_BOUNDS: L.LatLngBoundsLiteral = [
  [21.9, 119.8],
  [25.5, 122.2],
];

type GeofenceSortKey = 'name' | 'address' | 'size' | 'createdAt' | 'orders';
type EventSortKey = 'time' | 'type' | 'severity' | 'geofence' | 'vehicle';
type SortDir = 'asc' | 'desc';

function FitMapToData({
  data,
  focusId,
  triggerKey,
}: {
  data: Geofence[];
  focusId: string | null;
  triggerKey: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (focusId) {
      const g = data.find((x) => x.id === focusId);
      if (g) {
        if (g.type === '多邊形' && g.vertices && g.vertices.length >= 3) {
          const bounds = L.latLngBounds(
            g.vertices.map(([la, ln]) => L.latLng(la, ln)),
          ).pad(0.4);
          map.flyToBounds(bounds, { maxZoom: 15, duration: 0.5 });
        } else {
          const bounds = L.latLng(g.lat, g.lng).toBounds((g.radius || 300) * 4);
          map.flyToBounds(bounds, { maxZoom: 15, duration: 0.5 });
        }
        return;
      }
    }
    if (data.length === 0) {
      map.fitBounds(TAIWAN_BOUNDS);
      return;
    }
    const bounds = new LatLngBounds(data.map((g) => [g.lat, g.lng]));
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 12, duration: 0.4 });
  }, [focusId, triggerKey, map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function sizeRank(g: Geofence): number {
  if (g.type === '圓形') return Math.PI * g.radius * g.radius;
  if (g.vertices && g.vertices.length >= 3) {
    const lats = g.vertices.map((v) => v[0]);
    const lngs = g.vertices.map((v) => v[1]);
    const latSpanM = (Math.max(...lats) - Math.min(...lats)) * 111000;
    const lngSpanM = (Math.max(...lngs) - Math.min(...lngs)) * 101000;
    return latSpanM * lngSpanM;
  }
  return 0;
}

export default function PrototypeB() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [data, setData] = useState<Geofence[]>(mockGeofences);
  const [events, setEvents] = useState<GeofenceEvent[]>(mockEvents);
  const [snack, setSnack] = useState<string | null>(null);
  const [monitoringSettings, setMonitoringSettings] =
    useState<MonitoringSettingsState>(DEFAULT_MONITORING_SETTINGS);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);

  // Geofence list state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [geofenceSortKey, setGeofenceSortKey] = useState<GeofenceSortKey>('createdAt');
  const [geofenceSortDir, setGeofenceSortDir] = useState<SortDir>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [editing, setEditing] = useState<Geofence | null>(null);
  const [deleting, setDeleting] = useState<Geofence | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [rowMoreAnchor, setRowMoreAnchor] = useState<{ el: HTMLElement; g: Geofence } | null>(null);
  const [viewing, setViewing] = useState<Geofence | null>(null);
  const [mapOverviewOpen, setMapOverviewOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [tileStyle, setTileStyle] = useState<'color' | 'grayscale'>('color');

  // Event tab state
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | EventType>('all');
  const [eventSeverityFilter, setEventSeverityFilter] = useState<'all' | EventSeverity>('all');
  const [eventTimeFilter, setEventTimeFilter] = useState<'all' | 'today' | 'week'>('all');
  const [eventFenceSearch, setEventFenceSearch] = useState('');
  const [eventSortKey, setEventSortKey] = useState<EventSortKey>('time');
  const [eventSortDir, setEventSortDir] = useState<SortDir>('desc');
  const [eventPage, setEventPage] = useState(1);

  // ─── Geofence list derived ─────────────────────────────────────
  const searchedGeofences = useMemo(() => {
    const k = searchKeyword.trim();
    if (!k) return data;
    return data.filter((g) => g.name.includes(k) || g.address.includes(k));
  }, [data, searchKeyword]);

  const sortedGeofences = useMemo(() => {
    const arr = [...searchedGeofences];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (geofenceSortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'zh-Hant');
          break;
        case 'address':
          cmp = a.address.localeCompare(b.address, 'zh-Hant');
          break;
        case 'size':
          cmp = sizeRank(a) - sizeRank(b);
          break;
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case 'orders':
          cmp = a.usingOrderCount - b.usingOrderCount;
          break;
      }
      return geofenceSortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [searchedGeofences, geofenceSortKey, geofenceSortDir]);

  const geofencePageCount = Math.max(1, Math.ceil(sortedGeofences.length / PAGE_SIZE));
  const geofencePageData = sortedGeofences.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleGeofenceSort(key: GeofenceSortKey) {
    if (geofenceSortKey === key) {
      setGeofenceSortDir(geofenceSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setGeofenceSortKey(key);
      setGeofenceSortDir('asc');
    }
  }

  // ─── Events derived ────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (eventTypeFilter !== 'all' && e.type !== eventTypeFilter) return false;
      if (eventSeverityFilter !== 'all' && e.severity !== eventSeverityFilter) return false;
      if (eventTimeFilter === 'today' && !isToday(e)) return false;
      if (eventTimeFilter === 'week' && !isThisWeek(e)) return false;
      if (
        eventFenceSearch.trim() &&
        !e.geofenceName.includes(eventFenceSearch.trim()) &&
        !e.vehicle.includes(eventFenceSearch.trim()) &&
        !(e.orderId?.includes(eventFenceSearch.trim()) ?? false)
      )
        return false;
      return true;
    });
  }, [events, eventTypeFilter, eventSeverityFilter, eventTimeFilter, eventFenceSearch]);

  const sortedEvents = useMemo(() => {
    const severityRank: Record<EventSeverity, number> = { info: 0, warning: 1, alert: 2 };
    const arr = [...filteredEvents];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (eventSortKey) {
        case 'time':
          cmp = a.timestamp - b.timestamp;
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
        case 'severity':
          cmp = severityRank[a.severity] - severityRank[b.severity];
          break;
        case 'geofence':
          cmp = a.geofenceName.localeCompare(b.geofenceName, 'zh-Hant');
          break;
        case 'vehicle':
          cmp = a.vehicle.localeCompare(b.vehicle);
          break;
      }
      return eventSortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filteredEvents, eventSortKey, eventSortDir]);

  const eventPageCount = Math.max(1, Math.ceil(sortedEvents.length / PAGE_SIZE));
  const eventPageData = sortedEvents.slice((eventPage - 1) * PAGE_SIZE, eventPage * PAGE_SIZE);

  function toggleEventSort(key: EventSortKey) {
    if (eventSortKey === key) {
      setEventSortDir(eventSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setEventSortKey(key);
      setEventSortDir('asc');
    }
  }

  const newAlertCount = events.filter(
    (e) => e.severity === 'alert' && e.status === 'new',
  ).length;

  const focused = data.find((g) => g.id === focusId) ?? null;

  // 地圖點擊圍籬後，表格要自動翻到對應頁並 scroll 到該列
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  function focusAndScroll(id: string | null) {
    setFocusId(id);
    if (id === null) return;
    const idx = sortedGeofences.findIndex((g) => g.id === id);
    if (idx === -1) return;
    const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
    if (targetPage !== page) setPage(targetPage);
    setTimeout(() => {
      rowRefs.current.get(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
  }
  function registerRowRef(id: string, el: HTMLTableRowElement | null) {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 4, pt: 3, pb: 1, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography variant="h3" sx={{ mb: 0.5 }}>
            電子圍籬
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01, maxWidth: 760 }}>
            管理車輛進出的監控範圍
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setRulesDialogOpen(true)}
          >
            監控設定
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setBatchImportOpen(true)}
          >
            批次匯入
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setCreateOpen(true)}
          >
            新增圍籬
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ px: 4, borderBottom: `1px solid ${theme.palette.dasGrey.grey04}` }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontSize: 14,
              fontWeight: 500,
            },
          }}
        >
          <Tab label="圍籬總覽" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                事件歷程
                {newAlertCount > 0 && (
                  <Chip
                    label={newAlertCount}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 600,
                      bgcolor: theme.palette.dasRed.main,
                      color: '#fff',
                    }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 0 && (
          <GeofenceListTab
            data={data}
            searchedGeofences={searchedGeofences}
            pageData={geofencePageData}
            pageCount={geofencePageCount}
            page={page}
            onPageChange={setPage}
            searchKeyword={searchKeyword}
            onSearchKeywordChange={(v) => {
              setSearchKeyword(v);
              setPage(1);
            }}
            sortKey={geofenceSortKey}
            sortDir={geofenceSortDir}
            onToggleSort={toggleGeofenceSort}
            onOpenMap={() => setMapOverviewOpen(true)}
            onCreate={() => setCreateOpen(true)}
            onBatchImport={() => setBatchImportOpen(true)}
            onFocus={focusAndScroll}
            focusId={focusId}
            focused={focused}
            onRowMore={(el, g) => setRowMoreAnchor({ el, g })}
            onEdit={(g) => setEditing(g)}
            onDelete={(g) => setDeleting(g)}
            selectedIds={selectedIds}
            onToggleRow={(id) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onToggleAllOnPage={(pageData) => {
              const allSelected =
                pageData.length > 0 &&
                pageData.every((g) => selectedIds.has(g.id));
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (allSelected) {
                  pageData.forEach((g) => next.delete(g.id));
                } else {
                  pageData.forEach((g) => next.add(g.id));
                }
                return next;
              });
            }}
            onClearSelection={() => setSelectedIds(new Set())}
            onBatchDelete={() => setBatchDeleteOpen(true)}
            tileStyle={tileStyle}
            onTileStyleChange={setTileStyle}
            registerRowRef={registerRowRef}
            allVisibleGeofences={searchedGeofences}
          />
        )}
        {tab === 1 && (
          <EventHistoryTab
            events={eventPageData}
            totalFilteredCount={sortedEvents.length}
            totalCount={events.length}
            pageCount={eventPageCount}
            page={eventPage}
            onPageChange={setEventPage}
            typeFilter={eventTypeFilter}
            onTypeFilterChange={(v) => {
              setEventTypeFilter(v);
              setEventPage(1);
            }}
            severityFilter={eventSeverityFilter}
            onSeverityFilterChange={(v) => {
              setEventSeverityFilter(v);
              setEventPage(1);
            }}
            timeFilter={eventTimeFilter}
            onTimeFilterChange={(v) => {
              setEventTimeFilter(v);
              setEventPage(1);
            }}
            searchKeyword={eventFenceSearch}
            onSearchKeywordChange={(v) => {
              setEventFenceSearch(v);
              setEventPage(1);
            }}
            sortKey={eventSortKey}
            sortDir={eventSortDir}
            onToggleSort={toggleEventSort}
            onMarkResolved={(id) => {
              setEvents((prev) =>
                prev.map((e) =>
                  e.id === id
                    ? { ...e, status: 'resolved', resolvedBy: '王小美', resolvedAt: '2026-04-23 10:30' }
                    : e,
                ),
              );
              setSnack('事件已標記為已處理');
            }}
          />
        )}
      </Box>

      {/* Dialogs */}
      <GeofenceFormDialog
        open={createOpen || Boolean(editing)}
        mode={editing ? 'edit' : 'create'}
        initial={editing}
        existingNames={data.map((g) => g.name)}
        onClose={() => {
          setCreateOpen(false);
          setEditing(null);
        }}
        onSubmit={(g) => {
          const wasEdit = Boolean(editing);
          if (editing) {
            setData((prev) => prev.map((p) => (p.id === editing.id ? g : p)));
          } else {
            setData((prev) => [g, ...prev]);
          }
          setCreateOpen(false);
          setEditing(null);
          setSnack(wasEdit ? `已更新圍籬「${g.name}」` : `已新增圍籬「${g.name}」`);
        }}
      />

      <DeleteConfirmDialog
        target={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) setData((prev) => prev.filter((p) => p.id !== deleting.id));
          setDeleting(null);
        }}
      />

      <BatchDeleteConfirmDialog
        targets={batchDeleteOpen ? data.filter((g) => selectedIds.has(g.id)) : []}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={() => {
          const count = selectedIds.size;
          setData((prev) => prev.filter((p) => !selectedIds.has(p.id)));
          setSelectedIds(new Set());
          setBatchDeleteOpen(false);
          setSnack(`已刪除 ${count} 個圍籬`);
        }}
      />

      <Menu
        anchorEl={rowMoreAnchor?.el ?? null}
        open={Boolean(rowMoreAnchor)}
        onClose={() => setRowMoreAnchor(null)}
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem
          onClick={() => {
            if (rowMoreAnchor) setViewing(rowMoreAnchor.g);
            setRowMoreAnchor(null);
          }}
        >
          <VisibilityOutlinedIcon fontSize="small" sx={{ mr: 1, color: theme.palette.dasGrey.grey01 }} />
          <Typography variant="body1">查看</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (rowMoreAnchor) setEditing(rowMoreAnchor.g);
            setRowMoreAnchor(null);
          }}
        >
          <EditOutlinedIcon fontSize="small" sx={{ mr: 1, color: theme.palette.dasGrey.grey01 }} />
          <Typography variant="body1">編輯</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (rowMoreAnchor) setDeleting(rowMoreAnchor.g);
            setRowMoreAnchor(null);
          }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1, color: theme.palette.dasGrey.grey01 }} />
          <Typography variant="body1">刪除</Typography>
        </MenuItem>
      </Menu>

      <GeofenceDetailDialog
        geofence={viewing}
        tileStyle={tileStyle}
        onClose={() => setViewing(null)}
        onEdit={(g) => {
          setViewing(null);
          setEditing(g);
        }}
        onDelete={(g) => {
          setViewing(null);
          setDeleting(g);
        }}
      />

      {/* 地圖總覽 Dialog */}
      <Dialog
        open={mapOverviewOpen}
        onClose={() => setMapOverviewOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: { width: '90vw', height: '90vh', maxHeight: '90vh', m: 0, borderRadius: 2, overflow: 'hidden' },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PublicOutlinedIcon sx={{ color: theme.palette.dasPrimary.dark01 }} />
          <Box>
            <Typography variant="h5Bold">地圖總覽</Typography>
            <Typography variant="footnote" sx={{ color: theme.palette.dasGrey.grey01 }}>
              共 {searchedGeofences.length} 筆
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, position: 'relative', flex: 1 }}>
          {mapOverviewOpen && (
            <MapContainer
              bounds={TAIWAN_BOUNDS}
              style={{ height: '100%', width: '100%' }}
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
              <FitMapToData data={searchedGeofences} focusId={focusId} triggerKey={fitTrigger} />
              {searchedGeofences.map((g) => {
                const isFocused = g.id === focusId;
                const softened = focusId !== null && !isFocused;
                const color = isFocused ? theme.palette.dasPrimary.dark01 : '#27AAE1';
                const pathOptions = {
                  color,
                  fillColor: color,
                  fillOpacity: isFocused ? 0.35 : softened ? 0.14 : 0.2,
                  weight: isFocused ? 3 : 1.5,
                  opacity: softened ? 0.8 : 1,
                };
                const tooltip = (
                  <LeafletTooltip direction="top" offset={[0, -6]} opacity={0.95}>
                    <Typography variant="footnote" sx={{ fontWeight: 600 }}>
                      {g.name}
                    </Typography>
                  </LeafletTooltip>
                );
                if (g.type === '多邊形' && g.vertices && g.vertices.length >= 3) {
                  return (
                    <Polygon
                      key={g.id}
                      positions={g.vertices}
                      pathOptions={pathOptions}
                      eventHandlers={{ click: () => setFocusId(g.id) }}
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
                    pathOptions={pathOptions}
                    eventHandlers={{ click: () => setFocusId(g.id) }}
                  >
                    {tooltip}
                  </Circle>
                );
              })}
            </MapContainer>
          )}
          <Paper
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
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
          {focusId && (
            <Paper
              sx={{
                position: 'absolute',
                right: 16,
                bottom: 16,
                zIndex: 500,
                borderRadius: 1.5,
              }}
            >
              <Button
                size="small"
                startIcon={<CenterFocusStrongIcon />}
                onClick={() => {
                  setFocusId(null);
                  setFitTrigger((x) => x + 1);
                }}
              >
                顯示全部
              </Button>
            </Paper>
          )}
        </DialogContent>
      </Dialog>

      <BatchImportDialog
        open={batchImportOpen}
        onClose={() => setBatchImportOpen(false)}
        onImport={(count) => {
          setBatchImportOpen(false);
          setSnack(`已成功匯入 ${count} 筆圍籬`);
        }}
      />

      <GlobalMonitoringSettingsDialog
        open={rulesDialogOpen}
        onClose={() => setRulesDialogOpen(false)}
        state={monitoringSettings}
        onChange={setMonitoringSettings}
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
    </Box>
  );
}

// ─── Tab 1: Geofence List ──────────────────────────────────────────────
function GeofenceListTab({
  data,
  searchedGeofences,
  pageData,
  pageCount,
  page,
  onPageChange,
  searchKeyword,
  onSearchKeywordChange,
  sortKey,
  sortDir,
  onToggleSort,
  onOpenMap,
  onCreate,
  onBatchImport,
  onFocus,
  focusId,
  focused,
  onRowMore,
  onEdit,
  onDelete,
  tileStyle,
  onTileStyleChange,
  registerRowRef,
  allVisibleGeofences,
  selectedIds,
  onToggleRow,
  onToggleAllOnPage,
  onClearSelection,
  onBatchDelete,
}: {
  data: Geofence[];
  searchedGeofences: Geofence[];
  pageData: Geofence[];
  pageCount: number;
  page: number;
  onPageChange: (v: number) => void;
  searchKeyword: string;
  onSearchKeywordChange: (v: string) => void;
  sortKey: GeofenceSortKey;
  sortDir: SortDir;
  onToggleSort: (k: GeofenceSortKey) => void;
  onOpenMap: () => void;
  onCreate: () => void;
  onBatchImport: () => void;
  onFocus: (id: string | null) => void;
  focusId: string | null;
  focused: Geofence | null;
  onRowMore: (el: HTMLElement, g: Geofence) => void;
  onEdit: (g: Geofence) => void;
  onDelete: (g: Geofence) => void;
  tileStyle: 'color' | 'grayscale';
  onTileStyleChange: (v: 'color' | 'grayscale') => void;
  registerRowRef: (id: string, el: HTMLTableRowElement | null) => void;
  allVisibleGeofences: Geofence[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAllOnPage: (pageData: Geofence[]) => void;
  onClearSelection: () => void;
  onBatchDelete: () => void;
}) {
  const theme = useTheme();
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const pageSelectedCount = pageData.filter((g) => selectedIds.has(g.id)).length;
  const pageAllSelected =
    pageData.length > 0 && pageSelectedCount === pageData.length;
  const pageSomeSelected = pageSelectedCount > 0 && !pageAllSelected;
  const selectionCount = selectedIds.size;
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 4, pb: 3 }}>
      {/* Action row */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TextField
          size="small"
          placeholder="搜尋名稱或地址"
          value={searchKeyword}
          onChange={(e) => onSearchKeywordChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.dasGrey.grey02, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 280 }}
        />
        <Box sx={{ flex: 1 }} />
        {previewCollapsed && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<MapOutlinedIcon />}
            onClick={() => setPreviewCollapsed(false)}
          >
            預覽地圖
          </Button>
        )}
      </Box>

      <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
        <Paper
          sx={{
            flex: 1,
            minWidth: 0,
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow:
              '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
          }}
        >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
            minHeight: 48,
            bgcolor: selectionCount > 0 ? theme.palette.dasPrimary.lite03 : 'transparent',
          }}
        >
          {selectionCount > 0 ? (
            <>
              <Typography
                variant="body2"
                sx={{ color: theme.palette.dasDark.dark01, fontWeight: 500 }}
              >
                已選 {selectionCount} 項
              </Typography>
              <Button
                size="small"
                color="inherit"
                onClick={onClearSelection}
                sx={{ color: theme.palette.dasGrey.grey01, minWidth: 0 }}
              >
                取消選取
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="text"
                size="small"
                startIcon={
                  <DeleteOutlineIcon sx={{ color: theme.palette.dasRed.main }} />
                }
                onClick={onBatchDelete}
                sx={{
                  color: theme.palette.dasDark.dark01,
                  fontWeight: 500,
                }}
              >
                刪除
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
                {searchKeyword ? (
                  <>
                    符合 <b style={{ color: theme.palette.dasPrimary.primary }}>{searchedGeofences.length}</b>
                    &nbsp;/ 共 {data.length} 筆
                  </>
                ) : (
                  <>
                    共 <b style={{ color: theme.palette.dasDark.dark01 }}>{data.length}</b> 筆
                  </>
                )}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => onPageChange(p)}
                size="small"
                siblingCount={0}
                boundaryCount={1}
              />
            </>
          )}
        </Box>

        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={pageAllSelected}
                    indeterminate={pageSomeSelected}
                    onChange={() => onToggleAllOnPage(pageData)}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'name'}
                    direction={sortKey === 'name' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('name')}
                  >
                    名稱
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'address'}
                    direction={sortKey === 'address' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('address')}
                  >
                    地址
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortKey === 'size'}
                    direction={sortKey === 'size' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('size')}
                  >
                    範圍
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'createdAt'}
                    direction={sortKey === 'createdAt' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('createdAt')}
                  >
                    建立日期
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sx={{ width: 96 }}>
                  <TableSortLabel
                    active={sortKey === 'orders'}
                    direction={sortKey === 'orders' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('orders')}
                  >
                    訂單
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right" sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {pageData.map((g) => {
                const isFocused = g.id === focusId;
                const isChecked = selectedIds.has(g.id);
                return (
                  <TableRow
                    key={g.id}
                    hover
                    ref={(el) => registerRowRef(g.id, el)}
                    onClick={() => onFocus(g.id)}
                    selected={isFocused}
                    sx={{
                      cursor: 'pointer',
                      '&.Mui-selected': { bgcolor: theme.palette.dasPrimary.lite03 },
                      '&.Mui-selected:hover': { bgcolor: theme.palette.dasPrimary.lite03 },
                    }}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={isChecked}
                        onChange={() => onToggleRow(g.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {g.name}
                      </Typography>
                      {g.note && (
                        <Typography
                          variant="footnote"
                          sx={{ color: theme.palette.dasGrey.grey01, display: 'block' }}
                        >
                          {g.note}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.palette.dasDark.dark02,
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={g.address}
                      >
                        {g.address}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {g.type === '多邊形' ? `${g.vertices?.length ?? 0} 點` : `${g.radius}m`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
                        {g.createdAt}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <GeofenceOrdersButton geofence={g} />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="更多">
                        <IconButton
                          size="small"
                          onClick={(e) => onRowMore(e.currentTarget, g)}
                          sx={{ color: theme.palette.dasGrey.grey01 }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {pageData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" sx={{ color: theme.palette.dasGrey.grey01 }}>
                      沒有符合條件的圍籬
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </Paper>

        <GeofencePreviewPanel
          geofences={allVisibleGeofences}
          focused={focused}
          focusId={focusId}
          tileStyle={tileStyle}
          onTileStyleChange={onTileStyleChange}
          onFocus={onFocus}
          onOpenFullscreen={onOpenMap}
          collapsed={previewCollapsed}
          onToggleCollapse={() => setPreviewCollapsed((c) => !c)}
        />
      </Box>
    </Box>
  );
}

function FitPreviewMap({
  geofences,
  focused,
}: {
  geofences: Geofence[];
  focused: Geofence | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (focused) {
      if (focused.type === '多邊形' && focused.vertices && focused.vertices.length >= 3) {
        const bounds = L.latLngBounds(
          focused.vertices.map(([la, ln]) => L.latLng(la, ln)),
        ).pad(0.4);
        map.flyToBounds(bounds, { maxZoom: 15, duration: 0.4 });
      } else {
        const bounds = L.latLng(focused.lat, focused.lng).toBounds(
          (focused.radius || 300) * 4,
        );
        map.flyToBounds(bounds, { maxZoom: 15, duration: 0.4 });
      }
      return;
    }
    if (geofences.length === 0) {
      map.fitBounds(TAIWAN_BOUNDS);
      return;
    }
    const bounds = new LatLngBounds(geofences.map((g) => [g.lat, g.lng]));
    map.flyToBounds(bounds, { padding: [20, 20], maxZoom: 11, duration: 0.4 });
  }, [focused?.id, geofences.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function GeofencePreviewPanel({
  geofences,
  focused,
  focusId,
  tileStyle,
  onTileStyleChange,
  onFocus,
  onOpenFullscreen,
  collapsed,
  onToggleCollapse,
}: {
  geofences: Geofence[];
  focused: Geofence | null;
  focusId: string | null;
  tileStyle: 'color' | 'grayscale';
  onTileStyleChange: (v: 'color' | 'grayscale') => void;
  onFocus: (id: string | null) => void;
  onOpenFullscreen: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const theme = useTheme();

  if (collapsed) return null;

  return (
    <Paper
      sx={{
        flex: 1,
        minWidth: 0,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow:
          '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5Bold" sx={{ fontSize: 15 }}>
            地圖預覽
          </Typography>
          <Typography variant="footnote" sx={{ color: theme.palette.dasGrey.grey01 }}>
            顯示 {geofences.length} 筆圍籬
          </Typography>
        </Box>
        <Tooltip title="收合">
          <IconButton size="small" onClick={onToggleCollapse}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Map */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, bgcolor: theme.palette.dasGrey.grey05 }}>
        <MapContainer
          bounds={TAIWAN_BOUNDS}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer
            key={tileStyle}
            url={
              tileStyle === 'grayscale'
                ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />
          <FitPreviewMap geofences={geofences} focused={focused} />
          {geofences.map((g) => {
            const isFocused = g.id === focusId;
            const softened = focusId !== null && !isFocused;
            const color = isFocused ? theme.palette.dasPrimary.dark01 : '#27AAE1';
            const pathOptions = {
              color,
              fillColor: color,
              fillOpacity: isFocused ? 0.35 : softened ? 0.1 : 0.18,
              weight: isFocused ? 3 : 1.2,
              opacity: softened ? 0.75 : 1,
            };
            if (g.type === '多邊形' && g.vertices && g.vertices.length >= 3) {
              return (
                <Polygon
                  key={g.id}
                  positions={g.vertices}
                  pathOptions={pathOptions}
                  eventHandlers={{ click: () => onFocus(g.id) }}
                >
                  <LeafletTooltip direction="top" offset={[0, -4]} opacity={0.95}>
                    <Typography variant="footnote" sx={{ fontWeight: 600 }}>
                      {g.name}
                    </Typography>
                  </LeafletTooltip>
                </Polygon>
              );
            }
            return (
              <Circle
                key={g.id}
                center={[g.lat, g.lng]}
                radius={g.radius}
                pathOptions={pathOptions}
                eventHandlers={{ click: () => onFocus(g.id) }}
              >
                <LeafletTooltip direction="top" offset={[0, -4]} opacity={0.95}>
                  <Typography variant="footnote" sx={{ fontWeight: 600 }}>
                    {g.name}
                  </Typography>
                </LeafletTooltip>
              </Circle>
            );
          })}
        </MapContainer>
        <Tooltip title="全螢幕檢視">
          <IconButton
            onClick={onOpenFullscreen}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 500,
              bgcolor: '#fff',
              color: theme.palette.dasDark.dark01,
              boxShadow: '0px 2px 6px rgba(0,0,0,0.2)',
              '&:hover': { bgcolor: '#fff' },
            }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {focusId && (
          <Tooltip title="顯示全部" placement="left">
            <IconButton
              size="small"
              onClick={() => onFocus(null)}
              sx={{
                position: 'absolute',
                bottom: 48,
                right: 8,
                zIndex: 500,
                width: 32,
                height: 32,
                bgcolor: '#fff',
                color: theme.palette.dasDark.dark01,
                boxShadow: '0px 2px 6px rgba(0,0,0,0.2)',
                borderRadius: 1,
                '&:hover': { bgcolor: '#fff' },
              }}
            >
              <CenterFocusStrongIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Paper
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            zIndex: 500,
            borderRadius: 1,
            overflow: 'hidden',
            boxShadow: '0px 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          <ToggleButtonGroup
            value={tileStyle}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (v === 'color' || v === 'grayscale') onTileStyleChange(v);
            }}
            sx={{
              '& .MuiToggleButton-root': {
                py: 0.25,
                px: 1,
                fontSize: 11,
                textTransform: 'none',
                border: 'none',
                height: 24,
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
      </Box>

    </Paper>
  );
}

function GeofenceDetailDialog({
  geofence,
  tileStyle,
  onClose,
  onEdit,
  onDelete,
}: {
  geofence: Geofence | null;
  tileStyle: 'color' | 'grayscale';
  onClose: () => void;
  onEdit: (g: Geofence) => void;
  onDelete: (g: Geofence) => void;
}) {
  const theme = useTheme();
  if (!geofence) return null;
  const pathOptions = {
    color: theme.palette.dasPrimary.dark01,
    fillColor: theme.palette.dasPrimary.dark01,
    fillOpacity: 0.3,
    weight: 2.5,
  };
  return (
    <Dialog
      open={Boolean(geofence)}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, overflow: 'hidden' } }}
    >
      <DialogTitle>
        <Typography variant="h5Bold" sx={{ display: 'block' }}>
          {geofence.name}
        </Typography>
        <Typography variant="footnote" sx={{ color: theme.palette.dasGrey.grey01 }}>
          查看圍籬詳情
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 3 }}>
          {/* Left: read-only fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <DetailReadOnlyField label="類型" value={geofence.type} />
            <DetailReadOnlyField label="圍籬名稱" value={geofence.name} />
            <DetailReadOnlyField
              label={geofence.type === '多邊形' ? '參考地址' : '地址'}
              value={geofence.address}
            />
            {geofence.type === '圓形' ? (
              <DetailReadOnlyField label="半徑" value={`${geofence.radius} m`} />
            ) : (
              <DetailReadOnlyField
                label="頂點"
                value={`${geofence.vertices?.length ?? 0} 個頂點`}
              />
            )}
            <DetailReadOnlyField label="備註" value={geofence.note || '—'} multiline />
          </Box>

          {/* Right: map preview */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minHeight: 0 }}>
            <Typography variant="headline" sx={{ color: theme.palette.dasGrey.grey01 }}>
              範圍預覽
            </Typography>
            <Box
              sx={{
                position: 'relative',
                border: `1px solid ${theme.palette.dasGrey.grey04}`,
                borderRadius: 1,
                overflow: 'hidden',
                height: 460,
              }}
            >
              <MapContainer
                key={geofence.id}
                bounds={TAIWAN_BOUNDS}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
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
                <FitPreviewMap geofences={[geofence]} focused={geofence} />
                {geofence.type === '多邊形' && geofence.vertices && geofence.vertices.length >= 3 ? (
                  <Polygon positions={geofence.vertices} pathOptions={pathOptions} />
                ) : (
                  <Circle
                    center={[geofence.lat, geofence.lng]}
                    radius={geofence.radius}
                    pathOptions={pathOptions}
                  />
                )}
              </MapContainer>
            </Box>
          </Box>
        </Box>

        {/* 監控中訂單 */}
        <Box sx={{ mt: 3 }}>
          <DetailOrdersSection geofence={geofence} />
        </Box>

        {/* 異動紀錄 */}
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ display: 'block', fontSize: 14, fontWeight: 600, mb: 1 }}>
            異動紀錄
          </Typography>
          <Box
            sx={{
              border: `1px solid ${theme.palette.dasGrey.grey04}`,
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.dasGrey.grey05 }}>
                  <TableCell sx={{ fontWeight: 500 }}>時間</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>異動人員</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>異動角色</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>異動摘要</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {geofence.auditLog.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.time}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.user}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{e.role}</TableCell>
                    <TableCell>{e.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </DialogContent>

      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          gap: 1,
        }}
      >
        <Button
          onClick={() => onDelete(geofence)}
          color="error"
          startIcon={<DeleteOutlineIcon />}
        >
          刪除
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={() => onEdit(geofence)}
          variant="contained"
          color="primary"
          startIcon={<EditOutlinedIcon />}
        >
          編輯
        </Button>
      </Box>
    </Dialog>
  );
}

function DetailOrdersSection({ geofence }: { geofence: Geofence }) {
  const theme = useTheme();
  const orders = mockOrdersForGeofence(geofence);
  const count = orders.length;
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>監控中訂單</Typography>
        <Typography variant="footnote" sx={{ color: theme.palette.dasGrey.grey01 }}>
          {count > 0 ? `共 ${count} 張` : '無'}
        </Typography>
      </Box>
      {count === 0 ? (
        <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
          目前沒有訂單綁定此圍籬
        </Typography>
      ) : (
        <Box
          sx={{
            border: `1px solid ${theme.palette.dasGrey.grey04}`,
            borderRadius: 1,
            overflow: 'hidden',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            }}
          >
            {orders.map((id, i) => (
              <Link
                key={id}
                href={`#/orders/${id}`}
                underline="hover"
                sx={{
                  px: 1.5,
                  py: 0.75,
                  fontSize: 13,
                  fontFamily:
                    '"Roboto Mono", "SF Mono", Menlo, Consolas, monospace',
                  color: theme.palette.dasPrimary.primary,
                  borderBottom:
                    i < orders.length - 1
                      ? `1px solid ${theme.palette.dasGrey.grey05}`
                      : undefined,
                  '&:hover': { bgcolor: theme.palette.dasPrimary.lite03 },
                }}
              >
                {id}
              </Link>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function DetailReadOnlyField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const theme = useTheme();
  return (
    <Box>
      <Typography
        variant="headline"
        sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          px: 1.5,
          py: multiline ? 1 : 0,
          minHeight: 40,
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          borderRadius: 1,
          border: `1px solid ${theme.palette.dasGrey.grey04}`,
          bgcolor: theme.palette.dasGrey.grey06,
          color: theme.palette.dasDark.dark01,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            whiteSpace: multiline ? 'pre-wrap' : undefined,
            wordBreak: 'break-word',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Tab 2: Event History ──────────────────────────────────────────────
function EventTypeIcon({ type }: { type: EventType }) {
  const theme = useTheme();
  if (type === '進入') return <LoginIcon sx={{ fontSize: 16, color: theme.palette.dasPrimary.primary }} />;
  if (type === '離開') return <LogoutIcon sx={{ fontSize: 16, color: theme.palette.dasGrey.grey01 }} />;
  if (type === '停留超時')
    return <TimerOutlinedIcon sx={{ fontSize: 16, color: theme.palette.dasOrange.main }} />;
  return <NotificationsActiveOutlinedIcon sx={{ fontSize: 16, color: theme.palette.dasRed.main }} />;
}

function SeverityChip({ severity }: { severity: EventSeverity }) {
  const theme = useTheme();
  if (severity === 'alert') {
    return (
      <Chip
        size="small"
        icon={<NotificationsActiveOutlinedIcon sx={{ fontSize: 12 }} />}
        label="警示"
        sx={{
          height: 20,
          fontSize: 11,
          fontWeight: 500,
          bgcolor: theme.palette.dasRed.lite01,
          color: theme.palette.dasRed.dark01,
          '& .MuiChip-icon': { color: theme.palette.dasRed.main },
        }}
      />
    );
  }
  if (severity === 'warning') {
    return (
      <Chip
        size="small"
        icon={<WarningAmberRoundedIcon sx={{ fontSize: 12 }} />}
        label="警告"
        sx={{
          height: 20,
          fontSize: 11,
          fontWeight: 500,
          bgcolor: theme.palette.dasOrange.lite01,
          color: theme.palette.dasOrange.dark01,
          '& .MuiChip-icon': { color: theme.palette.dasOrange.main },
        }}
      />
    );
  }
  return (
    <Chip
      size="small"
      label="一般"
      sx={{
        height: 20,
        fontSize: 11,
        bgcolor: theme.palette.dasGrey.grey05,
        color: theme.palette.dasGrey.grey01,
      }}
    />
  );
}

function EventHistoryTab({
  events,
  totalFilteredCount,
  totalCount,
  pageCount,
  page,
  onPageChange,
  typeFilter,
  onTypeFilterChange,
  severityFilter,
  onSeverityFilterChange,
  timeFilter,
  onTimeFilterChange,
  searchKeyword,
  onSearchKeywordChange,
  sortKey,
  sortDir,
  onToggleSort,
  onMarkResolved,
}: {
  events: GeofenceEvent[];
  totalFilteredCount: number;
  totalCount: number;
  pageCount: number;
  page: number;
  onPageChange: (v: number) => void;
  typeFilter: 'all' | EventType;
  onTypeFilterChange: (v: 'all' | EventType) => void;
  severityFilter: 'all' | EventSeverity;
  onSeverityFilterChange: (v: 'all' | EventSeverity) => void;
  timeFilter: 'all' | 'today' | 'week';
  onTimeFilterChange: (v: 'all' | 'today' | 'week') => void;
  searchKeyword: string;
  onSearchKeywordChange: (v: string) => void;
  sortKey: EventSortKey;
  sortDir: SortDir;
  onToggleSort: (k: EventSortKey) => void;
  onMarkResolved: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 4, pb: 3 }}>
      {/* Filter bar */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="搜尋圍籬 / 車輛 / 訂單"
          value={searchKeyword}
          onChange={(e) => onSearchKeywordChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.dasGrey.grey02, fontSize: 18 }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 280 }}
        />
        <ToggleButtonGroup
          value={timeFilter}
          exclusive
          size="small"
          onChange={(_, v) => v && onTimeFilterChange(v)}
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              py: 0.25,
              px: 1.5,
              fontSize: 12,
            },
          }}
        >
          <ToggleButton value="today">今日</ToggleButton>
          <ToggleButton value="week">本週</ToggleButton>
          <ToggleButton value="all">全部</ToggleButton>
        </ToggleButtonGroup>
        <Select
          size="small"
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as 'all' | EventType)}
          sx={{ minWidth: 120, height: 32, fontSize: 13 }}
        >
          <MenuItem value="all">全部類型</MenuItem>
          <MenuItem value="進入">進入</MenuItem>
          <MenuItem value="離開">離開</MenuItem>
          <MenuItem value="停留超時">停留超時</MenuItem>
          <MenuItem value="警示">警示</MenuItem>
        </Select>
        <Select
          size="small"
          value={severityFilter}
          onChange={(e) => onSeverityFilterChange(e.target.value as 'all' | EventSeverity)}
          sx={{ minWidth: 120, height: 32, fontSize: 13 }}
        >
          <MenuItem value="all">全部嚴重度</MenuItem>
          <MenuItem value="alert">警示</MenuItem>
          <MenuItem value="warning">警告</MenuItem>
          <MenuItem value="info">一般</MenuItem>
        </Select>
      </Box>

      <Paper
        sx={{
          flex: 1,
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow:
            '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
            minHeight: 48,
          }}
        >
          <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
            {totalFilteredCount === totalCount ? (
              <>
                共 <b style={{ color: theme.palette.dasDark.dark01 }}>{totalCount}</b> 筆
              </>
            ) : (
              <>
                符合{' '}
                <b style={{ color: theme.palette.dasPrimary.primary }}>{totalFilteredCount}</b>
                &nbsp;/ 共 {totalCount} 筆
              </>
            )}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_, p) => onPageChange(p)}
            size="small"
            siblingCount={0}
            boundaryCount={1}
          />
        </Box>

        <TableContainer sx={{ flex: 1 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 150 }}>
                  <TableSortLabel
                    active={sortKey === 'time'}
                    direction={sortKey === 'time' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('time')}
                  >
                    時間
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 100 }}>
                  <TableSortLabel
                    active={sortKey === 'type'}
                    direction={sortKey === 'type' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('type')}
                  >
                    類型
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 88 }}>
                  <TableSortLabel
                    active={sortKey === 'severity'}
                    direction={sortKey === 'severity' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('severity')}
                  >
                    嚴重
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortKey === 'geofence'}
                    direction={sortKey === 'geofence' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('geofence')}
                  >
                    圍籬
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 130 }}>
                  <TableSortLabel
                    active={sortKey === 'vehicle'}
                    direction={sortKey === 'vehicle' ? sortDir : 'asc'}
                    onClick={() => onToggleSort('vehicle')}
                  >
                    車輛 / 司機
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ width: 130 }}>訂單</TableCell>
                <TableCell sx={{ width: 120 }}>狀態</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((e) => {
                const isNew = e.status === 'new';
                return (
                  <TableRow
                    key={e.id}
                    hover
                    sx={{ cursor: 'default' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isNew && (
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: theme.palette.dasRed.main,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            color: theme.palette.dasDark.dark02,
                            fontWeight: isNew ? 600 : 400,
                            fontFamily: '"Roboto Mono", monospace',
                          }}
                        >
                          {e.time}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventTypeIcon type={e.type} />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: isNew ? 500 : 400 }}
                        >
                          {e.type}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <SeverityChip severity={e.severity} />
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isNew ? 500 : 400,
                          color: theme.palette.dasPrimary.dark01,
                          cursor: 'pointer',
                          maxWidth: 240,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={e.geofenceName}
                      >
                        {e.geofenceName}
                      </Typography>
                      {e.note && (
                        <Typography
                          variant="footnote"
                          sx={{ color: theme.palette.dasGrey.grey01, display: 'block' }}
                        >
                          {e.note}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: '"Roboto Mono", monospace', fontSize: 12 }}
                      >
                        {e.vehicle}
                      </Typography>
                      <Typography
                        variant="footnote"
                        sx={{ color: theme.palette.dasGrey.grey01, display: 'block' }}
                      >
                        {e.driver}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {e.orderId && (
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: '"Roboto Mono", monospace',
                            fontSize: 12,
                            color: theme.palette.dasPrimary.primary,
                            cursor: 'pointer',
                          }}
                        >
                          {e.orderId}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.status === 'new' && e.severity !== 'info' && (
                        <Button
                          size="small"
                          onClick={() => onMarkResolved(e.id)}
                          sx={{ textTransform: 'none', px: 1, minWidth: 0 }}
                        >
                          標記已處理
                        </Button>
                      )}
                      {e.status === 'read' && (
                        <Typography variant="footnote" sx={{ color: theme.palette.dasGrey.grey01 }}>
                          已讀
                        </Typography>
                      )}
                      {e.status === 'resolved' && (
                        <Box>
                          <Typography
                            variant="footnote"
                            sx={{ color: theme.palette.dasGreen.dark02, fontWeight: 500 }}
                          >
                            已處理
                          </Typography>
                          {e.resolvedBy && (
                            <Typography
                              variant="caption"
                              sx={{ color: theme.palette.dasGrey.grey01, display: 'block' }}
                            >
                              {e.resolvedBy}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body1" sx={{ color: theme.palette.dasGrey.grey01 }}>
                      沒有符合條件的事件
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
