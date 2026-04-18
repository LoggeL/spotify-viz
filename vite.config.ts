import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/spotify-viz/" : "./",
  server: { port: 5180, host: "127.0.0.1" },
  build: { target: "es2022" },
});
