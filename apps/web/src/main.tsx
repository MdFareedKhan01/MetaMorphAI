import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import './index.css';
import { getToken } from './api';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Ingest from './pages/Ingest';
import Confirm from './pages/Confirm';
import Workspace from './pages/Workspace';
import Gallery from './pages/Gallery';
import AppShell from './components/AppShell';

function Guard({ children }: { children: ReactNode }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { path: '/login', element: <AppShell><Login /></AppShell> },
  { path: '/signup', element: <AppShell><Signup /></AppShell> },
  { path: '/', element: <AppShell><Guard><Ingest /></Guard></AppShell> },
  { path: '/sources/:id', element: <AppShell><Guard><Confirm /></Guard></AppShell> },
  { path: '/batches/:id', element: <AppShell><Guard><Workspace /></Guard></AppShell> },
  { path: '/gallery', element: <AppShell><Gallery /></AppShell> },
]);

// Alt+P toggles projector mode — for screenshots and the demo.
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'p') document.documentElement.classList.toggle('projector');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>,
);
