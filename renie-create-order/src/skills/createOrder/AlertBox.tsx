import { Box, useTheme } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// 跟 OrderTable 共用的 event name — 點列號 → table 內對應 row 閃藍框
const HIGHLIGHT_EVENT = 'renie:highlight-order-row';

function highlightRow(row: number) {
  window.dispatchEvent(
    new CustomEvent(HIGHLIGHT_EVENT, { detail: { row } }),
  );
}

export type AlertItem = {
  /** 受影響的列編號(1-based);若不需指向特定列可省略 */
  rows?: number[];
  /**
   * 同一列下可能有多條訊息(例「客戶為必填」+「貨品名稱最多 512 字元」)
   * 在顯示上會做 hanging indent,第 1 條跟列號同行,其後縮排。
   */
  messages: string[];
};

type Props = {
  type: 'error' | 'reminder';
  items: AlertItem[];
};

/**
 * Renie 對話泡中的分類提示框:
 * - error  → 「待修正」紅色,代表需要修正才能送出的問題(缺必填、客戶不在系統等)
 * - reminder → 「提醒」藍色,代表非強制但建議補上的內容(寄件人地址等)
 */
export default function AlertBox({ type, items }: Props) {
  const theme = useTheme();
  const isError = type === 'error';

  const colors = isError
    ? {
        bg: theme.palette.dasRed.lite01,
        border: 'transparent',
        title: theme.palette.dasRed.dark01,
        rowLink: theme.palette.dasRed.dark01,
      }
    : {
        bg: '#EAF9FF',
        border: theme.palette.dasPrimary.lite02,
        title: theme.palette.dasPrimary.dark01,
        rowLink: theme.palette.dasPrimary.primary,
      };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.25,
        px: 1.75,
        py: 1.25,
        borderRadius: 2,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.bg,
        mt: 1.5,
      }}
    >
      <Box sx={{ flexShrink: 0, color: colors.title, mt: '2px' }}>
        {isError ? (
          <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />
        ) : (
          <InfoOutlinedIcon sx={{ fontSize: 18 }} />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            color: colors.title,
            fontSize: 13,
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          {isError ? '待修正' : '提醒'}
        </Box>
        <Box
          sx={{
            color: theme.palette.dasDark.dark01,
            fontSize: 13,
            lineHeight: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {items.map((it, i) => {
            const rowLabel =
              it.rows && it.rows.length > 0 ? (
                <Box component="span" sx={{ fontWeight: 500, flexShrink: 0 }}>
                  第{' '}
                  {it.rows.map((r, ri) => (
                    <Box key={ri} component="span">
                      <Box
                        component="span"
                        role="button"
                        onClick={() => highlightRow(r)}
                        sx={{
                          color: colors.rowLink,
                          textDecoration: 'underline',
                          textUnderlineOffset: 2,
                          fontWeight: 500,
                          mx: 0.25,
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.7 },
                        }}
                      >
                        {r}
                      </Box>
                      {ri < it.rows!.length - 1 && (
                        <Box component="span">,</Box>
                      )}
                    </Box>
                  ))}{' '}
                  列:
                </Box>
              ) : null;

            return (
              <Box
                key={i}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: rowLabel ? 'auto 1fr' : '1fr',
                  columnGap: 0.5,
                  alignItems: 'baseline',
                }}
              >
                {rowLabel}
                <Box>
                  {it.messages.map((m, mi) => (
                    <Box key={mi}>{m}</Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
