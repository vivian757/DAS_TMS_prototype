import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadFileOutlinedIcon sx={{ color: theme.palette.dasPrimary.primary }} />
          <Typography variant="h5Bold">批次匯入圍籬</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.dasGrey.grey01, mb: 2 }}
        >
          支援 CSV 格式。欄位需包含：名稱、類型（圓形 / 多邊形）、地址或經緯度、半徑（圓形）或頂點座標（多邊形）、備註（可選）。
        </Typography>

        <Paper
          variant="outlined"
          onClick={handlePickFile}
          sx={{
            p: 4,
            mb: 2,
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: fileName
              ? theme.palette.dasPrimary.primary
              : theme.palette.dasGrey.grey03,
            bgcolor: fileName
              ? theme.palette.dasPrimary.lite03
              : theme.palette.dasGrey.grey06,
            textAlign: 'center',
            transition: 'all 0.15s',
            '&:hover': {
              borderColor: theme.palette.dasPrimary.primary,
              bgcolor: theme.palette.dasPrimary.lite03,
            },
          }}
        >
          <UploadFileOutlinedIcon
            sx={{
              fontSize: 40,
              color: fileName
                ? theme.palette.dasPrimary.primary
                : theme.palette.dasGrey.grey02,
              mb: 1,
            }}
          />
          {fileName ? (
            <>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {fileName}
              </Typography>
              <Typography
                variant="footnote"
                sx={{ color: theme.palette.dasGrey.grey01, mt: 0.5, display: 'block' }}
              >
                檢測到 15 筆可匯入的圍籬 · 點擊重新選擇
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                點擊或拖曳 CSV 檔案到此處
              </Typography>
              <Typography
                variant="footnote"
                sx={{ color: theme.palette.dasGrey.grey01, mt: 0.5, display: 'block' }}
              >
                單次上限 500 筆 · 檔案大小 &lt; 5MB
              </Typography>
            </>
          )}
        </Paper>

        <Link
          href="#"
          underline="hover"
          onClick={(e) => e.preventDefault()}
          sx={{
            fontSize: 13,
            color: theme.palette.dasPrimary.primary,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
          下載 CSV 範本
        </Link>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="secondary">
          取消
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          color="primary"
          disabled={!fileName}
        >
          匯入
        </Button>
      </DialogActions>
    </Dialog>
  );
}
