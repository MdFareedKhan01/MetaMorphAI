import { createTheme } from '@mui/material/styles';

const font = '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';

export const theme = createTheme({
  cssVariables: false,
  palette: {
    mode: 'light',
    primary: { main: '#0f766e', dark: '#115e59', light: '#5eead4', contrastText: '#ffffff' },
    secondary: { main: '#334155' },
    success: { main: '#047857' },
    warning: { main: '#b45309' },
    error: { main: '#b91c1c' },
    info: { main: '#0369a1' },
    background: { default: '#f6f8f9', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
    divider: '#e2e8f0',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: font,
    h1: { fontSize: '2rem', fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.2 },
    h2: { fontSize: '1.5rem', fontWeight: 650, letterSpacing: '-0.015em' },
    h3: { fontSize: '1.125rem', fontWeight: 650 },
    h4: { fontSize: '1rem', fontWeight: 650 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 10, minHeight: 40 } } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiTextField: { defaultProps: { size: 'medium', fullWidth: true } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});
