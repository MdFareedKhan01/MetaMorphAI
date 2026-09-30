import { useRef, useState, type DragEvent } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { motion } from 'motion/react';

const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * File drop target in the style of ui-layouts' File Upload: the zone lifts and its icon bounces while a file
 * is dragged over it, and the chosen file replaces it with a card. Validation is the caller's job (`onPick`).
 */
export function Dropzone({ file, accept, hint, disabled, onPick, onClear }: {
  file: File | null; accept: string[]; hint: string; disabled?: boolean;
  onPick: (f: File | undefined) => void; onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const drop = (e: DragEvent<HTMLElement>) => { e.preventDefault(); setOver(false); if (!disabled) onPick(e.dataTransfer.files?.[0]); };

  return (
    <>
      <input ref={input} type="file" accept={accept.join(',')} hidden tabIndex={-1} aria-label="Upload a file"
        onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ''; }} />
        {file ? (
          <motion.div key="file" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', p: 1.5, border: 2, borderColor: 'primary.light', borderRadius: 3, bgcolor: 'rgba(20,184,166,.06)' }}>
              <Box aria-hidden sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'background.paper', display: 'grid', placeItems: 'center', color: 'primary.main', border: 1, borderColor: 'divider' }}>
                <InsertDriveFileOutlined />
              </Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography noWrap sx={{ fontWeight: 600 }}>{file.name}</Typography>
                <Typography variant="body2" color="text.secondary">{size(file.size)} · ready to read</Typography>
              </Box>
              <Button variant="outlined" color="inherit" size="small" onClick={onClear} disabled={disabled} startIcon={<CloseRounded />}>Remove</Button>
            </Stack>
          </motion.div>
        ) : (
          <motion.div key="zone" initial={{ opacity: 0 }} animate={{ opacity: 1, scale: over ? 1.015 : 1 }} transition={{ duration: .15 }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', p: 1.5, border: 2, borderStyle: 'dashed', borderRadius: 3,
              borderColor: over ? 'primary.main' : 'divider', bgcolor: over ? 'rgba(20,184,166,.08)' : 'rgba(241,245,249,.6)', transition: 'all .15s' }}>
              <motion.div animate={over ? { y: [0, -5, 0] } : { y: 0 }} transition={{ repeat: over ? Infinity : 0, duration: .7 }} style={{ display: 'flex' }}>
                <CloudUploadOutlined sx={{ fontSize: 32, color: 'primary.main' }} />
              </motion.div>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>Drop a file here</Typography>
                <Typography variant="body2" color="text.secondary">{hint}</Typography>
              </Box>
              <Button variant="outlined" onClick={() => input.current?.click()} disabled={disabled} sx={{ flexShrink: 0 }}>Browse files</Button>
            </Stack>
          </motion.div>
        )}
      {/* Screen readers: say what happened, not just what appeared. */}
      <Box role="status" aria-live="polite" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {file ? `${file.name} selected` : ''}
      </Box>
    </>
  );
}
