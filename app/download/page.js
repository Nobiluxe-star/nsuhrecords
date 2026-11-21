'use client';

import React, { useEffect, useState } from 'react';

export default function DownloadPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    window.alert(
      'To install ClassLogs now: tap your browser menu (⋮ or Share) and select "Install app" or "Add to Home Screen".'
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border-2 border-emerald-500 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-2xl font-black shadow-lg border border-blue-400/40">
            CLs
          </div>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Official Teacher Portal Download
          </span>
          <h1 className="text-2xl font-black text-white mt-1">Install ClassLogs App</h1>
          <p className="text-sm text-slate-300 mt-2">
            Install ClassLogs now for instant schedule & subject alerts with sound, 2-second live sync, and your teacher credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl text-sm shadow-lg transition"
        >
          Install App Now (Required)
        </button>

        {!deferredPrompt && !installed && (
          <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/30 rounded-xl p-2.5">
            On Android/Chrome: tap browser menu (⋮) → <strong>Install app</strong> or <strong>Add to Home screen</strong>. On iPhone/Safari: tap Share → <strong>Add to Home Screen</strong>.
          </p>
        )}

        <a
          href="/"
          className="block w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl text-xs transition"
        >
          Go to Login Portal
        </a>

        {installed && (
          <p className="text-xs text-emerald-400 font-bold">
            App installed! Open ClassLogs from your home screen.
          </p>
        )}
      </div>
    </div>
  );
}