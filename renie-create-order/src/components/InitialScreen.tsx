import { Box, Typography, useTheme } from '@mui/material';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import PaperPlaneLogo from './PaperPlaneLogo';
import SuggestionCard from './SuggestionCard';
import { findSkillById, getInitialSuggestions } from '../skills/registry';
import { CREATE_ORDER_DEMO_SHORTCUTS } from '../skills/createOrder';

type Props = {
  userName: string;
  onPickSuggestion: (
    skillId: string,
    promptText: string,
    autoSend: boolean,
  ) => void;
};

export default function InitialScreen({ userName, onPickSuggestion }: Props) {
  const theme = useTheme();
  const suggestions = getInitialSuggestions();
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        py: 6,
      }}
    >
      <PaperPlaneLogo size={88} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={{ color: theme.palette.dasDark.dark01 }}>
          嗨👋,{userName}
        </Typography>
        <Typography
          variant="h4"
          sx={{ color: theme.palette.dasDark.dark01, mt: 0.5 }}
        >
          今天有什麼需要協助的嗎?
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        {suggestions.map((s) => {
          const skill = findSkillById(s.skillId);
          return (
            <SuggestionCard
              key={s.skillId + ':' + s.prompt.text}
              text={s.prompt.text}
              Icon={skill?.icon}
              highlight={s.highlight}
              onClick={() =>
                onPickSuggestion(
                  s.skillId,
                  s.prompt.payload ?? s.prompt.text,
                  s.prompt.autoSend ?? false,
                )
              }
            />
          );
        })}
      </Box>

      <Box
        sx={{
          mt: 2,
          width: 520,
          borderTop: `1px dashed ${theme.palette.dasGrey.grey04}`,
          pt: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mb: 1,
            color: theme.palette.dasGrey.grey01,
          }}
        >
          <ScienceOutlinedIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Demo 快捷(僅供測試)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {CREATE_ORDER_DEMO_SHORTCUTS.map((s) => (
            <Box
              key={s.id}
              role="button"
              title={s.description}
              onClick={() => onPickSuggestion('create-order', s.payload, true)}
              sx={{
                px: 1.25,
                height: 28,
                borderRadius: '999px',
                border: `1px dashed ${theme.palette.dasGrey.grey03}`,
                bgcolor: '#FFFFFF',
                color: theme.palette.dasDark.dark03,
                fontSize: 12,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: theme.palette.dasPrimary.primary,
                  color: theme.palette.dasPrimary.primary,
                  bgcolor: theme.palette.dasPrimary.lite03,
                },
              }}
            >
              {s.label}
            </Box>
          ))}
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{ color: theme.palette.dasGrey.grey02, mt: 1 }}
      >
        目前提供 {suggestions.length} 項技能,更多功能持續擴充中
      </Typography>
    </Box>
  );
}
