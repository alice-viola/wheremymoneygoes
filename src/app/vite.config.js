import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command, mode }) => {
  const isElectronBuild = process.env.ELECTRON_BUILD === 'true'
  
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./', import.meta.url))
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        },
        '/ws': {
          target: 'ws://localhost:3000',
          ws: true
        }
      }
    },
    build: {
      outDir: isElectronBuild ? '../../dist/electron' : 'dist',
      sourcemap: true,
      // For Electron, we need to use relative paths
      base: isElectronBuild ? './' : '/'
    },
    define: {
      'process.env.IS_ELECTRON': isElectronBuild ? 'true' : 'false'
    }
  }
})
