import { Box } from '@mui/material';

type Props = { size?: number };

export default function PaperPlaneLogo({ size = 80 }: Props) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="paperPlaneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#56CBFC" />
            <stop offset="55%" stopColor="#27AAE1" />
            <stop offset="100%" stopColor="#00658F" />
          </linearGradient>
        </defs>
        <path
          d="M58 6 6 24l20 6 4 22 8-12 14 12 6-46z"
          fill="url(#paperPlaneGradient)"
        />
        <path d="M26 30 58 6 30 38z" fill="#0E4F73" fillOpacity="0.35" />
        <path d="M30 38l8-12-2 18z" fill="#FFFFFF" fillOpacity="0.5" />
      </svg>
    </Box>
  );
}
