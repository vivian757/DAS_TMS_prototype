import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  InputBase,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

type ImportRow = {
  rowNum: number;
  name: string;
  type: string;
  address: string;
  radius: string;
  vertices: string; // 以 , 分隔
  errors: string[];
};

const INITIAL_ROWS: ImportRow[] = [
  // 1: 圓形 成功
  { rowNum: 1, name: '僑力_南崁廠', type: '圓形', address: '桃園市蘆竹區南崁路 100 號', radius: '500', vertices: '', errors: [] },
  // 2: 多邊形 成功
  { rowNum: 2, name: '台積_竹科廠區', type: '多邊形', address: '', radius: '', vertices: '新竹市東區研新一路 1 號, 新竹市東區研發六路 8 號, 新竹市東區研發七路 12 號, 新竹市東區力行路 5 號', errors: [] },
  // 3: 名稱與第 4 列同名（檔案內重複）
  { rowNum: 3, name: '全家_新莊店', type: '圓形', address: '新北市新莊區中正路 380 號', radius: '200', vertices: '', errors: ['不可新增重複的圍籬名稱'] },
  // 4: 名稱與第 3 列同名（檔案內重複）
  { rowNum: 4, name: '全家_新莊店', type: '圓形', address: '新北市新莊區中正路 380 號', radius: '200', vertices: '', errors: ['不可新增重複的圍籬名稱'] },
  // 5: 與既有系統圍籬同名
  { rowNum: 5, name: '統一速達_新竹倉', type: '圓形', address: '新竹市東區光復路二段 295 號', radius: '300', vertices: '', errors: ['與既有的圍籬名稱重複'] },
  // 6: 圍籬名稱必填
  { rowNum: 6, name: '', type: '圓形', address: '桃園市桃園區中山路 100 號', radius: '200', vertices: '', errors: ['「圍籬名稱」為必填'] },
  // 7: 圍籬類型必填
  { rowNum: 7, name: '高雄港邊倉', type: '', address: '高雄市鼓山區蓬萊路 1 號', radius: '500', vertices: '', errors: ['「圍籬類型」為必填'] },
  // 8: 圓形 成功
  { rowNum: 8, name: '7-11_板橋店', type: '圓形', address: '新北市板橋區文化路一段 188 號', radius: '200', vertices: '', errors: [] },
  // 9: 圓形 中心點地址 + 半徑 都必填
  { rowNum: 9, name: '屈臣氏_中和店', type: '圓形', address: '', radius: '', vertices: '', errors: ['圓形圍籬的「中心點地址」為必填', '圓形圍籬的「半徑 (m)」為必填'] },
  // 10: 多邊形 頂點數不足 3
  { rowNum: 10, name: '中和分區', type: '多邊形', address: '', radius: '', vertices: '新北市中和區景平路 100 號, 新北市中和區景平路 200 號', errors: ['多邊形圍籬的頂點數至少需有 3 個'] },
  // 11: 圓形 成功
  { rowNum: 11, name: 'COSTCO_台中', type: '圓形', address: '台中市北屯區敦富路 215 號', radius: '500', vertices: '', errors: [] },
  // 12: 中心點地址 / 經緯度 查無
  { rowNum: 12, name: '不存在地點倉', type: '圓形', address: '火星基地一號站', radius: '300', vertices: '', errors: ['查無此中心點地址/經緯度'] },
  // 13: 多邊形頂點 1, 2 查無
  { rowNum: 13, name: '林口貨運專用道', type: '多邊形', address: '', radius: '', vertices: 'XYZ123, 不存在的地址 99 號, 新北市林口區文化三路 8 號', errors: ['查無頂點 1, 2 的地址/經緯度'] },
  // 14: 圓形 成功
  { rowNum: 14, name: '7-11_中壢店', type: '圓形', address: '桃園市中壢區中央西路一段 80 號', radius: '200', vertices: '', errors: [] },
  // 15: 圓形但有填頂點地址（多餘欄位忽略，仍成功）
  { rowNum: 15, name: '家樂福_台中倉', type: '圓形', address: '台中市西屯區中港路三段 136 號', radius: '500', vertices: '台中市西屯區中港路 1 號, 台中市西屯區中港路 50 號, 台中市西屯區中港路 88 號', errors: [] },
  // 16: 多邊形但有填中心點 + 半徑（多餘欄位忽略，仍成功）
  { rowNum: 16, name: '基隆港集散區', type: '多邊形', address: '基隆市中正區中正路 1 號', radius: '400', vertices: '基隆市中正區中正路 1 號, 基隆市中正區中正路 50 號, 基隆市中正區中正路 80 號', errors: [] },
];

