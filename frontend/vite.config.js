import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read REACT_APP_* env vars from .env so existing source code keeps using process.env.REACT_APP_BACKEND_URL
  const env = loadEnv(mode, process.cwd(), ["REACT_APP_", "VITE_"]);

  const define = {};
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith("REACT_APP_")) {
      define[`process.env.${k}`] = JSON.stringify(v);
    }
  }
  // Expose NODE_ENV for libs that read it
  define["process.env.NODE_ENV"] = JSON.stringify(mode);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
    },
    define,
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      hmr: {
        clientPort: 443,
        protocol: "wss",
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
    },
    build: {
      outDir: "build",
      sourcemap: false,
    },
  };
});
