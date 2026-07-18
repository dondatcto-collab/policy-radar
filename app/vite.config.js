import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build được workflow app-build.yml push sang repo Pages riêng
// dondatcto-collab/policy-radar-app (nhánh main), phục vụ tại
// https://dondatcto-collab.github.io/policy-radar-app/ — base phải khớp đường dẫn đó.
export default defineConfig({
  plugins: [react()],
  base: "/policy-radar-app/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
