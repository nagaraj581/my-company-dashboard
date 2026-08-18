import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@firebase/") || id.includes("node_modules/firebase/")) {
            return "firebase";
          }

          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "react";
          }

          if (id.includes("node_modules/lucide-react/")) {
            return "icons";
          }
        },
      },
    },
  },
  define: {
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(
      new Date().toISOString()
    )
  }
});
