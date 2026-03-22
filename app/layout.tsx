import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stemify — AI Stem Separation',
  description: 'Separate any song into vocals, instruments, bass, drums, and individual SATB vocal parts with AI',
  icons: { icon: '/favicon.svg', type: 'image/svg+xml' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen grid-bg" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div className="noise-overlay" />
        <div className="scanline" />
        {children}
      </body>
    </html>
  )
}
