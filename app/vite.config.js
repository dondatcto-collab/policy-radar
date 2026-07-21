import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages phục vụ trực tiếp từ nhánh main, thư mục root — không có bước build
// riêng của Pages. app/dist/ được commit sẵn bởi workflow app-build.yml, nên base
// phải khớp đường dẫn thật: https://<user>.github.io/policy-radar/app/dist/
export default defineConfig({
  plugins: [react()],
  base: "/policy-radar/app/dist/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
  },
});
