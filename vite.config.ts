import { defineConfig } from 'vite';

export default defineConfig({
  // other Vite configurations
  define: {
    'process.env.VITE_GEMINI_API_KEY': process.env.VITE_GEMINI_API_KEY || 'default_value',
    'import.meta.env.VITE_GEMINI_API_KEY': import.meta.env.VITE_GEMINI_API_KEY || 'default_value',
  },
});