import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import './index.css';
import { getToken } from './api';
import Login from './pages/Login';
import Ingest from './pages/Ingest';
import Confirm from './pages/Confirm';
import Workspace from './pages/Workspace';
import Gallery from './pages/Gallery';

function Guard({ children }: { children: ReactNode }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/', element: <Guard><Ingest /></Guard> },
  { path: '/sources/:id', element: <Guard><Confirm /></Guard> },
  { path: '/batches/:id', element: <Guard><Workspace /></Guard> },
  { path: '/gallery', element: <Gallery /> },
]);

// Alt+P toggles projector mode — for screenshots and the demo.
window.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'p') document.documentElement.classList.toggle('projector');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode><RouterProvider router={router} /></StrictMode>,
);
