import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub 리포지토리 이름이 NOCAP-Extension이므로 base 경로를 맞춰야 GitHub Pages에서 CSS/JS 로드가 깨지지 않습니다.
  base: '/NOCAP-Extension/',
})
