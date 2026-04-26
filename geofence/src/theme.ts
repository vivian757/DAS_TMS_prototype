import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    dasPrimary: {
      primary: string;
      dark01: string;
      dark02: string;
      lite01: string;
      lite02: string;
      lite03: string;
      lite04: string;
    };
    dasDark: {
      black: string;
      dark01: string;
      dark02: string;
      dark03: string;
    };
    dasGrey: {
      grey01: string;
      grey02: string;
      grey03: string;
      grey04: string;
      grey05: string;
      grey06: string;
    };
    dasOrange: { main: string; dark01: string; lite01: string };
    dasRed: { main: string; dark01: string; dark02: string; lite01: string };
    dasGreen: { main: string; dark02: string; dark03: string; lite01: string };
  }
  interface PaletteOptions {
    dasPrimary?: Palette['dasPrimary'];
    dasDark?: Palette['dasDark'];
    dasGrey?: Palette['dasGrey'];
    dasOrange?: Palette['dasOrange'];
    dasRed?: Palette['dasRed'];
    dasGreen?: Palette['dasGreen'];
  }
  interface TypographyVariants {
    headline: React.CSSProperties;
    h5Bold: React.CSSProperties;
    footnote: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    headline?: React.CSSProperties;
    h5Bold?: React.CSSProperties;
    footnote?: React.CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    headline: true;
    h5Bold: true;
    footnote: true;
  }
}

export const shadows = {
  '01dp':
    '0px 1px 1px rgba(0,0,0,0.14), 0px 2px 1px rgba(0,0,0,0.12), 0px 1px 3px rgba(0,0,0,0.20)',
  '02dp':
    '0px 2px 2px rgba(0,0,0,0.14), 0px 3px 1px rgba(0,0,0,0.12), 0px 1px 5px rgba(0,0,0,0.20)',
  '06dp':
    '0px 6px 10px rgba(0,0,0,0.14), 0px 1px 18px rgba(0,0,0,0.12), 0px 3px 5px rgba(0,0,0,0.20)',
  '08dp':
    '0px 8px 10px rgba(0,0,0,0.14), 0px 3px 14px rgba(0,0,0,0.12), 0px 5px 5px rgba(0,0,0,0.20)',
  buttonBlue: '0px 4px 4px rgba(39,170,225,0.20)',
};

export const theme = createTheme({
  palette: {
    primary: { main: '#27AAE1', contrastText: '#FFFFFF' },
    secondary: { main: '#454749' },
    error: { main: '#DE3730' },
    warning: { main: '#E36D0D' },
    success: { main: '#21825e' },
    background: { default: '#F0F1F3', paper: '#FFFFFF' },
    text: { primary: '#191C1E', secondary: '#5C5F61' },
    dasPrimary: {
      primary: '#27AAE1',
      dark01: '#00658F',
      dark02: '#208FBE',
      lite01: '#56CBFC',
      lite02: '#CEF1FF',
      lite03: '#EAF9FF',
      lite04: '#BEE5F5',
    },
    dasDark: {
      black: '#000000',
      dark01: '#191C1E',
      dark02: '#454749',
      dark03: '#5C5F61',
    },
    dasGrey: {
      grey01: '#8F9193',
      grey02: '#AAABAE',
      grey03: '#C5C6C9',
      grey04: '#E1E2E5',
      grey05: '#F0F1F3',
      grey06: '#FBFCFF',
    },
    dasOrange: { main: '#E36D0D', dark01: '#CC620C', lite01: '#FFF0DC' },
    dasRed: { main: '#DE3730', dark01: '#BA1A1A', dark02: '#93000A', lite01: '#FFEDEA' },
    dasGreen: { main: '#7CB342', dark02: '#21825e', dark03: '#1f7a59', lite01: '#eaf6f1' },
  },
  typography: {
    fontFamily: '"Noto Sans", sans-serif',
    h1: { fontSize: 32, fontWeight: 500 },
    h2: { fontSize: 28, fontWeight: 500 },
    h3: { fontSize: 24, fontWeight: 500 },
    h4: { fontSize: 20, fontWeight: 500 },
    h5: { fontSize: 16, fontWeight: 400 },
    h5Bold: { fontSize: 16, fontWeight: 600 },
    headline: { fontSize: 14, fontWeight: 600 },
    body1: { fontSize: 14, fontWeight: 400 },
    body2: { fontSize: 13, fontWeight: 400 },
    footnote: { fontSize: 12, fontWeight: 400 },
    caption: { fontSize: 10, fontWeight: 400 },
    button: { fontSize: 14, fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { height: 36, borderRadius: 8, boxShadow: 'none', textTransform: 'none' },
        containedPrimary: { boxShadow: '0px 4px 4px rgba(39,170,225,0.20)' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': { borderColor: '#C5C6C9' },
          '&:hover fieldset': { borderColor: '#8F9193' },
        },
        input: { padding: '8px 12px', fontSize: 14, height: 20 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E1E2E5',
          fontSize: 14,
          padding: '12px 16px',
        },
        head: {
          fontWeight: 600,
          color: '#8F9193',
          backgroundColor: '#FBFCFF',
        },
      },
    },
  },
});
