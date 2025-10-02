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

// Stateful stores for session persistence (using localStorage)
function getRulesStore() {
  const stored = localStorage.getItem('msw_rules');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [...rules];
    }
  }
  return [...rules];
}

function setRulesStore(newRules: any[]) {
  localStorage.setItem('msw_rules', JSON.stringify(newRules));
}

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
        fairnessScore: 85,
        timestamp: Date.now() - 3600_000,
      },
      {
        id: 't2',
        teams: ['The Replacements', 'End Zone Elite'],
        give: ['QB Backup'],
        get: ['WR Flex'],
        status: 'approved',
        fairnessScore: 92,
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

  // Rules (stateful with localStorage persistence)
  http.get('/api/mock/rules', () => {
    return HttpResponse.json(getRulesStore());
  }),

  http.post('/api/mock/rules/save', async ({ request }) => {
    const body = await request.json() as any;
    const currentRules = getRulesStore();
    let savedRule;
    
    if (body.id) {
      // Update existing rule
      const index = currentRules.findIndex((r: any) => r.id === body.id);
      if (index !== -1) {
        currentRules[index] = body;
        savedRule = body;
      }
    } else {
      // Create new rule with generated ID
      const newRule = {
        ...body,
        id: `r${Date.now()}`,
      };
      currentRules.push(newRule);
      savedRule = newRule;
    }
    
    setRulesStore(currentRules);
    return HttpResponse.json({ success: true, rule: savedRule });
  }),

  http.delete('/api/mock/rules/:id', async ({ params }) => {
    const { id } = params;
    const currentRules = getRulesStore();
    const index = currentRules.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      currentRules.splice(index, 1);
      setRulesStore(currentRules);
    }
    return HttpResponse.json({ success: true });
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

  // Dashboard Stats
  http.get('/api/mock/dashboard/stats', () => {
    return HttpResponse.json({
      activeLeagues: 0,
      rulesQueries: 127,
      upcomingDeadlines: 5,
      aiTokensUsed: '2.1K',
    });
  }),

  http.get('/api/mock/integrations/discord', () => {
    return HttpResponse.json({
      botName: 'Fantasy Football League',
      server: 'Dynasty League • 247 members',
      online: true,
      permissions: 'Configured',
      slashCommands: 'Registered',
      webhookVerification: 'Active',
    });
  }),

  http.get('/api/mock/integrations/sleeper', () => {
    return HttpResponse.json({
      leagueName: 'Dynasty League 2024',
      leagueId: '1234567890',
      season: 2024,
      week: 14,
      lastSync: '2 min ago',
      cacheStatus: 'Fresh',
      apiCalls: '23/1000',
    });
  }),

  http.get('/api/mock/slash-commands', () => {
    return HttpResponse.json([
      {
        command: '/rules',
        access: 'Public',
        description: 'Query league rules and constitution',
        features: ['RAG-powered responses', 'Context references', 'Define follow-up pattern'],
      },
      {
        command: '/deadlines',
        access: 'Public',
        description: 'View upcoming league deadlines',
        features: ['Timeline-aware', 'Countdown display', 'Exportable responses'],
      },
      {
        command: '/scoring',
        access: 'Public',
        description: 'Display current scoring settings',
        features: ['Simpler syntax', 'Formatted tables', 'Quick reference'],
      },
      {
        command: '/config',
        access: 'Commish Only',
        description: 'Configure bot settings',
        features: ['Feature flags', 'Channel settings', 'Permission controls'],
      },
      {
        command: '/remind',
        access: 'Commish Only',
        description: 'Set league RAG reminders',
        features: ['Force embedding refresh', 'Completion parsing', 'Progress tracking'],
      },
      {
        command: '/help',
        access: 'Public',
        description: 'Show command help',
        features: ['Command examples', 'Quick reference', 'Support links'],
      },
    ]);
  }),

  http.get('/api/mock/rag/status', () => {
    return HttpResponse.json({
      constitutionVersion: 'v2.1',
      uploadedAgo: '3 days ago',
      sections: 47,
      embeddings: 312,
      vectorDim: 1536,
      avgSimilarity: 0.84,
      recentQueries: [
        'What happens if someone misses the draft?',
        'Trade deadline rules for this year?',
        'Playoff seeding tiebreakers?',
      ],
    });
  }),

  http.get('/api/mock/ai/status', () => {
    return HttpResponse.json({
      model: 'deepseek-chat',
      functionCalling: 'Enabled',
      requestsToday: 89,
      avgResponse: '1.2s',
      cacheHit: 67,
      tokensUsed: 2147,
      tokenUsagePercent: 21,
    });
  }),

  http.get('/api/mock/activity', () => {
    return HttpResponse.json([
      {
        id: 'a1',
        icon: '🏈',
        text: 'Sleeper sync completed',
        details: 'Dynasty League 2024 • 5 minutes ago',
        timestamp: '200ms',
      },
      {
        id: 'a2',
        icon: '⚡',
        text: '/rules command executed',
        details: 'John (@blitznblitz) • Jan 2, 8 minutes ago',
        timestamp: '1.1s',
      },
      {
        id: 'a3',
        icon: '📊',
        text: 'Weekly digest generated',
        details: 'Sent to #general channel • about 1 hour ago',
        timestamp: '1.4s',
      },
      {
        id: 'a4',
        icon: '📚',
        text: 'Constitution reindexed',
        details: '312 embeddings updated • about 3 hours ago',
        timestamp: '43.0s',
      },
    ]);
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
