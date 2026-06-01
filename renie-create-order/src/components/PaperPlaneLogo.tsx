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
        width={size}
        height={size}
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M65.3676 4.1056C66.9312 3.58472 68.4159 5.07933 67.893 6.64759L47.8872 66.63C47.2599 68.5106 44.585 68.4361 44.063 66.5236L37.7465 43.3683L42.5844 33.3507L44.1723 30.6349C44.706 29.7223 45.8578 29.3825 46.8012 29.8595L53.1333 33.0607C53.9775 33.4874 54.8875 32.6121 54.4936 31.7521L51.8491 25.9826C51.6764 25.6059 51.6766 25.1723 51.8501 24.796L54.5815 18.8742C54.9708 18.0302 54.0993 17.1579 53.2553 17.547L47.3335 20.2784C46.9572 20.452 46.5236 20.4529 46.1469 20.2804L40.3588 17.6271C39.5008 17.2344 38.626 18.1404 39.0483 18.9845L42.5962 26.0743C42.835 26.5518 42.6876 27.1323 42.2505 27.4386C39.8911 29.0908 37.4029 30.5515 34.81 31.8058L29.3598 34.4415L5.47604 27.9347C3.56447 27.4139 3.4898 24.7193 5.36959 24.0929L65.3676 4.1056Z"
          fill="url(#paint0_linear_2214_35819)"
        />
        <defs>
          <linearGradient
            id="paint0_linear_2214_35819"
            x1="24.8837"
            y1="49.6728"
            x2="68.7872"
            y2="7.37385"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#00658F" />
            <stop offset="0.66" stopColor="#57CDFF" />
            <stop offset="1" stopColor="#29E7C7" />
          </linearGradient>
        </defs>
      </svg>
    </Box>
  );
}
