import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';

import {
  Geofence,
  guessAddress,
  AuditEntry,
  centroidOf,
  GeofenceType,
} from '../data/mockGeofences';
import MapPreview from './MapPreview';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

export function GeofenceFormDialog({
  open,
  mode,
  initial,
  existingNames,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial: Geofence | null;
  existingNames: string[];
  onClose: () => void;
  onSubmit: (g: Geofence) => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState(200);
  const [note, setNote] = useState('');
  const [center, setCenter] = useState<[number, number]>([25.033, 121.564]);
  const [geocodingFailed, setGeocodingFailed] = useState(false);
  const [nameErrorShown, setNameErrorShown] = useState<string | null>(null);
  const [shapeType, setShapeType] = useState<GeofenceType>('圓形');
  const [vertices, setVertices] = useState<[number, number][]>([]);
  const [vertexErrorShown, setVertexErrorShown] = useState<string | null>(null);
  const [vertexInput, setVertexInput] = useState('');
  const [vertexInputError, setVertexInputError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<Geofence | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setAddress(initial.address);
      setRadius(initial.radius || 200);
      setNote(initial.note ?? '');
      setCenter([initial.lat, initial.lng]);
      setShapeType(initial.type);
      setVertices(initial.vertices ? [...initial.vertices] : []);
    } else {
      setName('');
      setAddress('');
      setRadius(200);
      setNote('');
      setCenter([25.033, 121.564]);
      setShapeType('圓形');
      setVertices([]);
    }
    setGeocodingFailed(false);
    setNameErrorShown(null);
    setVertexErrorShown(null);
    setVertexInput('');
    setVertexInputError(null);
  }, [open, initial]);

  function handleVertexAddressSubmit() {
    const lowered = vertexInput.trim();
    if (!lowered) return;
    let lat: number | null = null;
    let lng: number | null = null;
    const coordMatch = lowered.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
    if (coordMatch) {
      lat = parseFloat(coordMatch[1]);
      lng = parseFloat(coordMatch[2]);
    } else if (/xxx|test|asdf/.test(lowered.toLowerCase())) {
      setVertexInputError('查無此地址,請改用經緯度或直接在地圖上點擊');
      return;
    } else {
      const codeSum = Array.from(lowered).reduce(
        (s, c) => s + c.charCodeAt(0),
        0,
      );
      lat = 22.9 + ((codeSum % 250) / 100);
      lng = 120.1 + ((codeSum % 180) / 100);
    }
    if (lat === null || lng === null || !isFinite(lat) || !isFinite(lng)) {
      setVertexInputError('座標格式錯誤');
      return;
    }
    setVertices((prev) => [...prev, [lat as number, lng as number]]);
    setCenter([lat, lng]);
    setVertexInput('');
    setVertexInputError(null);
    if (vertexErrorShown) setVertexErrorShown(null);
  }

  function handleAddressSubmit() {
    const lowered = address.trim();
    if (!lowered) return;
    if (/xxx|test|asdf/.test(lowered.toLowerCase())) {
      setGeocodingFailed(true);
      return;
    }
    setGeocodingFailed(false);
    // parse "lat, lng" coord format
    const coordMatch = lowered.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (isFinite(lat) && isFinite(lng)) {
        setCenter([lat, lng]);
        return;
      }
    }
    const codeSum = Array.from(lowered).reduce((s, c) => s + c.charCodeAt(0), 0);
    const lat = 22.9 + ((codeSum % 250) / 100);
    const lng = 120.1 + ((codeSum % 180) / 100);
    setCenter([lat, lng]);
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameErrorShown('請輸入圍籬名稱');
      return;
    }
    const dup = existingNames.find(
      (n) => n === trimmed && (!initial || initial.name !== n),
    );
    if (dup) {
      setNameErrorShown('此名稱已存在，請換一個');
      return;
    }
    if (shapeType === '圓形' && (!address.trim() || geocodingFailed)) return;
    if (shapeType === '多邊形' && vertices.length < 3) {
      setVertexErrorShown(`多邊形至少需要 3 個頂點（目前 ${vertices.length}）`);
      return;
    }

    const today = '2026-04-23';
    const nowTime = `${today} 10:00`;
    const actor = '王小美';

    const finalCenter: [number, number] =
      shapeType === '多邊形' ? centroidOf(vertices) : center;
    const finalAddress =
      shapeType === '多邊形'
        ? address.trim() || guessAddress(finalCenter[0], finalCenter[1])
        : address.trim();

    let summary = '更新圍籬內容';
    if (initial) {
      if (shapeType === '圓形' && initial.radius !== radius) {
        summary = `調整半徑 ${initial.radius}m → ${radius}m`;
      } else if (
        shapeType === '多邊形' &&
        JSON.stringify(initial.vertices ?? []) !== JSON.stringify(vertices)
      ) {
        summary = `更新多邊形頂點（${initial.vertices?.length ?? 0} → ${vertices.length} 個）`;
      } else if (initial.name !== trimmed) {
        summary = '更新圍籬名稱';
      } else if (initial.address !== address.trim()) {
        summary = '更新地址';
      }
    }

    const newEntry: AuditEntry = initial
      ? { time: nowTime, user: actor, role: '調度員', summary }
      : { time: nowTime, user: actor, role: '調度員', summary: '建立圍籬' };

    const g: Geofence = {
      id: initial ? initial.id : `GF-NEW-${Date.now()}`,
      name: trimmed,
      type: shapeType,
      address: finalAddress,
      lat: finalCenter[0],
      lng: finalCenter[1],
      radius: shapeType === '圓形' ? radius : 0,
      vertices: shapeType === '多邊形' ? vertices : undefined,
      note: note.trim() || undefined,
      isEnabled: initial?.isEnabled ?? true,
      usingOrderCount: initial?.usingOrderCount ?? 0,
      creationMethod: initial?.creationMethod ?? '手動建立',
      createdBy: initial?.createdBy ?? actor,
      createdAt: initial?.createdAt ?? today,
      updatedAt: today,
      auditLog: initial ? [newEntry, ...initial.auditLog] : [newEntry],
    };
    // 編輯且有監控中訂單 → 先彈確認；否則直接送出
    if (initial && (initial.usingOrderCount ?? 0) > 0) {
      setPendingEdit(g);
      return;
    }
    onSubmit(g);
  }

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { minHeight: 680 } }}
    >
      <DialogTitle>
        <Typography variant="h5Bold">
          {mode === 'create' ? '新增圍籬' : `編輯：${initial?.name}`}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  <Typography variant="body1">{initial?.type ?? '圓形'}</Typography>
                </Box>
              ) : (
                <ToggleButtonGroup
                  value={shapeType}
                  exclusive
                  size="small"
                  fullWidth
                  onChange={(_, v) => {
                    if (v === '圓形' || v === '多邊形') setShapeType(v);
                  }}
                  sx={{
                    '& .MuiToggleButton-root': {
                      textTransform: 'none',
                      py: 1.25,
                      px: 1.5,
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
                        以中心點 + 半徑定義範圍，適合倉儲、集散點等定點型地點
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
                        點選地圖逐一加入頂點，適合廠區、碼頭等不規則範圍
                      </Typography>
                    </Box>
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>

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
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameErrorShown) setNameErrorShown(null);
                }}
                error={Boolean(nameErrorShown)}
                helperText={nameErrorShown ?? undefined}
              />
            </Box>

            {shapeType === '圓形' && (
              <Box>
                <Typography
                  variant="headline"
                  sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
                >
                  地址 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={address}
                  placeholder="台北市信義區市府路 1 號 / 25.033, 121.564"
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setGeocodingFailed(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddressSubmit();
                  }}
                  onBlur={handleAddressSubmit}
                  error={geocodingFailed}
                  helperText={
                    geocodingFailed
                      ? '查無此地址，請改用經緯度輸入或直接在地圖上點擊'
                      : '輸入地址後按 Enter 自動定位，或直接在地圖上點擊設定中心點'
                  }
                />
              </Box>
            )}

            {shapeType === '圓形' ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="headline" sx={{ color: theme.palette.dasGrey.grey01 }}>
                    半徑 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <TextField
                    size="small"
                    type="number"
                    value={radius}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (!isFinite(n)) return;
                      setRadius(Math.max(50, Math.min(5000, n)));
                    }}
                    inputProps={{ min: 50, max: 5000, step: 10, style: { textAlign: 'right' } }}
                    sx={{ width: 90 }}
                  />
                  <Typography variant="body1" sx={{ ml: 0.75, color: theme.palette.dasGrey.grey01 }}>
                    m
                  </Typography>
                </Box>
                <Slider
                  value={radius}
                  min={50}
                  max={5000}
                  step={50}
                  onChange={(_, v) => setRadius(v as number)}
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
                <Typography
                  variant="headline"
                  sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 0.75 }}
                >
                  頂點 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={vertexInput}
                  placeholder="輸入地址或經緯度,按 Enter 加入頂點"
                  onChange={(e) => {
                    setVertexInput(e.target.value);
                    if (vertexInputError) setVertexInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVertexAddressSubmit();
                    }
                  }}
                  error={Boolean(vertexInputError)}
                  helperText={
                    vertexInputError ??
                    `已加入 ${vertices.length} 個頂點(至少需 3 個) · 也可直接在地圖上點擊加入`
                  }
                />
                {vertexErrorShown && (
                  <Typography
                    variant="footnote"
                    sx={{ color: theme.palette.dasRed.main, mt: 0.5, display: 'block' }}
                  >
                    {vertexErrorShown}
                  </Typography>
                )}
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
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Box>
          </Box>

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
              }}
            >
              {shapeType === '圓形' ? (
                <MapPreview
                  center={center}
                  radius={radius}
                  height={460}
                  onCenterChange={(lat, lng) => {
                    setCenter([lat, lng]);
                    setAddress(guessAddress(lat, lng));
                    setGeocodingFailed(false);
                  }}
                />
              ) : (
                <MapPreview
                  shape="polygon"
                  center={center}
                  vertices={vertices}
                  height={460}
                  onVerticesChange={(v) => {
                    setVertices(v);
                    if (vertexErrorShown) setVertexErrorShown(null);
                  }}
                />
              )}
              {shapeType === '多邊形' && (
                <Paper
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pl: 1.5,
                    pr: 0.5,
                    py: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    zIndex: 500,
                    bgcolor: 'rgba(0,0,0,0.78)',
                    color: '#fff',
                    boxShadow: 'none',
                    borderRadius: 1.5,
                  }}
                >
                  <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                  <Typography variant="footnote" sx={{ color: '#fff' }}>
                    已有 {vertices.length} 個頂點（拖曳頂點移動位置 · 點擊右鍵刪除頂點）
                  </Typography>
                  <Box sx={{ width: '1px', height: 16, bgcolor: 'rgba(255,255,255,0.3)', mx: 0.5 }} />
                  <Button
                    size="small"
                    startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                    onClick={() => {
                      setVertices([]);
                      setVertexErrorShown(null);
                    }}
                    disabled={vertices.length === 0}
                    sx={{
                      color: '#fff',
                      minWidth: 0,
                      fontSize: 11,
                      px: 1,
                      '&:disabled': { color: 'rgba(255,255,255,0.35)' },
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    重新繪製
                  </Button>
                </Paper>
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                color: theme.palette.dasGrey.grey01,
                mt: 0.5,
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
              <Typography variant="footnote">
                {shapeType === '圓形'
                  ? '點地圖任一點重設中心；拖曳 slider 看圓圈大小變化'
                  : '輸入頂點地址並按 Enter 加入,或直接在地圖上點選加入頂點'}
              </Typography>
            </Box>
          </Box>
        </Box>

      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="secondary">
          取消
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={
            (shapeType === '圓形' && (!address.trim() || geocodingFailed)) ||
            (shapeType === '多邊形' && vertices.length < 3)
          }
        >
          {mode === 'create' ? '儲存' : '更新'}
        </Button>
      </DialogActions>
    </Dialog>
    <EditImpactConfirmDialog
      open={Boolean(pendingEdit && initial)}
      onClose={() => setPendingEdit(null)}
      onConfirm={() => {
        if (pendingEdit) onSubmit(pendingEdit);
        setPendingEdit(null);
      }}
    />
    </>
  );
}

