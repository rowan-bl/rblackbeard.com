import { useState, useEffect } from 'react';
import Head from 'next/head';

import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameWeek } from 'date-fns';
import { Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

// Custom Tennis Court Icon
function TennisCourtIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="12" y1="2" x2="12" y2="12" />
      <line x1="12" y1="12" x2="12" y2="22" />
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

interface Tournament {
  tournamentKey: string;
  tournamentName: string;
  hostNation: string;
  startDate: string;
  endDate: string;
  surfaceDesc: string;
  categories: string[];
  circuitCode: string;
  isLive?: boolean;
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('MT');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // Notification States
  const [notifyLastMatch, setNotifyLastMatch] = useState(false);
  const [notifyOrderOfPlay, setNotifyOrderOfPlay] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const granted = Notification.permission === 'granted';
      setHasPermission(granted);

      // Show popup if not granted and not previously dismissed
      if (!granted && Notification.permission !== 'denied') {
        const dismissed = localStorage.getItem('courtfinder-permission-dismissed');
        if (!dismissed) {
          setShowPermissionPopup(true);
        }
      }
    }
  }, []);

  const handleEnablePermissions = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
    }
    setShowPermissionPopup(false);
  };

  const handleDismissPopup = () => {
    localStorage.setItem('courtfinder-permission-dismissed', 'true');
    setShowPermissionPopup(false);
  };

  // Restore active tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('courtfinder-tab');
    if (savedTab && (savedTab === 'MT' || savedTab === 'WT')) {
      setActiveTab(savedTab);
    }
  }, []);

  // Persist active tab changes
  useEffect(() => {
    localStorage.setItem('courtfinder-tab', activeTab);
  }, [activeTab]);

  // Check if a tournament has notifications enabled
  const hasNotifications = (tournamentKey: string): boolean => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(`notify-${tournamentKey}`);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    return parsed.lastMatch || parsed.orderOfPlay;
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
    }
  };

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const from = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const to = format(endOfMonth(currentDate), 'yyyy-MM-dd');

      const params = new URLSearchParams({
        path: 'TournamentApi/GetCalendar',
        circuitCode: activeTab,
        dateFrom: from,
        dateTo: to,
        take: '100',
        skip: '0'
      });

      const res = await fetch(`/api/proxy?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (data.items || []).map((item: any) => ({
        tournamentKey: item.tournamentKey,
        tournamentName: item.tournamentName,
        hostNation: item.hostNation,
        startDate: item.startDate,
        endDate: item.endDate,
        surfaceDesc: item.surfaceDesc,
        categories: item.categories || [],
        circuitCode: activeTab
      }));

      setTournaments(items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, activeTab]);

  useEffect(() => {
    if (selectedTournament) {
      const saved = localStorage.getItem(`notify-${selectedTournament.tournamentKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotifyLastMatch(parsed.lastMatch);
        setNotifyOrderOfPlay(parsed.orderOfPlay);
      } else {
        setNotifyLastMatch(false);
        setNotifyOrderOfPlay(false);
      }
    }
  }, [selectedTournament]);

  // Helper to send messages to the Service Worker
  const sendToSW = (action: string, tournamentKey: string, tournamentName: string, type: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        action,
        task: {
          id: `${tournamentKey}-${type}`,
          tournamentKey,
          tournamentName,
          type,
        },
      });
    }
  };

  // On mount: tell SW to resume any persisted polling tasks & register periodic sync
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Tell SW to resume tasks from IndexedDB
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ action: 'RESUME_ALL' });
        }

        // Register Periodic Background Sync (Chrome only, best-effort)
        if ('periodicSync' in registration) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (registration as any).periodicSync.register('courtfinder-poll', {
            minInterval: 30 * 60 * 1000, // 30 minutes (browser controls actual minimum)
          }).then(() => {
            console.log('Periodic Background Sync registered');
          }).catch((err: Error) => {
            console.log('Periodic Background Sync not available:', err.message);
          });
        }
      });
    }
  }, []);


  const toggleNotification = (type: 'lastMatch' | 'orderOfPlay') => {
    if (!selectedTournament) return;
    if (!hasPermission) {
      requestPermission();
      return;
    }

    let newLastMatch = notifyLastMatch;
    let newOrderOfPlay = notifyOrderOfPlay;

    if (type === 'lastMatch') newLastMatch = !notifyLastMatch;
    if (type === 'orderOfPlay') newOrderOfPlay = !notifyOrderOfPlay;

    setNotifyLastMatch(newLastMatch);
    setNotifyOrderOfPlay(newOrderOfPlay);

    localStorage.setItem(`notify-${selectedTournament.tournamentKey}`, JSON.stringify({
      lastMatch: newLastMatch,
      orderOfPlay: newOrderOfPlay
    }));

    // Communicate with Service Worker
    if (type === 'lastMatch') {
      sendToSW(
        newLastMatch ? 'START_POLLING' : 'STOP_POLLING',
        selectedTournament.tournamentKey,
        selectedTournament.tournamentName,
        'lastMatch'
      );
    }
    if (type === 'orderOfPlay') {
      sendToSW(
        newOrderOfPlay ? 'START_POLLING' : 'STOP_POLLING',
        selectedTournament.tournamentKey,
        selectedTournament.tournamentName,
        'orderOfPlay'
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 font-sans">
      <Head>
        <title>ITF Court Finder</title>
        <meta name="description" content="Track ITF tournaments and get notified." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      {/* Permission Request Popup */}
      {showPermissionPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-lg font-semibold">Enable Notifications</h2>
              <p className="text-sm text-muted-foreground">
                CourtFinder needs notification permissions to alert you when schedules are released and when last matches go out on court.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleEnablePermissions} className="w-full">
                Enable Notifications
              </Button>
              <Button variant="ghost" onClick={handleDismissPopup} className="w-full text-muted-foreground">
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-center px-4 relative">
          {selectedTournament && (
            <div className="absolute left-4">
              <Button variant="ghost" className="-ml-3 pl-2 pr-2" onClick={() => setSelectedTournament(null)}>
                <ChevronLeft className="h-5 w-5 mr-1" />
                Back
              </Button>
            </div>
          )}
          <TennisCourtIcon className="h-6 w-6 text-primary" />
        </div>
      </header>

      <main className="container py-6 px-4">
        {!selectedTournament ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold min-w-[150px] text-center">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="MT">Men&apos;s</TabsTrigger>
                  <TabsTrigger value="WT">Women&apos;s</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Mobile-friendly List Layout */}
            <div className="space-y-0 divide-y divide-border border rounded-md bg-card text-card-foreground shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading tournaments...
                </div>
              ) : tournaments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No tournaments found for this month.
                </div>
              ) : (
                tournaments.map((t) => {
                  const isCurrentWeek = isSameWeek(new Date(t.startDate), new Date(), { weekStartsOn: 1 });
                  return (
                    <div
                      key={t.tournamentKey}
                      className={`flex flex-col gap-2 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${isCurrentWeek ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedTournament(t)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-semibold text-base leading-tight">
                          {t.tournamentName}
                        </h3>
                        {isCurrentWeek && (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 whitespace-nowrap text-[10px] px-1.5 h-5">
                            This Week
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground gap-1.5">
                          <MapPin className="h-3.5 w-3.5 opacity-70" />
                          <span>{t.hostNation}</span>
                          <span className="text-muted-foreground/30">•</span>
                          <span>{t.surfaceDesc}</span>
                        </div>
                        {hasNotifications(t.tournamentKey) && (
                          <Bell className="h-3.5 w-3.5 text-primary fill-primary opacity-80" />
                        )}
                      </div>

                      <div className="flex justify-between items-end mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3.5 w-3.5 opacity-70" />
                          <span>
                            {format(new Date(t.startDate), 'MMM d')} - {format(new Date(t.endDate), 'MMM d')}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {t.categories.map(c => (
                            <Badge key={c} variant="outline" className="text-[10px] px-1.5 h-5 font-normal">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="secondary" className="mb-2">{selectedTournament.hostNation}</Badge>
                    <CardTitle className="text-2xl">{selectedTournament.tournamentName}</CardTitle>
                    <CardDescription>
                      {format(new Date(selectedTournament.startDate), 'MMMM d, yyyy')} - {format(new Date(selectedTournament.endDate), 'MMMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium">{selectedTournament.surfaceDesc}</span>
                    <div className="flex gap-1">
                      {selectedTournament.categories.map(c => (
                        <Badge key={c}>{c}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Notifications</h3>
              </div>

              <div className="bg-card border rounded-lg divide-y">
                <div className="flex items-center justify-between p-4">
                  <div className="space-y-0.5">
                    <div className="font-medium text-base">Last Match on Court</div>
                    <div className="text-xs text-muted-foreground max-w-[250px]">
                      Notify when the last match starts on each court.
                    </div>
                  </div>
                  <Switch
                    checked={notifyLastMatch}
                    onCheckedChange={() => toggleNotification('lastMatch')}
                  />
                </div>

                <div className="flex items-center justify-between p-4">
                  <div className="space-y-0.5">
                    <div className="font-medium text-base">Order of Play Released</div>
                    <div className="text-xs text-muted-foreground">
                      Notify when the schedule is released.
                    </div>
                  </div>
                  <Switch
                    checked={notifyOrderOfPlay}
                    onCheckedChange={() => toggleNotification('orderOfPlay')}
                  />
                </div>
              </div>

              {!hasPermission && (
                <div className="bg-yellow-500/15 text-yellow-500 p-4 rounded-lg text-sm border border-yellow-500/20">
                  Notifications are disabled. <button onClick={requestPermission} className="underline font-bold">Enable them</button> to receive updates.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
