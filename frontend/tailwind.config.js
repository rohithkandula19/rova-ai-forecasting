export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rova: {
          bg:      'var(--bg)',
          bg1:     'var(--bg1)',
          bg2:     'var(--bg2)',
          bg3:     'var(--bg3)',
          accent:  'var(--accent)',
          accent2: 'var(--accent2)',
          border:  'var(--border)',
          border2: 'var(--border2)',
          text:    'var(--text)',
          text2:   'var(--text2)',
          text3:   'var(--text3)',
          text4:   'var(--text4)',
          red:     'var(--red)',
          amber:   'var(--amber)',
          blue:    'var(--blue)',
          purple:  'var(--purple)',
        },
      },
      fontFamily: { mono: ['"JetBrains Mono"', 'monospace'], sans: ['"Space Grotesk"', 'sans-serif'] },
    },
  },
  plugins: [],
}