export function EditImpactConfirmDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{ sx: { maxWidth: 600 } }}
    >
      <DialogTitle>
        <Typography variant="h5Bold">圍籬變動將影響監控訂單的範圍</Typography>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            p: 1.5,
            borderRadius: 1,
            bgcolor: theme.palette.dasOrange.lite01,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 20,
              color: theme.palette.dasOrange.main,
              mt: '2px',
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            變更圍籬地址或範圍，將改變車輛進場/出場的判斷結果，建議通知相關內部人員，並確認正在使用此圍籬的訂單是否需調整。
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="secondary">
          取消
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function EditConfirmDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{ sx: { maxWidth: 600 } }}
    >
      <DialogTitle>
        <Typography variant="h5Bold">提醒</Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          本次變更將覆蓋使用此圍籬的既存訂單，確定要繼續嗎?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="secondary">
          取消
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function DeleteConfirmDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: Geofence | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  return (
    <Dialog
      open={Boolean(target)}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{ sx: { maxWidth: 600 } }}
    >
      <DialogTitle>
        <Typography variant="h5Bold">刪除圍籬</Typography>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            p: 1.5,
            borderRadius: 1,
            bgcolor: theme.palette.dasOrange.lite01,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 20,
              color: theme.palette.dasOrange.main,
              mt: '2px',
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            刪除後資料無法復原，且正在使用所選圍籬的訂單將失去監控範圍。建議通知相關內部人員，並確認相關訂單是否需調整。
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="secondary">
          取消
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function BatchDeleteConfirmDialog({
  targets,
  onClose,
  onConfirm,
}: {
  targets: Geofence[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  const open = targets.length > 0;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{ sx: { maxWidth: 600 } }}
    >
      <DialogTitle>
        <Typography variant="h5Bold">刪除圍籬</Typography>
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            p: 1.5,
            borderRadius: 1,
            bgcolor: theme.palette.dasOrange.lite01,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 20,
              color: theme.palette.dasOrange.main,
              mt: '2px',
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
            刪除後資料無法復原，且正在使用所選圍籬的訂單將失去監控範圍。建議通知相關內部人員，並確認相關訂單是否需調整。
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="secondary">
          取消
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          確認
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ToggleConfirmDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: { geofence: Geofence; nextEnabled: boolean } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  const geofence = target?.geofence;
  const nextEnabled = target?.nextEnabled ?? true;

  return (
    <Dialog open={Boolean(target)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {nextEnabled ? (
            <ToggleOnOutlinedIcon sx={{ color: theme.palette.dasGreen.main }} />
          ) : (
            <ToggleOffOutlinedIcon sx={{ color: theme.palette.dasGrey.grey01 }} />
          )}
          <Typography variant="h5Bold">
            {nextEnabled ? '啟用' : '停用'}「{geofence?.name}」的監控規則？
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {nextEnabled ? (
          <Typography variant="body1">
            啟用後，進出偵測、事件觸發與告警將依規則開始運作。
          </Typography>
        ) : (
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              停用後：
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3, '& li': { mb: 0.5 } }}>
              <li>
                <Typography variant="body2">
                  進出偵測、事件觸發、告警將停止運作
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  圍籬本身仍可被新訂單選擇（僅監控邏輯暫停）
                </Typography>
              </li>
              <li>
                <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
                  可隨時重新啟用（與刪除不同，停用不會消失）
                </Typography>
              </li>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="secondary">
          取消
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={nextEnabled ? 'primary' : 'warning'}
        >
          確認{nextEnabled ? '啟用' : '停用'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
