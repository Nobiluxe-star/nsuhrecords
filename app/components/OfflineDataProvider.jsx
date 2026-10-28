'use client';

import { useEffect } from 'react';
import { downloadFullSchoolData, syncOfflineQueueToSupabase } from '../../lib/offlineSync';

export default function OfflineDataProvider() {
  useEffect(() => {
    const handleOfflineHydration = async () => {
      const activeSchoolId = typeof window !== 'undefined' ? localStorage.getItem('active_school_id') : null;

      if (navigator.onLine) {
        try {
          // 1. Sync any pending offline changes (marks, attendance, logs) up to Supabase first
          await syncOfflineQueueToSupabase();

          // 2. Download and cache the entire school's records locally into IndexedDB
          if (activeSchoolId) {
            await downloadFullSchoolData(activeSchoolId);
            console.log("✅ Full school dataset successfully synced and cached locally for offline use.");
          }
        } catch (err) {
          console.warn("Background offline synchronization warning:", err);
        }
      } else {
        console.log("📴 Offline mode active: Operating seamlessly from local IndexedDB cache.");
      }
    };

    // Run synchronization and local caching on initial load
    handleOfflineHydration();

    // Listen dynamically for network status changes
    window.addEventListener('online', handleOfflineHydration);
    window.addEventListener('offline', () => {
      console.log("</tool_call> Network connection lost. Switched to local offline cache.");
    });

    return () => {
      window.removeEventListener('online', handleOfflineHydration);
      window.removeEventListener('offline', () => {
        console.log("📴 Network connection lost. Switched to local offline cache.");
      });
    };
  }, []);

  return null;
}