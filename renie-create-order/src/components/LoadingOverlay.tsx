import { Box } from '@mui/material';
import Lottie from 'lottie-react';
import loadingAnimation from '../assets/loading-airplane.json';

type Props = {
  /** 控制顯示 / 隱藏 — 顯示時會用半透明灰罩蓋住底下內容,中間是紙飛機 lottie */
  show: boolean;
};

/**
 * Artifact 區塊的 loading 覆蓋層 — 在 ai 批改 / 新增 commit 期間顯示。
 * 半透明灰底吃掉互動,中央放白色圓底紙飛機動畫。
 */
export default function LoadingOverlay({ show }: Props) {
  if (!show) return null;
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        bgcolor: 'rgba(94, 102, 115, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'wait',
      }}
    >
      <Box
        sx={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          bgcolor: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Lottie
          animationData={loadingAnimation}
          loop
          autoplay
          // 原始 Lottie 前半部 layers 還沒進場(空白幀),這裡跳到動畫內容開始的位置
          initialSegment={[40, 102]}
          style={{ width: 88, height: 88 }}
        />
      </Box>
    </Box>
  );
}
