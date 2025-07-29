import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // 모든 IP에서 접근 가능하게 함
    port: 8501         // 포트를 8501번으로 설정
  }
})
