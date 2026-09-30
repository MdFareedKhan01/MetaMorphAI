import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { CssBaseline, GlobalStyles, StyledEngineProvider, ThemeProvider } from '@mui/material';
import './index.css';
import { theme } from './theme';
import { NotifyProvider } from './notify';
import { Guard, SessionWatcher } from './session';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Ingest from './pages/Ingest';
import Confirm from './pages/Confirm';
import Workspace from './pages/Workspace';
import Gallery from './pages/Gallery';
import AppShell from './components/AppShell';
import { ErrorState, Page, EmptyState } from './components/ui';
import { Button } from '@mui/material';

function RouteError() {
  const err = useRouteError();
  const message = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : 'Unexpected error';
  return <Page><ErrorState title="This page crashed" message={message} onRetry={() => location.reload()} retryLabel="Reload" /></Page>;
}
const NotFound = () => (
  <Page><EmptyState title="Page not found" body="That address does not exist."
    action={<Button component={Link} to="/" variant="contained">Go to New source</Button>} /></Page>
);

const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/', element: <Guard><Ingest /></Guard> },
      { path: '/sources/:id', element: <Guard><Confirm /></Guard> },
      { path: '/batches/:id', element: <Guard><Workspace /></Guard> },
      { path: '/gallery', element: <Gallery /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

// Alt+P toggles projector mode — for screenshots and the demo.
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'p') document.documentElement.classList.toggle('projector');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider enableCssLayer>
      {/* Emotion's tags land before index.css, so the layer order must be declared here too, or Tailwind's reset outranks MUI. */}
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotifyProvider>
          <SessionWatcher />
          <RouterProvider router={router} />
        </NotifyProvider>
      </ThemeProvider>
    </StyledEngineProvider>
  </StrictMode>,
);
