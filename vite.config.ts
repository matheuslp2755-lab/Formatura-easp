import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Fix: Cast process to any to resolve Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env.API_KEY so the code works in the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Prevent crash if other process.env props are accessed, but be careful not to overwrite everything
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || mode),
    },
  };
});