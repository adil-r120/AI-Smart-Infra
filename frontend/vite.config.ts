import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: '127.0.0.1',
        proxy: {
            '/results': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            },
            '/detect': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            }
        }
    },
    build: {
        // Increase warning threshold — ML/map libs are legitimately large
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Core React — loaded first, cached aggressively
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    // Map stack — only loaded when map tab is active
                    'vendor-map': ['leaflet', 'react-leaflet'],
                    // Charts — only needed on analytics tab
                    'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
                    // Utilities
                    'vendor-utils': ['axios', 'i18next', 'react-i18next', 'react-markdown'],
                }
            }
        }
    }
})

