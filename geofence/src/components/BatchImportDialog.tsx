import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Typography,
  useTheme,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';

export default function BatchImportDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (count: number) => void;
}) {
  const theme = useTheme();
  const [fileName, setFileName] = useState<string | null>(null);
  const [template, setTemplate] = useState<'default'>('default');

  function handlePickFile() {
    // stub：假裝挑了一個檔案
    setFileName('geofences_2026_Q2.csv');
  }

  function handleImport() {
    // stub：固定匯入 15 筆
    onImport(15);
    setFileName(null);
  }

  function handleClose() {
    setFileName(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5Bold">批次匯入</Typography>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ bgcolor: theme.palette.dasGrey.grey06, p: 2.5 }}
      >
        {/* 匯入圍籬 — 模板選擇 + 下載範本 */}
        <Paper
          sx={{
            p: 2.5,
            mb: 2,
            borderRadius: 2,
            boxShadow: '0px 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              sx={{
                fontWeight: 500,
                color: theme.palette.dasDark.dark01,
                minWidth: 80,
                flexShrink: 0,
              }}
            >
              匯入圍籬
            </Typography>
            <Select
              size="small"
              value={template}
              onChange={(e) => setTemplate(e.target.value as 'default')}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="default">使用系統範本</MenuItem>
            </Select>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={(e) => {
                e.preventDefault();
                // stub：假裝下載範本
              }}
              sx={{
                color: theme.palette.dasPrimary.primary,
                borderColor: theme.palette.dasPrimary.primary,
                textTransform: 'none',
              }}
            >
              下載範本
            </Button>
          </Box>
        </Paper>

        {/* 檔案上傳 */}
        <Paper
          sx={{
            p: 2.5,
            borderRadius: 2,
            boxShadow: '0px 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <Typography
            variant="headline"
            sx={{
              display: 'block',
              color: theme.palette.dasDark.dark01,
              fontWeight: 500,
              mb: 1,
            }}
          >
            檔案 <span style={{ color: theme.palette.dasPrimary.primary }}>*</span>
          </Typography>
          <Box
            onClick={handlePickFile}
            sx={{
              minHeight: 240,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: `1px dashed ${
                fileName
                  ? theme.palette.dasPrimary.primary
                  : theme.palette.dasGrey.grey03
              }`,
              borderRadius: 1.5,
              bgcolor: fileName
                ? theme.palette.dasPrimary.lite03
                : '#fff',
              transition: 'all 0.15s',
              '&:hover': {
                borderColor: theme.palette.dasPrimary.primary,
                bgcolor: theme.palette.dasPrimary.lite03,
              },
            }}
          >
            {fileName ? (
              <>
                <UploadFileOutlinedIcon
                  sx={{
                    fontSize: 36,
                    color: theme.palette.dasPrimary.primary,
                    mb: 1,
                  }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.dasPrimary.primary,
                  }}
                >
                  {fileName}
                </Typography>
                <Typography
                  variant="footnote"
                  sx={{
                    color: theme.palette.dasGrey.grey01,
                    mt: 0.5,
                  }}
                >
                  檢測到 15 筆可匯入的圍籬 · 點擊重新選擇
                </Typography>
              </>
            ) : (
              <>
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
                  sx={{
                    color: theme.palette.dasGrey.grey01,
                    mt: 0.5,
                  }}
                >
                  xls, xlsx, csv
                </Typography>
              </>
            )}
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="secondary">
          取消
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          color="primary"
          disabled={!fileName}
        >
          送出
        </Button>
      </DialogActions>
    </Dialog>
  );
}
