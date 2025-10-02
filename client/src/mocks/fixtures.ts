export const demoLeagues = [
  {
    id: "lg_demo_1",
    name: "Demo League One",
    platform: "Sleeper",
    scoring: "Half-PPR",
    teams: [
      { id: "t1", name: "Birds of Prey", owner: "alice@example.com", faab: 67 },
      { id: "t2", name: "Gridiron Geeks", owner: "bob@example.com", faab: 45 },
      { id: "t3", name: "The Replacements", owner: "charlie@example.com", faab: 82 },
      { id: "t4", name: "End Zone Elite", owner: "diana@example.com", faab: 23 },
      { id: "t5", name: "Touchdown Titans", owner: "evan@example.com", faab: 91 },
      { id: "t6", name: "Field Goal Fanatics", owner: "fiona@example.com", faab: 54 },
      { id: "t7", name: "Blitz Brigade", owner: "george@example.com", faab: 38 },
      { id: "t8", name: "Hail Mary Heroes", owner: "hannah@example.com", faab: 76 },
      { id: "t9", name: "Red Zone Rebels", owner: "ivan@example.com", faab: 12 },
      { id: "t10", name: "Pigskin Pioneers", owner: "julia@example.com", faab: 65 },
      { id: "t11", name: "Clutch Commanders", owner: "kevin@example.com", faab: 29 },
      { id: "t12", name: "Overtime Outlaws", owner: "lisa@example.com", faab: 48 },
    ],
    weeks: [1, 2, 3, 4, 5],
    currentWeek: 4,
  },
];

export const waiverSuggestions = [
  {
    id: "w1",
    player: "RB J. Rookie",
    team: "BUF",
    pos: "RB",
    suggestFaab: 18,
    note: "Lead back while starter recovers.",
  },
  {
    id: "w2",
    player: "WR T. Breakout",
    team: "LAC",
    pos: "WR",
    suggestFaab: 12,
    note: "Targets rising 3 weeks straight.",
  },
  {
    id: "w3",
    player: "TE R. Sleeper",
    team: "KC",
    pos: "TE",
    suggestFaab: 8,
    note: "TE1 went to IR, clear path to volume.",
  },
  {
    id: "w4",
    player: "QB P. Streamer",
    team: "TB",
    pos: "QB",
    suggestFaab: 5,
    note: "Favorable matchup this week.",
  },
  {
    id: "w5",
    player: "RB H. Handcuff",
    team: "SF",
    pos: "RB",
    suggestFaab: 15,
    note: "Must-own if you have CMC.",
  },
  {
    id: "w6",
    player: "WR D. Depth",
    team: "MIA",
    pos: "WR",
    suggestFaab: 6,
    note: "WR2 may miss time, target share bump.",
  },
];

export const tradeOpportunities = [
  {
    id: "trg1",
    targetTeamId: "t2",
    give: ["RB BenchGuy"],
    get: ["WR T. Breakout"],
    rationale: "They're RB rich, WR needy.",
  },
  {
    id: "trg2",
    targetTeamId: "t5",
    give: ["TE Surplus"],
    get: ["RB Flex Play"],
    rationale: "TE depth for RB depth swap.",
  },
  {
    id: "trg3",
    targetTeamId: "t8",
    give: ["WR Boom/Bust", "2024 4th"],
    get: ["RB Consistent"],
    rationale: "Upgrade to safer floor.",
  },
];

export const matchups = [
  {
    week: 4,
    homeTeamId: "t1",
    awayTeamId: "t2",
    homeProj: 122.4,
    awayProj: 116.7,
    volatility: "Medium",
    coachNote: "Consider safer WR3 due to weather forecast.",
  },
  {
    week: 4,
    homeTeamId: "t3",
    awayTeamId: "t4",
    homeProj: 108.2,
    awayProj: 114.5,
    volatility: "Low",
    coachNote: "Both teams relatively stable.",
  },
  {
    week: 4,
    homeTeamId: "t5",
    awayTeamId: "t6",
    homeProj: 131.8,
    awayProj: 119.3,
    volatility: "High",
    coachNote: "Multiple boom/bust players on both sides.",
  },
  {
    week: 4,
    homeTeamId: "t7",
    awayTeamId: "t8",
    homeProj: 118.6,
    awayProj: 121.1,
    volatility: "Medium",
    coachNote: "Close matchup, RB2 slots could decide it.",
  },
  {
    week: 4,
    homeTeamId: "t9",
    awayTeamId: "t10",
    homeProj: 102.7,
    awayProj: 126.4,
    volatility: "Low",
    coachNote: "t10 heavily favored.",
  },
  {
    week: 4,
    homeTeamId: "t11",
    awayTeamId: "t12",
    homeProj: 115.2,
    awayProj: 117.8,
    volatility: "Medium",
    coachNote: "TE matchups are key this week.",
  },
];

