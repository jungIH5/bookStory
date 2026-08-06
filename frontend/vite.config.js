import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // 이 브랜치는 도커 없이 `npm run dev`로 로컬 미리보기하는 용도라
    // usePolling/hmr.clientPort(둘 다 도커 볼륨 마운트 환경 전용 설정)는 뺐다.
    // OneDrive가 동기화하는 폴더 안에서 usePolling을 켜두면 동기화 스캔을
    // 파일 변경으로 오인해 주기적으로 자동 새로고침되는 문제가 있었다.
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
      },
    },
  }
})
