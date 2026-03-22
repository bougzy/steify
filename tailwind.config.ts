import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        bg: {
          primary: '#080A0F',
          secondary: '#0D1017',
          card: '#111520',
          elevated: '#161B28',
        },
        accent: {
          cyan: '#00D4FF',
          purple: '#7B2FFF',
          pink: '#FF2F7B',
          green: '#00FF94',
          orange: '#FF6B2F',
        },
        stem: {
          vocal: '#FF2F7B',
          bass: '#7B2FFF',
          drums: '#FF6B2F',
          other: '#00D4FF',
          soprano: '#FF8FAB',
          alto: '#C77DFF',
          tenor: '#4CC9F0',
          baritone: '#F77F00',
        },
        text: {
          primary: '#F0F4FF',
          secondary: '#8892A4',
          muted: '#4A5568',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 40px currentColor' },
        }
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.4)',
        'glow-purple': '0 0 20px rgba(123, 47, 255, 0.4)',
        'glow-pink': '0 0 20px rgba(255, 47, 123, 0.4)',
        'glow-green': '0 0 20px rgba(0, 255, 148, 0.4)',
      }
    },
  },
  plugins: [],
}
export default config
