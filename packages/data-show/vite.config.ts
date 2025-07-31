import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// import { createStyleImportPlugin } from "vite-plugin-style-import";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // createStyleImportPlugin({
    //   libs: [
    //     {
    //       libraryName: "antd",
    //       esModule: true,
    //       resolveStyle: (name) => `antd/es/${name}/style/index`,
    //     },
    //   ],
    // }),
  ],
  build: {
    // outDir: "../crx/show",
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
