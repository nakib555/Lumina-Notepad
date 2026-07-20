import { createRoot } from 'react-dom/client'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './index.css'
import App from './App.tsx'
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

import { Capacitor } from '@capacitor/core';
import { registerSW } from 'virtual:pwa-register';

// Polyfill for HTML5 Drag and Drop on Touch Devices (Mobile/Capacitor)
import { polyfill } from "mobile-drag-drop";
import { scrollBehaviourDragImageTranslateOverride } from "mobile-drag-drop/scroll-behaviour";
import "mobile-drag-drop/default.css";

// Initialize polyfill immediately
polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
});

// To ensure scroll still works alongside dragging, we disable passive touchmove 
// globally if needed, though mobile-drag-drop usually handles most of it.
window.addEventListener('touchmove', function() {}, {passive: false});

if ('serviceWorker' in navigator) {
  if (Capacitor.isNativePlatform?.()) {
    // NATIVE APP BEHAVIOR
    // Service workers are unnecessary and cause double-open bugs across OTA app updates.
    // We actively unregister them and clear CacheStorage so it immediately loads fresh files.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        Promise.all(registrations.map(r => r.unregister())).then(() => {
          if ('caches' in window) {
            caches.keys()
              .then(keys => Promise.all(keys.map(key => caches.delete(key))))
              .then(() => window.location.reload());
          } else {
            location.reload();
          }
        });
      }
    });
  } else {
    // WEB PWA BEHAVIOR
    // Explicitly register the service worker since we disabled auto-inject
    const updateSW = registerSW({ 
      immediate: true,
      onNeedRefresh() {
        // Automatically accept the new payload (skip waiting) without deleting user local DB data
        updateSW(true);
      },
      onOfflineReady() {
        console.log("App ready to work offline");
      }
    });

    // Wait for the service worker to be updated and control the page.
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <>
    <TooltipProvider>
      <App />
    </TooltipProvider>
    <Toaster duration={2000} />
  </>,
)
