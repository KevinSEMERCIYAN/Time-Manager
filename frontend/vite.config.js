import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,

    // Autorise le host utilisé via nginx
    allowedHosts: ["timemanager.primebank.local", ".primebank.local"],

    // HMR derrière reverse-proxy (sinon websocket HMR peut merder)
    hmr: {
      host: "timemanager.primebank.local",
      clientPort: 8080
    }
  }
});
