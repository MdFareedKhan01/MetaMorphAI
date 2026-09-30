import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar, type AlertColor } from '@mui/material';

type Notify = (message: string, severity?: AlertColor) => void;
// Without a provider (unit tests, isolated renders) a notification is simply dropped.
const NotifyContext = createContext<Notify>(() => {});
export const useNotify = () => useContext(NotifyContext);

/** One global toast area; a new message replaces the current one. */
export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; severity: AlertColor; key: number } | null>(null);
  const notify = useCallback<Notify>((message, severity = 'info') =>
    setToast({ message, severity, key: Date.now() }), []);
  const value = useMemo(() => notify, [notify]);
  return (
    <NotifyContext.Provider value={value}>
      {children}
      <Snackbar key={toast?.key} open={!!toast} autoHideDuration={6000} onClose={(_, why) => why !== 'clickaway' && setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast ? <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>{toast.message}</Alert> : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
}
