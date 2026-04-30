import { Box, Typography, Paper, Button, useTheme, Chip } from '@mui/material';
import { Link } from 'react-router-dom';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import TabOutlinedIcon from '@mui/icons-material/TabOutlined';

function Card({
  icon,
  title,
  subtitle,
  description,
  chips,
  to,
  recommended,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  chips: string[];
  to: string;
  recommended?: boolean;
}) {
  const theme = useTheme();
  return (
    <Paper
      sx={{
        p: 3.5,
        borderRadius: 2,
        boxShadow: '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        border: recommended ? `2px solid ${theme.palette.dasPrimary.primary}` : undefined,
        position: 'relative',
      }}
    >
      {recommended && (
        <Chip
          label="推薦"
          size="small"
          sx={{
            position: 'absolute',
            top: -10,
            right: 16,
            bgcolor: theme.palette.dasPrimary.primary,
            color: '#fff',
            fontWeight: 600,
          }}
        />
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1,
            bgcolor: theme.palette.dasPrimary.lite03,
            color: theme.palette.dasPrimary.dark01,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h5Bold">{title}</Typography>
          <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body1">{description}</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {chips.map((c) => (
          <Chip key={c} label={c} size="small" variant="outlined" />
        ))}
      </Box>
      <Box sx={{ flex: 1 }} />
      <Button component={Link} to={to} variant="contained" color="primary" sx={{ alignSelf: 'flex-start', px: 3 }}>
        進入 {title}
      </Button>
    </Paper>
  );
}

export default function Landing() {
  const theme = useTheme();
  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        DAAS-7358 · 電子圍籬（圓型）探索
      </Typography>
      <Typography variant="body1" sx={{ color: theme.palette.dasGrey.grey01, mb: 4 }}>
        兩個方向的感受探索。收斂後採 <b>方案 A（地圖為主）</b>。
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 4 }}>
        <Card
          icon={<MapOutlinedIcon />}
          title="方案 A"
          subtitle="地圖為主"
          description="地圖是主舞台，左側抽屜負責列表 / 詳情 / 表單。新增時在地圖上點擊設中心，拖圓邊 handle 即時脹縮半徑；多邊形則是點擊累加座標。編輯、監控設定都在地圖上操作，不跳 modal。"
          chips={['地圖直接繪製', '半徑 handle 拖拉', '空間關係可見']}
          to="/a"
          recommended
        />
        <Card
          icon={<TabOutlinedIcon />}
          title="方案 B"
          subtitle="表格 + 三分頁"
          description="治理盤點導向。頂部三個 tab：圍籬總覽 / 事件歷程 / 監控設定。主畫面是可排序表格 + 可收合的地圖預覽，新增 / 編輯 / 查看都用 modal。事件歷程獨立成一頁，方便追溯異常。"
          chips={['全欄位排序', '事件獨立 tab', '地圖預覽可收合']}
          to="/b"
        />
      </Box>

      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: theme.palette.dasPrimary.lite03,
          border: `1px solid ${theme.palette.dasPrimary.lite04}`,
          boxShadow: 'none',
        }}
      >
        <Typography variant="headline" sx={{ display: 'block', mb: 1.5 }}>
          為什麼選方案 A？
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 3, '& li': { mb: 1 } }}>
          <li>
            <Typography variant="body1">
              <b>空間關係優先</b> — 電子圍籬本質上是空間物件,OP 最常問「有沒有重疊 / 有沒有漏」。地圖為主舞台,一眼能答;表格型(B)要反覆切換 tab 才能看出關係。
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              <b>新增 / 編輯的直接感</b> — 圓形在地圖上拖 handle 即時脹縮半徑,多邊形可輸入地址 Enter 加入或直接點擊加座標,減少「表單→預覽→修改」的斷裂感。
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              <b>低頻設定不打擾主流程</b> — 監控設定、匯出事件紀錄整合在地圖右上 pill toolbar,當「系統狀態摘要 + 偶爾要用的入口」,不佔主版面。
            </Typography>
          </li>
        </Box>
      </Paper>
    </Box>
  );
}
