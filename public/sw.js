// ============================================================
// CourtFinder Service Worker — Polling & Notifications
// ============================================================

const API_BASE = '/api/itf';
const POLL_INTERVAL = 30000; // 30 seconds
const DB_NAME = 'courtfinder-sw';
const DB_VERSION = 1;
const STORE_NAME = 'polling-tasks';

// In-memory map of active intervals: key -> intervalId
const activeIntervals = new Map();

// ============================================================
// IndexedDB helpers (persistent storage for tasks)
// ============================================================

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveTask(task) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(task);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function deleteTask(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getAllTasks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// ============================================================
// API Fetching
// ============================================================

async function apiFetch(path, params = {}) {
  const query = new URLSearchParams({ path, ...params });
  const url = `${API_BASE}?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ============================================================
// Polling Logic: Order of Play Released
// ============================================================

async function checkOrderOfPlay(task) {
  try {
    const data = await apiFetch('TournamentApi/GetOrderOfPlayDays', {
      tournamentKey: task.tournamentKey,
    });

    const days = data.days || data.items || data || [];
    const dayCount = Array.isArray(days) ? days.length : 0;

    console.log(`[SW] OOP check for ${task.tournamentName}: ${dayCount} days (prev: ${task.previousDayCount || 0})`);

    // First poll — store baseline
    if (task.previousDayCount === undefined || task.previousDayCount === null) {
      task.previousDayCount = dayCount;
      await saveTask(task);
      return false;
    }

    // New day appeared → OOP released
    if (dayCount > task.previousDayCount) {
      task.previousDayCount = dayCount;
      await saveTask(task);
      return true;
    }

    return false;
  } catch (err) {
    console.error(`[SW] OOP check error:`, err);
    return false;
  }
}

// ============================================================
// Polling Logic: Last Match on Court (two-phase)
//   Phase 1: Detect "going out" (on court / in progress) → notify
//   Phase 2: Detect "complete" → notify with score → stop
// ============================================================

function isGoingOut(status) {
  const s = status.toLowerCase();
  return s.includes('progress') || s.includes('live') || s.includes('oncourt') || s.includes('on court') || s === 'ip' || s === 'oc';
}

function isComplete(status) {
  const s = status.toLowerCase();
  return s.includes('complete') || s.includes('finished') || s.includes('retired') || s.includes('walkover') || s === 'co' || s === 'fin' || s === 'wo' || s === 'ret';
}

function formatScore(match) {
  const scoreA = match.scoreA || match.score1 || '';
  const scoreB = match.scoreB || match.score2 || '';
  if (scoreA || scoreB) return `${scoreA} - ${scoreB}`;
  return '';
}

async function checkLastMatch(task) {
  try {
    // Step 1: Get the days for this tournament
    const daysData = await apiFetch('TournamentApi/GetOrderOfPlayDays', {
      tournamentKey: task.tournamentKey,
    });

    const days = daysData.days || daysData.items || daysData || [];
    if (!Array.isArray(days) || days.length === 0) {
      console.log(`[SW] Last Match: No days available for ${task.tournamentName}`);
      return { goingOut: [], completed: [] };
    }

    // Find today's day entry (or the most recent one)
    const today = new Date().toISOString().split('T')[0];
    let todayDay = days.find(d => {
      const dayDate = (d.date || d.dayDate || '').split('T')[0];
      return dayDate === today;
    });
    if (!todayDay) todayDay = days[days.length - 1];

    const dayId = todayDay.orderOfPlayDayId || todayDay.id || todayDay.dayId;
    if (!dayId) return { goingOut: [], completed: [] };

    // Step 2: Get the order of play for that day
    const oopData = await apiFetch('TournamentApi/GetOrderOfPlay', {
      orderOfPlayDayId: String(dayId),
    });

    const courts = oopData.courts || oopData.items || [];
    if (!Array.isArray(courts) || courts.length === 0) {
      return { goingOut: [], completed: [] };
    }

    // Initialize tracking
    if (!task.notifiedCourts) task.notifiedCourts = {};

    const goingOut = [];
    const completed = [];

    for (const court of courts) {
      const matches = court.matches || court.items || [];
      if (matches.length === 0) continue;

      const lastMatch = matches[matches.length - 1];
      const courtName = court.courtName || court.name || 'Court';
      const status = (lastMatch.playStatusCode || lastMatch.statusCode || lastMatch.status || '').toString();

      console.log(`[SW] Court ${courtName}: last match status = "${status}"`);

      // Phase 1: Going out (not yet notified for this court)
      if (!task.notifiedCourts[courtName] && isGoingOut(status)) {
        task.notifiedCourts[courtName] = 'goingOut';
        goingOut.push({ court: courtName });
      }

      // Phase 2: Complete (already notified going out, or just finished)
      if (task.notifiedCourts[courtName] === 'goingOut' && isComplete(status)) {
        const score = formatScore(lastMatch);
        task.notifiedCourts[courtName] = 'complete';
        completed.push({ court: courtName, score });
      }
    }

    // Save updated tracking state
    await saveTask(task);

    return { goingOut, completed };
  } catch (err) {
    console.error(`[SW] Last Match check error:`, err);
    return { goingOut: [], completed: [] };
  }
}

// ============================================================
// Send Notification (without stopping polling)
// ============================================================

async function sendNotificationOnly(task, message) {
  console.log(`[SW] Notification: ${message}`);
  await self.registration.showNotification('CourtFinder', {
    body: message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `${task.id}-${Date.now()}`,
    data: { tournamentKey: task.tournamentKey },
    requireInteraction: true,
  });
}

// ============================================================
// Send Notification & Stop Polling
// ============================================================

async function sendNotificationAndStop(task, message) {
  await sendNotificationOnly(task, message);
  stopPolling(task.id);
  await deleteTask(task.id);
}

// ============================================================
// Polling Engine
// ============================================================

async function runPollCycle(task) {
  console.log(`[SW] Polling: ${task.id}`);

  if (task.type === 'orderOfPlay') {
    const released = await checkOrderOfPlay(task);
    if (released) {
      await sendNotificationAndStop(task, `📋 Order of Play released for ${task.tournamentName}!`);
    }
  } else if (task.type === 'lastMatch') {
    const { goingOut, completed } = await checkLastMatch(task);

    // Notify for matches going out
    for (const item of goingOut) {
      await sendNotificationOnly(task, `🎾 Last match going out on ${item.court} at ${task.tournamentName}`);
    }

    // Notify for completed matches (with score if available)
    for (const item of completed) {
      const scoreText = item.score ? ` (${item.score})` : '';
      await sendNotificationOnly(task, `✅ Last match complete on ${item.court}${scoreText} at ${task.tournamentName}`);
    }

    // Check if ALL courts are complete → stop polling
    const courtStates = Object.values(task.notifiedCourts || {});
    const allComplete = courtStates.length > 0 && courtStates.every(s => s === 'complete');
    if (allComplete) {
      console.log(`[SW] All last matches complete for ${task.tournamentName}, stopping poll`);
      stopPolling(task.id);
      await deleteTask(task.id);
    }
  }
}

function startPolling(task) {
  const id = task.id;

  // Don't duplicate
  if (activeIntervals.has(id)) {
    clearInterval(activeIntervals.get(id));
  }

  console.log(`[SW] Starting poll for: ${id}`);

  // Run immediately, then every POLL_INTERVAL
  runPollCycle(task);

  const intervalId = setInterval(() => {
    runPollCycle(task);
  }, POLL_INTERVAL);

  activeIntervals.set(id, intervalId);
}

function stopPolling(id) {
  if (activeIntervals.has(id)) {
    console.log(`[SW] Stopping poll for: ${id}`);
    clearInterval(activeIntervals.get(id));
    activeIntervals.delete(id);
  }
}

// ============================================================
// Resume all tasks from IndexedDB (on SW activation or sync)
// ============================================================

async function resumeAllPolling() {
  try {
    const tasks = await getAllTasks();
    console.log(`[SW] Resuming ${tasks.length} polling task(s)`);
    for (const task of tasks) {
      if (!activeIntervals.has(task.id)) {
        startPolling(task);
      }
    }
  } catch (err) {
    console.error(`[SW] Error resuming tasks:`, err);
  }
}

// ============================================================
// Service Worker Lifecycle
// ============================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');
  event.waitUntil(
    self.clients.claim().then(() => resumeAllPolling())
  );
});

// ============================================================
// Fetch Handler (required for PWA installability)
// Only intercept same-origin requests; let third-party pass through
// ============================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin requests
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails, return a basic offline response
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
    );
  }
  // Third-party requests (Cloudflare, etc.) are NOT intercepted
  // They go through the browser's default fetch behavior
});

// ============================================================
// Message Handler (from React app)
// ============================================================

self.addEventListener('message', (event) => {
  const { action, task } = event.data || {};

  if (action === 'START_POLLING' && task) {
    console.log(`[SW] Received START_POLLING for ${task.id}`);
    event.waitUntil(
      saveTask(task).then(() => startPolling(task))
    );
  }

  if (action === 'STOP_POLLING' && task) {
    console.log(`[SW] Received STOP_POLLING for ${task.id}`);
    stopPolling(task.id);
    event.waitUntil(deleteTask(task.id));
  }

  if (action === 'RESUME_ALL') {
    console.log(`[SW] Received RESUME_ALL`);
    event.waitUntil(resumeAllPolling());
  }
});

// ============================================================
// Periodic Background Sync (fallback for when app is closed)
// ============================================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'courtfinder-poll') {
    console.log('[SW] Periodic background sync triggered');
    event.waitUntil(
      (async () => {
        const tasks = await getAllTasks();
        for (const task of tasks) {
          await runPollCycle(task);
        }
      })()
    );
  }
});

// ============================================================
// Notification Click Handler
// ============================================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