export const startSitAlerts = [
  { id: "al1", teamId: "t1", msg: "Starting a player on BYE at TE." },
  { id: "al2", teamId: "t2", msg: "High injury risk flagged for RB2." },
  { id: "al3", teamId: "t5", msg: "Weather advisory: heavy wind for WR1 game." },
  { id: "al4", teamId: "t7", msg: "QB on questionable tag, monitor status." },
  { id: "al5", teamId: "t9", msg: "Starting player listed as OUT." },
];

export const rules = [
  {
    id: "r1",
    title: "Trade Veto Policy",
    body: "Trades require 4 veto votes within 24 hours to be overturned. Commissioner has final say in collusion cases.",
  },
  {
    id: "r2",
    title: "FAAB Budget",
    body: "Season-long FAAB of 100. Ties broken by reverse standings. Minimum bid is $0.",
  },
  {
    id: "r3",
    title: "Keeper Rules",
    body: "Keep up to 2 players. Cost is 1 round earlier than drafted. Undrafted FAs cost 10th round pick.",
  },
  {
    id: "r4",
    title: "Playoff Structure",
    body: "Top 6 teams make playoffs. Weeks 15-17. Top 2 seeds get first-round bye.",
  },
  {
    id: "r5",
    title: "Roster Moves",
    body: "Unlimited adds/drops during season. Lineup locks at game time (not weekly).",
  },
];

export const chatThreads = [
  {
    id: "c1",
    channel: "general",
    author: "The Commish",
    text: "Week 4 report has been posted to the Reports tab.",
    ts: Date.now() - 3600_000,
    reactions: [{ emoji: "👍", count: 3 }],
  },
  {
    id: "c2",
    channel: "waivers",
    author: "alice",
    text: "Queued WR T. Breakout for 12 FAAB. Thoughts?",
    ts: Date.now() - 1800_000,
    reactions: [],
  },
  {
    id: "c3",
    channel: "trades",
    author: "bob",
    text: "Anyone need a RB? I've got depth and need WR help.",
    ts: Date.now() - 900_000,
    reactions: [{ emoji: "🤔", count: 2 }],
  },
  {
    id: "c4",
    channel: "smack-talk",
    author: "charlie",
    text: "My team is injury-proof this year. Watch out! 💪",
    ts: Date.now() - 600_000,
    reactions: [{ emoji: "😂", count: 5 }],
  },
  {
    id: "c5",
    channel: "general",
    author: "The Commish",
    text: "Reminder: Trade deadline is Week 11.",
    ts: Date.now() - 7200_000,
    reactions: [],
  },
];

export const personas = [
  {
    id: "neutral",
    name: "Neutral",
    desc: "Plain, concise updates. Straight to the point.",
  },
  {
    id: "sassy",
    name: "Sassy",
    desc: "Playful tone with light sarcasm. Keeps it fun.",
  },
  {
    id: "batman",
    name: "Batman",
    desc: "Terse, vigilant metaphors. The hero your league needs.",
  },
  {
    id: "yoda",
    name: "Yoda",
    desc: "Inverted syntax, brief wisdom. Much to learn, you have.",
  },
];

export const notifications = [
  { id: "n1", text: "3 waiver claims simulated for Week 4.", read: false },
  { id: "n2", text: "Trade offer from Gridiron Geeks pending.", read: false },
  { id: "n3", text: "Weekly report generated successfully.", read: true },
];

export const commissionerTasks = [
  { id: "task1", text: "Review pending trade between Birds of Prey and Gridiron Geeks", done: false },
  { id: "task2", text: "Approve rule change proposal for keeper settings", done: false },
  { id: "task3", text: "Post Week 4 report to league chat", done: true },
  { id: "task4", text: "Check injury updates for starting lineups", done: false },
  { id: "task5", text: "Set playoff bracket seeds", done: false },
];

export const auditLog = [
  { id: "log1", action: "Trade created", user: "alice", details: "Proposed trade with bob", timestamp: Date.now() - 3600_000 },
  { id: "log2", action: "Rule edited", user: "The Commish", details: "Updated FAAB policy", timestamp: Date.now() - 7200_000 },
  { id: "log3", action: "Report posted", user: "The Commish", details: "Week 4 report", timestamp: Date.now() - 10800_000 },
  { id: "log4", action: "Waiver claim", user: "charlie", details: "Claimed WR D. Depth for $6", timestamp: Date.now() - 14400_000 },
];

export const keyDates = [
  { id: "d1", event: "Trade Deadline", date: "2025-11-15", reminderEnabled: true },
  { id: "d2", event: "Keeper Lock", date: "2025-08-15", reminderEnabled: true },
  { id: "d3", event: "Playoffs Start", date: "2025-12-15", reminderEnabled: false },
  { id: "d4", event: "Championship Week", date: "2025-12-22", reminderEnabled: false },
];
