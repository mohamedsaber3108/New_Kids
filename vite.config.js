import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],
  server:{allowedHosts:['terminal.local']},
  preview:{allowedHosts:['terminal.local']},
  build:{
    // Never inline fonts as data: URIs; the CSP font-src 'self' blocks them.
    assetsInlineLimit:(file)=>/\.woff2?$/.test(file)?false:undefined,
    rollupOptions:{
      output:{
        // Split long-lived vendor code from app code so browsers keep it cached across releases.
        manualChunks(id){
          if(!id.includes('node_modules')) return undefined;
          if(id.includes('lucide-react')) return 'icons';
          if(/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return 'vendor';
        }
      }
    }
  }
});
