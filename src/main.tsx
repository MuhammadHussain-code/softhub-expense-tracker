import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Older builds cached Supabase API responses in the service worker, which could
// serve a stale list right after saving an entry. The route is gone; drop the
// cache it left behind on devices that already installed that build.
if ('caches' in window) {
  caches.delete('supabase-api-cache').catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
