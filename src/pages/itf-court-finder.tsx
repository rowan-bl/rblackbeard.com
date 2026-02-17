import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function ItfCourtFinder() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
          setSwRegistration(registration);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const sendNotification = () => {
    if (permission === 'granted' && swRegistration) {
      swRegistration.showNotification('Court Found!', {
        body: 'A new court application has been submitted nearby.',
        icon: '/android-chrome-192x192.png', // Ensure these exist or use a placeholder
        vibrate: [200, 100, 200],
        tag: 'court-alert'
      } as NotificationOptions & { vibrate?: number[] });
    } else {
      alert('Notifications not granted or Service Worker not ready.');
    }
  };


  return (
    <>
      <Head>
        <title>ITF Court Finder Demo</title>
        <meta name="description" content="Demo for PWA Notifications" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-6">
        <div className="max-w-md w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">ITF Court Finder</h1>
            <p className="text-gray-400">PWA & Notification Demo</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="bg-gray-950 p-4 rounded-lg border border-gray-700/50">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Status</h2>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Support:</span>
                  <span className={isSupported ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
                    {isSupported ? 'Supported' : 'Not Supported'}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-400">Permission:</span>
                  <span className={`font-medium ${permission === 'granted' ? 'text-green-400' :
                    permission === 'denied' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                    {permission}
                  </span>
                </div>
              </div>

              <button
                onClick={requestPermission}
                disabled={!isSupported || permission === 'granted'}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {permission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
              </button>

              <button
                onClick={sendNotification}
                disabled={permission !== 'granted' || !swRegistration}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900 disabled:text-emerald-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                Send Test Notification
              </button>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-6">
            Install this page as an App to see the standalone behavior.
          </p>
        </div>
      </main>
    </>
  );
}
