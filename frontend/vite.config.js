import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// docker-compose.yml의 frontend 서비스에서만 DOCKER=true를 넣어준다.
// 도커 볼륨 마운트(특히 Windows)는 네이티브 파일 변경 이벤트가 컨테이너 안까지
// 전달되지 않아 usePolling 없이는 HMR이 새 코드를 감지하지 못한다.
// 로컬 `npm run dev`(포트 3000 직접 접속)에서는 이 값이 없으므로 그대로 둔다 —
// hmr.clientPort를 8080(도커 포트 매핑)으로 고정하면 로컬 직접 접속 시 HMR이 깨진다.
const isDocker = process.env.DOCKER === 'true';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    watch: isDocker ? { usePolling: true } : undefined,
    hmr: isDocker ? { clientPort: 8080 } : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
      },
    },
  }
})
