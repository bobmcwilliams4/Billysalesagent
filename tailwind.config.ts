import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          4: 'var(--surface-4)',
          5: 'var(--surface-5)',
        },
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fadeIn 0.3s ease both',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer': 'shimmer 1.4s ease infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'chromatic': 'chromatic 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
