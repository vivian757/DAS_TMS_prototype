import { useState } from 'react';
import { Box, Button, useTheme } from '@mui/material';

export const APPLY_BATCH_EVENT = 'renie:apply-batch-update';
export const DISCARD_BATCH_EVENT = 'renie:discard-batch-update';

export type BatchUpdateEventDetail = { batchId: string };

type Props = {
  batchId: string;
};

/**
 * 對話泡內的批改確認卡 — 由 continueSession 在偵測到批改指令時返回。
 * 點擊「套用 / 不套用」會發 window event 給 OrderArtifact 寫入或撤銷 pendingBatchUpdate。
 * 點過後本地 state 鎖住,避免歷史訊息再次觸發。
 */
export default function BatchUpdateConfirmCard({ batchId }: Props) {
  const theme = useTheme();
  const [decided, setDecided] = useState<'apply' | 'discard' | null>(null);

  const dispatch = (eventName: string) => {
    window.dispatchEvent(
      new CustomEvent<BatchUpdateEventDetail>(eventName, {
        detail: { batchId },
      }),
    );
  };

  const handleApply = () => {
    setDecided('apply');
    dispatch(APPLY_BATCH_EVENT);
  };

  const handleDiscard = () => {
    setDecided('discard');
    dispatch(DISCARD_BATCH_EVENT);
  };

  // 點擊「套用」後不再顯示確認框 — AI 會在 chat 補一句「修正完成!...」取代
  if (decided === 'apply') return null;

  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.dasGrey.grey04}`,
        borderRadius: 2,
        bgcolor: '#FFFFFF',
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          fontSize: 16,
          fontWeight: 700,
          color: theme.palette.dasDark.dark01,
        }}
      >
        {decided === 'discard' ? '已取消變更' : '確認套用變更?'}
      </Box>
      {decided === null && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDiscard}
            sx={{
              minWidth: 80,
              color: theme.palette.dasDark.dark02,
              borderColor: theme.palette.dasGrey.grey03,
              '&:hover': {
                borderColor: theme.palette.dasGrey.grey02,
                bgcolor: theme.palette.dasGrey.grey06,
              },
            }}
          >
            不套用
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleApply}
            sx={{ minWidth: 80 }}
          >
            套用
          </Button>
        </Box>
      )}
    </Box>
  );
}
