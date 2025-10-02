import { http, HttpResponse } from 'msw';
import {
  demoLeagues,
  waiverSuggestions,
  tradeOpportunities,
  matchups,
  startSitAlerts,
  rules,
  chatThreads,
  personas,
  notifications,
  commissionerTasks,
  auditLog,
  keyDates,
} from './fixtures';
import { injuryApocalypse } from './injuryApocalypse2025';

export const handlers = [
  // Leagues
  http.get('/api/mock/leagues', () => {
    return HttpResponse.json(demoLeagues);
  }),

  http.post('/api/mock/leagues/create', async ({ request }) => {
    const body = await request.json() as any;
    const newLeague = {
      id: `lg_${Date.now()}`,
      name: body.name || 'New League',
      platform: body.platform || 'Demo',
      scoring: body.scoring || 'PPR',
      teams: [],
      weeks: [1, 2, 3, 4, 5],
      currentWeek: 1,
    };
    return HttpResponse.json(newLeague);
  }),

  // Waivers
  http.get('/api/mock/waivers/suggestions', () => {
    return HttpResponse.json(waiverSuggestions);
  }),

  http.post('/api/mock/waivers/queue', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, queued: body });
  }),

  http.post('/api/mock/waivers/simulate', async ({ request }) => {
    const body = await request.json() as any;
    const claims = body.claims || [];
    
    const results = claims.map((claim: any, idx: number) => ({
      player: claim.player,
      probability: Math.max(10, 90 - idx * 15),
      outcome: idx < 2 ? 'likely' : idx < 4 ? 'possible' : 'unlikely',
    }));
    
    return HttpResponse.json({ results });
  }),

  // Trades
  http.get('/api/mock/trades/opportunities', () => {
    return HttpResponse.json(tradeOpportunities);
  }),

  http.post('/api/mock/trades/create', async ({ request }) => {
    const body = await request.json() as any;
    const newTrade = {
      id: `trade_${Date.now()}`,
      ...body,
      status: 'pending',
      fairnessScore: Math.floor(Math.random() * 30) + 70,
      createdAt: Date.now(),
    };
    return HttpResponse.json(newTrade);
  }),

  http.post('/api/mock/trades/dispute', async ({ request }) => {
    const body = await request.json() as any;
    const dispute = {
      id: `dispute_${Date.now()}`,
      tradeId: body.tradeId,
      reason: body.reason,
      votes: [],
      deadline: Date.now() + 86400_000,
      status: 'active',
    };
    return HttpResponse.json(dispute);
  }),

  http.get('/api/mock/trades/log', () => {
    return HttpResponse.json([
      {
        id: 't1',
        teams: ['Birds of Prey', 'Gridiron Geeks'],
        give: ['RB BenchGuy'],
        get: ['WR T. Breakout'],
        status: 'pending',
        timestamp: Date.now() - 3600_000,
      },
      {
        id: 't2',
        teams: ['The Replacements', 'End Zone Elite'],
        give: ['QB Backup'],
        get: ['WR Flex'],
        status: 'approved',
        timestamp: Date.now() - 7200_000,
      },
    ]);
  }),

  // Matchups
  http.get('/api/mock/matchups', ({ request }) => {
    const url = new URL(request.url);
    const week = url.searchParams.get('week');
    
    if (week) {
      const weekNum = parseInt(week);
      const filtered = matchups.filter(m => m.week === weekNum);
      return HttpResponse.json(filtered);
    }
    
    return HttpResponse.json(matchups);
  }),

  http.get('/api/mock/start-sit-alerts', () => {
    return HttpResponse.json(startSitAlerts);
  }),

  // Reports
  http.get('/api/mock/reports/generate', ({ request }) => {
    const url = new URL(request.url);
    const week = url.searchParams.get('week') || '4';
    
    const report = {
      week: parseInt(week),
      generated: Date.now(),
      sections: {
        headlines: [
          "Birds of Prey extend win streak to 3 games",
          "Injury apocalypse continues - 8 notable players out",
          "Gridiron Geeks make bold waiver moves",
        ],
        bestMoves: [
          { team: "Birds of Prey", move: "Picked up RB J. Rookie for $18", impact: "Immediate RB2 value" },
          { team: "Touchdown Titans", move: "Traded for WR upgrade", impact: "Strengthened playoff push" },
        ],
        worstMoves: [
          { team: "Red Zone Rebels", move: "Dropped starting RB too early", impact: "Lost depth" },
        ],
        injuryWatch: injuryApocalypse.entries.slice(0, 5),
        waiverWins: [
          { team: "Gridiron Geeks", player: "WR T. Breakout", cost: 12 },
          { team: "Field Goal Fanatics", player: "TE R. Sleeper", cost: 8 },
        ],
        powerRankings: [
          { rank: 1, team: "Birds of Prey", change: 0 },
          { rank: 2, team: "Touchdown Titans", change: 1 },
          { rank: 3, team: "Hail Mary Heroes", change: -1 },
        ],
      },
    };
    
    return HttpResponse.json(report);
  }),

  // Rules
  http.get('/api/mock/rules', () => {
    return HttpResponse.json(rules);
  }),

  http.post('/api/mock/rules/save', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, rule: body });
  }),

  http.get('/api/mock/rules/templates', () => {
    return HttpResponse.json([
      { id: 'tmpl1', title: 'Keeper Policy Template', body: 'Teams may keep up to 2 players...' },
      { id: 'tmpl2', title: 'FAAB Template', body: 'Each team receives $100 FAAB budget...' },
      { id: 'tmpl3', title: 'Trade Veto Template', body: 'Trades require majority veto...' },
    ]);
  }),

  // Chat
  http.get('/api/mock/chat/threads', ({ request }) => {
    const url = new URL(request.url);
    const channel = url.searchParams.get('channel');
    
    if (channel) {
      const filtered = chatThreads.filter(t => t.channel === channel);
      return HttpResponse.json(filtered);
    }
    
    return HttpResponse.json(chatThreads);
  }),

  http.post('/api/mock/chat/message', async ({ request }) => {
    const body = await request.json() as any;
    const newMessage = {
      id: `msg_${Date.now()}`,
      channel: body.channel,
      author: body.author || 'user',
      text: body.text,
      ts: Date.now(),
      reactions: [],
    };
    return HttpResponse.json(newMessage);
  }),

  http.post('/api/mock/chat/poll', async ({ request }) => {
    const body = await request.json() as any;
    const poll = {
      id: `poll_${Date.now()}`,
      question: body.question,
      options: body.options,
      votes: {},
      createdAt: Date.now(),
    };
    return HttpResponse.json(poll);
  }),

  // Personas
  http.get('/api/mock/personas', () => {
    return HttpResponse.json(personas);
  }),

  http.post('/api/mock/personas/set', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, persona: body?.persona });
  }),

  // Notifications
  http.get('/api/mock/notifications', () => {
    return HttpResponse.json(notifications);
  }),

  http.post('/api/mock/notifications/mark-read', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, id: body?.id });
  }),

  // Commissioner
  http.get('/api/mock/commissioner/tasks', () => {
    return HttpResponse.json(commissionerTasks);
  }),

  http.post('/api/mock/commissioner/task/toggle', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ success: true, taskId: body?.taskId });
  }),

  http.get('/api/mock/audit-log', () => {
    return HttpResponse.json(auditLog);
  }),

  http.get('/api/mock/key-dates', () => {
    return HttpResponse.json(keyDates);
  }),

  http.post('/api/mock/key-dates/save', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true, dates: body });
  }),

  // Injuries
  http.get('/api/mock/injuries', () => {
    return HttpResponse.json(injuryApocalypse);
  }),

  // Terminal
  http.post('/api/mock/terminal/execute', async ({ request }) => {
    const body = await request.json() as any;
    const command = body.command || '';
    
    let output = { json: {}, summary: '' };
    
    if (command.includes('league status')) {
      output = {
        json: { league: demoLeagues[0], teams: demoLeagues[0].teams.length },
        summary: `League "${demoLeagues[0].name}" has ${demoLeagues[0].teams.length} teams. Current week: ${demoLeagues[0].currentWeek}.`,
      };
    } else if (command.includes('generate report')) {
      const weekMatch = command.match(/week (\d+)/);
      const week = weekMatch ? weekMatch[1] : '4';
      output = {
        json: { week, status: 'generated' },
        summary: `Week ${week} report generated successfully.`,
      };
    } else if (command.includes('propose trade')) {
      output = {
        json: { trade: 'created', id: `trade_${Date.now()}` },
        summary: 'Trade proposal created and sent to involved teams.',
      };
    } else if (command.includes('set rule')) {
      output = {
        json: { rule: 'saved' },
        summary: 'Rule updated in league constitution.',
      };
    } else if (command.includes('export constitution')) {
      output = {
        json: { sections: rules.length },
        summary: `Constitution exported with ${rules.length} sections.`,
      };
    } else {
      output = {
        json: { error: 'Unknown command' },
        summary: 'Command not recognized. Try: league status, generate report week <n>, propose trade, set rule, export constitution',
      };
    }
    
    return HttpResponse.json(output);
  }),
];
