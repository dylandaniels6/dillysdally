import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react', 'gpt-3-encoder'], // Added gpt-3-encoder
    include: ['pdfjs-dist']
  },
  define: {
    global: 'globalThis',
    '__dirname': '""',      // Added
    '__filename': '""',     // Added
    'process.cwd': '() => ""', // Added
  },
});