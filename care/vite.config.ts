import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app is served from https://breathingpoint.in/care/
export default defineConfig({
  base: '/care/',
  plugins: [react()],
});