function fieldHasError(
  errors: string[],
  field: 'name' | 'type' | 'address' | 'radius' | 'vertices',
) {
  if (errors.length === 0) return false;
  if (field === 'name') {
    return errors.some((e) => e.includes('圍籬名稱'));
  }
  if (field === 'type') {
    return errors.some((e) => e.includes('圍籬類型'));
  }
  if (field === 'address') {
    return errors.some((e) => e.includes('中心點地址'));
  }
  if (field === 'radius') {
    return errors.some((e) => e.includes('半徑'));
  }
  if (field === 'vertices') {
    return errors.some((e) => e.includes('頂點'));
  }
  return false;
}

export default function BatchImportPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);

  const successCount = useMemo(
    () => rows.filter((r) => r.errors.length === 0).length,
    [rows],
  );
  const failedRows = useMemo(
    () => rows.filter((r) => r.errors.length > 0),
    [rows],
  );
  const groupedErrors = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, number[]>();
    failedRows.forEach((r) => {
      r.errors.forEach((e) => {
        if (!map.has(e)) {
          order.push(e);
          map.set(e, []);
        }
        map.get(e)!.push(r.rowNum);
      });
    });
    return order.map((e) => ({ message: e, rowNums: map.get(e)! }));
  }, [failedRows]);
  const total = rows.length;
  const isParsed = !!fileName && !isParsing && rows.length > 0;

  function handlePickFile() {
    setFileName('geofences_2026_Q2.xlsx');
    setIsParsing(true);
    window.setTimeout(() => {
      setRows(INITIAL_ROWS);
      setIsParsing(false);
    }, 600);
  }

  function handleReUpload() {
    setFileName(null);
    setRows([]);
    setIsParsing(false);
  }

  function handleDeleteRow(rowNum: number) {
    setRows((prev) => prev.filter((r) => r.rowNum !== rowNum));
  }

  function handleCellChange(
    rowNum: number,
    field: 'name' | 'type' | 'address' | 'radius' | 'vertices',
    value: string,
  ) {
    const keywordMap = {
      name: '圍籬名稱',
      type: '圍籬類型',
      address: '中心點地址',
      radius: '半徑',
      vertices: '頂點',
    } as const;
    const keyword = keywordMap[field];
    const POLYGON_VERTEX_ERROR = '多邊形圍籬的頂點數至少需有 3 個';
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowNum !== rowNum) return r;
        const next = {
          ...r,
          [field]: value,
          errors: r.errors.filter(
            (e) => !e.includes(keyword) && e !== POLYGON_VERTEX_ERROR,
          ),
        };
        if (next.type === '多邊形') {
          const count = next.vertices
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean).length;
          if (count < 3) next.errors.push(POLYGON_VERTEX_ERROR);
        }
        return next;
      }),
    );
  }

  function handleConfirm() {
    navigate('/a', {
      state: {
        batchImportResult: {
          success: successCount,
          failed: failedRows.length,
        },
      },
      replace: true,
    });
  }

  function handleCancel() {
    navigate('/a');
  }

  return (
    <Box sx={{ flex: 1, bgcolor: theme.palette.dasGrey.grey06, minHeight: '100%' }}>
      <Box sx={{ p: 4, maxWidth: 1200, width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={handleCancel} aria-label="返回">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h3">批次匯入</Typography>
      </Box>

      {/* 上傳檔案 card */}
      <Paper sx={{ p: 3, mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5Bold" sx={{ display: 'block', mb: 0.5 }}>
              上傳檔案
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
              <InfoOutlinedIcon
                sx={{
                  fontSize: 14,
                  color: theme.palette.dasGrey.grey01,
                  mt: '3px',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: 13,
                  color: theme.palette.dasGrey.grey01,
                  minWidth: 0,
                }}
              >
                請參照系統範本，上傳對應格式的檔案（如您從其他系統匯出原始資料，請轉換對應欄位以利匯入）
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={(e) => e.preventDefault()}
            sx={{
              color: theme.palette.dasPrimary.primary,
              borderColor: theme.palette.dasPrimary.primary,
              textTransform: 'none',
              flexShrink: 0,
            }}
          >
            下載範本
          </Button>
        </Box>

        {/* Inner area: drop zone OR file row */}
        {fileName ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: 1.5,
              border: `1px solid ${theme.palette.dasGrey.grey04}`,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Inventory2OutlinedIcon
                sx={{
                  fontSize: 40,
                  color: theme.palette.dasGrey.grey02,
                }}
              />
              {!isParsing && (
                <CheckCircleIcon
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    fontSize: 18,
                    color: theme.palette.success.main,
                    bgcolor: '#fff',
                    borderRadius: '50%',
                  }}
                />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {fileName}
              </Typography>
              <Typography
                variant="footnote"
                sx={{
                  color: theme.palette.dasGrey.grey01,
                  mt: 0.25,
                  display: 'block',
                }}
              >
                {isParsing
                  ? '解析中⋯'
                  : `已上傳 ${total} 筆 / 全部共 ${total} 筆`}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<FileUploadOutlinedIcon />}
              onClick={handleReUpload}
              sx={{
                color: theme.palette.dasPrimary.primary,
                borderColor: theme.palette.dasPrimary.primary,
                textTransform: 'none',
                flexShrink: 0,
              }}
            >
              另選檔案
            </Button>
          </Box>
        ) : (
          <Box
            onClick={handlePickFile}
            sx={{
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: `1px dashed ${theme.palette.dasGrey.grey03}`,
              borderRadius: 1.5,
              bgcolor: '#fff',
              transition: 'all 0.15s',
              '&:hover': {
                borderColor: theme.palette.dasPrimary.primary,
                bgcolor: theme.palette.dasPrimary.lite03,
              },
            }}
          >
            <FileUploadOutlinedIcon
              sx={{
                fontSize: 40,
                color: theme.palette.dasPrimary.primary,
                mb: 1,
              }}
            />
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.dasPrimary.primary,
                fontWeight: 500,
              }}
            >
              點擊或拖拉上傳檔案
            </Typography>
            <Typography
              variant="footnote"
              sx={{ color: theme.palette.dasGrey.grey01, mt: 0.5 }}
            >
              xls, xlsx, csv · 上限 500 筆
            </Typography>
          </Box>
        )}
      </Paper>

      {/* 匯入圍籬 card */}
      {isParsed && (
        <Paper sx={{ p: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5Bold" sx={{ display: 'block', mb: 0.5 }}>
              匯入圍籬
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
              <InfoOutlinedIcon
                sx={{
                  fontSize: 14,
                  color: theme.palette.dasGrey.grey01,
                  mt: '3px',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: 13,
                  color: theme.palette.dasGrey.grey01,
                  lineHeight: 1.6,
                  minWidth: 0,
                }}
              >
                若為圓型圍籬，需填入中心點地址、半徑；若為多邊形圍籬，則需填入頂點地址序列（如：1.地址, 2.地址, 3.地址......）。送出後，系統將畫出對應的圍籬範圍。
              </Typography>
            </Box>
          </Box>

          {failedRows.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.25,
                px: 2,
                py: 1.5,
                borderRadius: 1,
                bgcolor: '#FFEDEA',
                border: `1px solid ${theme.palette.error.main}33`,
                mb: 2,
              }}
            >
              <ErrorOutlineIcon
                sx={{
                  color: theme.palette.error.main,
                  fontSize: 22,
                  flexShrink: 0,
                  mt: '2px',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.error.main,
                    mb: 0.5,
                  }}
                >
                  錯誤
                </Typography>
                {groupedErrors.map((g, i) => (
                  <Typography
                    key={i}
                    sx={{
                      fontSize: 13,
                      color: theme.palette.error.main,
                      lineHeight: 1.7,
                    }}
                  >
                    第 {g.rowNums.join(', ')} 列：{g.message}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {/* Datagrid */}
          <Box
            sx={{
              border: `1px solid ${theme.palette.dasGrey.grey04}`,
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 520,
              width: '100%',
            }}
          >
            <Table
              size="small"
              stickyHeader
              sx={{
                '& td, & th': {
                  borderRight: `1px solid ${theme.palette.dasGrey.grey04}`,
                },
                '& td:last-child, & th:last-child': {
                  borderRight: 'none',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <HeaderCell sx={{ width: 56 }} />
                  <HeaderCell sx={{ width: 64 }}>列</HeaderCell>
                  <HeaderCell sx={{ minWidth: 140 }}>
                    圍籬名稱<Asterisk />
                  </HeaderCell>
                  <HeaderCell sx={{ minWidth: 96 }}>
                    圍籬類型<Asterisk />
                  </HeaderCell>
                  <HeaderCell sx={{ minWidth: 200 }}>中心點地址</HeaderCell>
                  <HeaderCell sx={{ minWidth: 96 }}>半徑 (m)</HeaderCell>
                  <HeaderCell sx={{ minWidth: 360 }}>頂點地址</HeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const errorOutline = {
                    outline: `1px solid ${theme.palette.error.main}`,
                    outlineOffset: '-0.5px',
                  };
                  const editableCellSx = {
                    p: 0,
                    verticalAlign: 'middle',
                  };
                  return (
                    <TableRow
                      key={row.rowNum}
                      sx={{
                        '&:hover': { bgcolor: theme.palette.dasGrey.grey06 },
                      }}
                    >
                      <TableCell sx={{ py: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRow(row.rowNum)}
                          aria-label={`刪除第 ${row.rowNum} 列`}
                          sx={{ color: theme.palette.error.main }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          color: theme.palette.dasGrey.grey01,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {row.rowNum}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...editableCellSx,
                          ...(fieldHasError(row.errors, 'name')
                            ? errorOutline
                            : {}),
                        }}
                      >
                        <CellTextInput
                          value={row.name}
                          onChange={(v) =>
                            handleCellChange(row.rowNum, 'name', v)
                          }
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          ...editableCellSx,
                          ...(fieldHasError(row.errors, 'type')
                            ? errorOutline
                            : {}),
                        }}
                      >
                        <CellTypeSelect
                          value={row.type}
                          onChange={(v) =>
                            handleCellChange(row.rowNum, 'type', v)
                          }
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          ...editableCellSx,
                          ...(fieldHasError(row.errors, 'address')
                            ? errorOutline
                            : {}),
                        }}
                      >
                        <CellTextInput
                          value={row.address}
                          onChange={(v) =>
                            handleCellChange(row.rowNum, 'address', v)
                          }
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          ...editableCellSx,
                          ...(fieldHasError(row.errors, 'radius')
                            ? errorOutline
                            : {}),
                        }}
                      >
                        <CellTextInput
                          value={row.radius}
                          inputMode="numeric"
                          onChange={(v) =>
                            handleCellChange(row.rowNum, 'radius', v)
                          }
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          ...editableCellSx,
                          minWidth: 360,
                          maxWidth: 480,
                          ...(fieldHasError(row.errors, 'vertices')
                            ? errorOutline
                            : {}),
                        }}
                      >
                        <CellTextInput
                          value={row.vertices}
                          placeholder="地址1, 地址2, 地址3..."
                          onChange={(v) =>
                            handleCellChange(row.rowNum, 'vertices', v)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: theme.palette.dasGrey.grey01 }}
                      >
                        沒有可匯入的資料
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          mt: 3,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
        }}
      >
        <Button variant="outlined" color="secondary" onClick={handleCancel}>
          取消
        </Button>
        {isParsed && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirm}
            disabled={successCount === 0}
          >
            送出
          </Button>
        )}
      </Box>
      </Box>
    </Box>
  );
}

