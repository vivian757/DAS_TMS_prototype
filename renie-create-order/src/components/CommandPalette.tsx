import { Box, Popover, Typography, useTheme } from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import { SHADOWS } from '../theme';
import { getSkillsByCategory } from '../skills/registry';
import { SAVED_PROMPTS } from '../savedPrompts';

type PickEntry = (
  skillId: string,
  promptText: string,
  autoSend: boolean,
) => void;

type Props = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  /** 點任何一個 entry(skill 或 saved prompt)後的 callback */
  onPick: PickEntry;
};

export default function CommandPalette({
  anchorEl,
  open,
  onClose,
  onPick,
}: Props) {
  const theme = useTheme();
  const groups = getSkillsByCategory();

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            mt: -1,
            width: 400,
            borderRadius: 2,
            boxShadow: SHADOWS.dp08,
            border: `1px solid ${theme.palette.dasGrey.grey04}`,
            maxHeight: 520,
            overflowY: 'auto',
          },
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
          bgcolor: theme.palette.dasGrey.grey06,
        }}
      >
        <Typography
          variant="h5Bold"
          sx={{ color: theme.palette.dasDark.dark01 }}
        >
          指令
        </Typography>
      </Box>

      <Box sx={{ py: 1 }}>
        {/* ── Renie 技能 ───────────────────────────── */}
        <SectionHeader label="Renie 技能" />
        {groups.map((group) => (
          <Box key={group.category}>
            <SubgroupHeader label={group.label} />
            {group.skills.map((skill) => {
              const Icon = skill.icon;
              const prompt = skill.suggestedPrompts[0];
              if (!prompt) return null;
              return (
                <EntryRow
                  key={skill.id}
                  IconNode={<Icon sx={{ fontSize: 18 }} />}
                  iconBg={theme.palette.dasPrimary.lite03}
                  iconColor={theme.palette.dasPrimary.primary}
                  title={skill.name}
                  onClick={() => {
                    onPick(
                      skill.id,
                      prompt.payload ?? prompt.text,
                      prompt.autoSend ?? false,
                    );
                    onClose();
                  }}
                />
              );
            })}
          </Box>
        ))}

        {/* ── 我的常用指令 ──────────────────────── */}
        <SectionHeader label="我的常用指令" sx={{ mt: 1.5 }} />
        {SAVED_PROMPTS.map((sp) => (
          <EntryRow
            key={sp.id}
            IconNode={<BookmarkBorderIcon sx={{ fontSize: 18 }} />}
            iconBg={theme.palette.dasGrey.grey05}
            iconColor={theme.palette.dasDark.dark03}
            title={sp.text}
            description={truncate(sp.payload, 50)}
            onClick={() => {
              onPick('saved-prompt', sp.payload, sp.autoSend ?? false);
              onClose();
            }}
          />
        ))}
        <Box
          role="button"
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            color: theme.palette.dasGrey.grey01,
            '&:hover': {
              bgcolor: theme.palette.dasPrimary.lite03,
              color: theme.palette.dasPrimary.primary,
            },
          }}
        >
          <AddOutlinedIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2">新增常用指令</Typography>
        </Box>
      </Box>
    </Popover>
  );
}

function SectionHeader({
  label,
  sx,
}: {
  label: string;
  sx?: Record<string, unknown>;
}) {
  const theme = useTheme();
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        px: 2,
        pt: 0.5,
        pb: 0.25,
        color: theme.palette.dasDark.dark02,
        fontWeight: 700,
        letterSpacing: 0.5,
        ...(sx ?? {}),
      }}
    >
      {label}
    </Typography>
  );
}

function SubgroupHeader({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        px: 2,
        pt: 0.5,
        pb: 0.25,
        color: theme.palette.dasGrey.grey01,
        fontWeight: 600,
      }}
    >
      {label}
    </Typography>
  );
}

function EntryRow({
  IconNode,
  iconBg,
  iconColor,
  title,
  description,
  onClick,
}: {
  IconNode: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  const theme = useTheme();
  return (
    <Box
      role="button"
      onClick={onClick}
      sx={{
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        cursor: 'pointer',
        transition: 'background 0.1s',
        '&:hover': { bgcolor: theme.palette.dasPrimary.lite03 },
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          bgcolor: iconBg,
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {IconNode}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="headline"
          sx={{ color: theme.palette.dasDark.dark01, display: 'block' }}
        >
          {title}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.dasDark.dark03,
              display: 'block',
              mt: 0.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function truncate(text: string, maxChars: number): string {
  const firstLine = text.split('\n')[0];
  if (firstLine.length <= maxChars) return firstLine;
  return firstLine.slice(0, maxChars) + '…';
}
