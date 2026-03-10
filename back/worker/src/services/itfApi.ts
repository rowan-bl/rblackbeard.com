import { Tournament, Match, OrderOfPlayDay } from '../types/tournament';

export class ITFApiClient {
  private proxyUrl: string;

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl.replace(/\/$/, '');
  }

  private async fetchFromProxy(endpoint: string, params?: Record<string, string>): Promise<any> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${this.proxyUrl}/api/itf/${endpoint}${qs}`;

    try {
      const response = await fetch(url);
      const text = await response.text();

      if (!response.ok) {
        console.warn(`Proxy returned ${response.status} for ${endpoint}:`, text.substring(0, 500));
        return null;
      }

      return JSON.parse(text);
    } catch (error) {
      console.error('Proxy fetch error:', error);
      return null;
    }
  }

  async fetchCalendar(circuitCode: string, dateFrom: string, dateTo: string): Promise<Tournament[]> {
    const data = await this.fetchFromProxy('TournamentApi/GetCalendar', {
      circuitCode,
      dateFrom,
      dateTo,
      skip: '0',
      take: '100',
      isOrderAscending: 'true',
      orderField: 'startDate',
    });

    if (!data || !data.items) {
      return [];
    }

    return data.items.map((t: any) => ({
      tournamentKey: t.tournamentKey,
      tournamentName: t.tournamentName,
      circuitCode: t.circuitCode,
      hostNation: t.hostNation,
      startDate: t.startDate,
      endDate: t.endDate,
      surface: t.surface,
      tourCategory: t.tourCategory,
      venueName: t.venueName,
      city: t.city,
    }));
  }

  async fetchTournamentMatches(tournamentKey: string): Promise<Match[]> {
    const data = await this.fetchFromProxy('TournamentApi/GetTieMatches', {
      tournamentKey,
    });

    if (!data || !data.matches) {
      return [];
    }

    return data.matches.map((m: any) => ({
      matchId: m.matchId || m.id,
      court: m.court || 'Unknown',
      status: m.status || 'NotStarted',
      player1: m.player1 || m.team1,
      player2: m.player2 || m.team2,
      score: m.score,
      scheduledTime: m.scheduledTime,
    }));
  }

  async fetchOrderOfPlayDays(tournamentKey: string): Promise<OrderOfPlayDay[]> {
    const days = await this.fetchFromProxy('TournamentApi/GetOrderOfPlayDays', { tournamentKey });
    console.log(`GetOrderOfPlayDays for ${tournamentKey}:`, JSON.stringify(days));

    if (!days || !Array.isArray(days)) return [];

    return days.map((d: any) => ({
      dayId: d.orderOfPlayDayId,
      playDate: d.playDate,
      playDateString: d.playDateString,
    }));
  }

  async checkLastMatchStarted(tournamentKey: string): Promise<{
    started: boolean;
    court?: string;
    match?: string;
  }> {
    const matches = await this.fetchTournamentMatches(tournamentKey);

    if (matches.length === 0) {
      return { started: false };
    }

    const matchesByCourt = matches.reduce((acc, match) => {
      if (!acc[match.court]) acc[match.court] = [];
      acc[match.court].push(match);
      return acc;
    }, {} as Record<string, Match[]>);

    for (const [court, courtMatches] of Object.entries(matchesByCourt)) {
      const lastMatch = courtMatches[courtMatches.length - 1];
      if (lastMatch.status === 'InProgress') {
        return {
          started: true,
          court,
          match: `${lastMatch.player1} vs ${lastMatch.player2}`,
        };
      }
    }

    return { started: false };
  }
}
