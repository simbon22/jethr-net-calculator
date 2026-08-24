export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink:     { DEFAULT: '#0f1613', soft: '#3d4a44', faint: '#7c8a83' },
        surface: { DEFAULT: '#ffffff', sunk: '#f4f6f4', edge: '#e4e9e6' },
        moss:    { DEFAULT: '#1f5c47', light: '#3d8a6d', wash: '#eaf3ef' },
        clay:    { DEFAULT: '#a8563a', wash: '#f7eee9' },
        brass:   { DEFAULT: '#8a7538', wash: '#f5f1e6' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,22,19,.04), 0 8px 24px -12px rgba(15,22,19,.12)',
        lift: '0 2px 4px rgba(15,22,19,.05), 0 20px 48px -20px rgba(15,22,19,.22)',
      },
    },
  },
  plugins: [],
};