function HeaderCell({
  children,
  sx,
}: {
  children?: React.ReactNode;
  sx?: object;
}) {
  const theme = useTheme();
  return (
    <TableCell
      sx={{
        fontWeight: 500,
        whiteSpace: 'nowrap',
        bgcolor: theme.palette.dasGrey.grey06,
        ...sx,
      }}
    >
      {children}
    </TableCell>
  );
}

function Asterisk() {
  const theme = useTheme();
  return (
    <span style={{ color: theme.palette.dasPrimary.primary }}> *</span>
  );
}

function CellTextInput({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
}) {
  return (
    <InputBase
      fullWidth
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ inputMode: inputMode ?? 'text' }}
      sx={{
        px: 1.5,
        py: 1,
        fontSize: 14,
        '& input': { p: 0 },
        '&.Mui-focused': {
          bgcolor: '#fff',
        },
      }}
    />
  );
}

function CellTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      variant="standard"
      disableUnderline
      displayEmpty
      fullWidth
      sx={{
        fontSize: 14,
        '& .MuiSelect-select': {
          px: 1.5,
          py: 1,
          minHeight: 'unset',
        },
      }}
    >
      <MenuItem value="">
        <span style={{ opacity: 0.4 }}>—</span>
      </MenuItem>
      <MenuItem value="圓形">圓形</MenuItem>
      <MenuItem value="多邊形">多邊形</MenuItem>
    </Select>
  );
}
