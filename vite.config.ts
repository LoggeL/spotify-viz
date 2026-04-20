import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/spotify-viz/" : "/",
  server: { port: 5180, host: "127.0.0.1" },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        logge: resolve(__dirname, "logge/index.html"),
        tojokn: resolve(__dirname, "tojokn/index.html"),
        jonas: resolve(__dirname, "jonas/index.html"),
        noel: resolve(__dirname, "noel/index.html"),
      },
    },
  },
});
