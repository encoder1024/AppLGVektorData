import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Escuchar en todas las interfaces (0.0.0.0)
    port: 5173,
    watch: {
      usePolling: true, // CRITICAL: Necesario para que Docker en Windows detecte cambios
    },
    hmr: {
      clientPort: 5173, // Asegura que el cliente use el puerto correcto para el socket
    }
  }
})
