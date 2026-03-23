import path from 'path'
import fs from 'fs'

// Only true when actually deployed on Vercel servers
export const IS_VERCEL = process.env.VERCEL === '1'

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'originals')
export const STEMS_DIR = path.join(process.cwd(), 'uploads', 'stems')
export const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp')

export function ensureDirs() {
  if (IS_VERCEL) return
  ;[UPLOADS_DIR, STEMS_DIR, TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  })
}

export function getSongStemsDir(songId: string): string {
  const dir = path.join(STEMS_DIR, songId)
  if (!IS_VERCEL && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const STEM_COLORS: Record<string, string> = {
  vocals: '#FF2F7B',
  bass: '#7B2FFF',
  drums: '#FF6B2F',
  other: '#00D4FF',
  soprano: '#FF8FAB',
  alto: '#C77DFF',
  tenor: '#4CC9F0',
  baritone: '#F77F00',
}

export const STEM_LABELS: Record<string, string> = {
  vocals: 'Vocals',
  bass: 'Bass',
  drums: 'Drums',
  other: 'Instruments',
  soprano: 'Soprano',
  alto: 'Alto',
  tenor: 'Tenor',
  baritone: 'Baritone',
}