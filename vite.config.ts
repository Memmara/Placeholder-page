import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
const omitMonolith={name:'omit-question-monolith',closeBundle(){import('node:fs').then(fs=>fs.rmSync('dist/data/questions.json',{force:true}))}};
export default defineConfig({plugins:[tailwindcss(),omitMonolith],server:{watch:{ignored:['**/server/**','**/database/**','**/.local-db/**']},proxy:{'/api/game':{target:'http://127.0.0.1:5178',changeOrigin:true},'/api/auth':{target:'http://127.0.0.1:5178',changeOrigin:true},'/api/commerce':{target:'http://127.0.0.1:5178',changeOrigin:true}}},build:{rollupOptions:{output:{manualChunks:{three:['three']}}}}});
