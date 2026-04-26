import { Box, Typography, useTheme, Chip } from '@mui/material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';

const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 64;

function SidebarItem({
  to,
  icon,
  label,
  sublabel,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <NavLink to={to} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Box
          sx={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            mx: 1,
            my: 0.25,
            borderRadius: 1,
            color: isActive ? '#FFFFFF' : '#191C1E',
            bgcolor: isActive ? '#27AAE1' : 'transparent',
            '&:hover': { bgcolor: isActive ? '#27AAE1' : '#EAF9FF' },
            cursor: 'pointer',
            transition: 'background-color 120ms',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: 'inherit' }}>
              {label}
            </Typography>
            {sublabel && (
              <Typography variant="caption" sx={{ color: isActive ? '#EAF9FF' : '#8F9193' }}>
                {sublabel}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </NavLink>
  );
}

export default function AppShell() {
  const theme = useTheme();
  const { pathname } = useLocation();

  const pageTitle =
    pathname === '/a'
      ? '方案 A · 地圖為主'
      : pathname === '/b'
        ? '方案 B · 表格 + 地圖並陳'
        : '電子圍籬探索';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F0F1F3' }}>
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          bgcolor: '#FFFFFF',
          borderRight: `1px solid ${theme.palette.dasGrey.grey04}`,
          position: 'fixed',
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            height: HEADER_HEIGHT,
            px: 3,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
          }}
        >
          <Typography variant="h5Bold" sx={{ color: theme.palette.dasPrimary.primary }}>
            TMS
          </Typography>
          <Typography variant="caption" sx={{ ml: 1, color: theme.palette.dasGrey.grey01 }}>
            prototype
          </Typography>
        </Box>
        <Box sx={{ py: 1.5 }}>
          <Typography
            variant="footnote"
            sx={{ display: 'block', color: theme.palette.dasGrey.grey01, pl: 3, pb: 0.5, pt: 0.5 }}
          >
            DAAS-7358 探索
          </Typography>
          <SidebarItem to="/" icon={<HomeOutlinedIcon sx={{ fontSize: 20 }} />} label="首頁" sublabel="Landing" />
          <SidebarItem
            to="/a"
            icon={<MapOutlinedIcon sx={{ fontSize: 20 }} />}
            label="方案 A"
            sublabel="地圖為主"
          />
          <SidebarItem
            to="/b"
            icon={<ViewSidebarOutlinedIcon sx={{ fontSize: 20 }} />}
            label="方案 B"
            sublabel="表格 + 地圖並陳"
          />
        </Box>
        <Box sx={{ mt: 'auto', p: 2 }}>
          <Typography variant="caption" sx={{ color: theme.palette.dasGrey.grey01 }}>
            Prototype v0.1 · 2026-04-22
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, ml: `${SIDEBAR_WIDTH}px`, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            height: HEADER_HEIGHT,
            bgcolor: '#FFFFFF',
            px: 4,
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
            position: 'sticky',
            top: 0,
            zIndex: 1100,
          }}
        >
          <Typography variant="h3" sx={{ color: theme.palette.dasDark.dark01 }}>
            電子圍籬
          </Typography>
          <Chip
            label={pageTitle}
            size="small"
            sx={{
              ml: 2,
              bgcolor: theme.palette.dasPrimary.lite03,
              color: theme.palette.dasPrimary.dark01,
              fontWeight: 600,
              fontSize: 12,
            }}
          />
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
            vivian@3drens.com
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
