import { test, expect } from '@playwright/test';

// ----- CONFIG -----
// Use DEV_SERVER_URL for testing during cache issues, otherwise use production URL
const APP = process.env.DEV_SERVER_URL || process.env.APP_BASE_URL || 'https://thecommish.replit.app';

// Use real IDs from your setup/dashboard if you have them
const KNOWN = {
  guildId: process.env.TEST_GUILD_ID || '',
  channelId: process.env.TEST_CHANNEL_ID || '',
  leagueId: process.env.TEST_LEAGUE_ID || '',
  sleeperUser: process.env.TEST_SLEEPER_USER || '',
  adminKey: process.env.ADMIN_KEY || ''
};

// Attach console/network logging to each test
test.beforeEach(async ({ page }, testInfo) => {
  page.on('console', msg => console.log(`[console][${testInfo.title}]`, msg.type(), msg.text()));
  page.on('pageerror', err => console.log(`[pageerror][${testInfo.title}]`, err.message));
  page.on('requestfailed', req => console.log(`[requestfailed][${testInfo.title}]`, req.method(), req.url(), req.failure()?.errorText));
});

// Helper: verify JSON API returns JSON, not HTML
async function expectJson(page: any, url: string) {
  const res = await page.request.get(url, { headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }});
  const ct = res.headers()['content-type'] || '';
  expect(ct).toContain('application/json');
  const status = res.status();
  expect(status).toBeLessThan(500);
  return res.json();
}

test('01 Home page loads and CTAs exist', async ({ page }) => {
  await page.goto(APP, { waitUntil: 'networkidle' });
  
  // Wait for HomeCTAs component to load
  await page.waitForSelector('[data-testid="cta-try-demo"]', { timeout: 10000 });
  
  await expect(page.getByTestId('cta-try-demo')).toBeVisible();
  await expect(page.getByTestId('cta-activate-beta')).toBeVisible();
  await page.screenshot({ path: 'qa__01_home.png', fullPage: true });
});

test('02 Demo activation flow (no auth required)', async ({ page }) => {
  await page.goto(APP, { waitUntil: 'networkidle' });
  
  // Wait for button to be visible
  await page.waitForSelector('[data-testid="cta-try-demo"]', { timeout: 10000 });
  await page.getByTestId('cta-try-demo').click();
  
  // Wait for navigation to complete
  await page.waitForURL(/\/(app|dashboard)/, { timeout: 10000 });
  
  // Now check for demo badge and dashboard
  await expect(page.getByTestId('badge-mode-demo')).toBeVisible();
  await expect(page.getByTestId('dashboard-root')).toBeVisible();
  await page.screenshot({ path: 'qa__02_demo_dashboard.png', fullPage: true });
});

test('03 Setup Wizard visible and resumable', async ({ page }) => {
  await page.goto(`${APP}/setup`, { waitUntil: 'networkidle' });
  
  // Wait for wizard to load - check for the currently visible step
  // Setup wizard shows ONE step at a time, so check for any of the step containers
  await page.waitForSelector('[data-testid^="setup-step-"]', { timeout: 10000 });
  
  // Verify at least one step is visible (wizard is functional)
  const visibleStep = await page.$('[data-testid^="setup-step-"]');
  expect(visibleStep).toBeTruthy();
  
  await page.screenshot({ path: 'qa__03_setup.png', fullPage: true });
});

test('04 API sanity: health/events/leagues endpoints return JSON', async ({ page }) => {
  await expectJson(page, `${APP}/api/health`);
  await expectJson(page, `${APP}/api/events?limit=3`);
  if (KNOWN.leagueId) {
    await expectJson(page, `${APP}/api/v2/leagues/${KNOWN.leagueId}`);
  }
});

test('05 Discord channels listing (if guildId provided)', async ({ page }) => {
  test.skip(!KNOWN.guildId, 'No TEST_GUILD_ID provided');
  const data = await expectJson(page, `${APP}/api/v2/discord/channels?guildId=${KNOWN.guildId}`);
  expect(Array.isArray(data.data)).toBeTruthy();
});

test('06 Owners mapping UI + API', async ({ page }) => {
  await page.goto(`${APP}/app`, { waitUntil: 'networkidle' });
  
  // Wait for dashboard to load, then wait for owner mapping card
  await page.waitForSelector('[data-testid="dashboard-root"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="card-owner-mapping"]', { timeout: 10000 });
  
  await expect(page.getByTestId('card-owner-mapping')).toBeVisible();
  await page.screenshot({ path: 'qa__06_owners.png', fullPage: true });

  if (KNOWN.leagueId) {
    const owners = await expectJson(page, `${APP}/api/v2/owners?leagueId=${KNOWN.leagueId}`);
    expect(Array.isArray(owners.data)).toBeTruthy();
  }
});

test('07 Reminders create/list (custom)', async ({ page }) => {
  test.skip(!KNOWN.leagueId, 'No TEST_LEAGUE_ID set for reminders');
  const create = await page.request.post(`${APP}/api/leagues/${KNOWN.leagueId}/reminders`, {
    headers: { 'Content-Type': 'application/json' },
    data: {
      channelId: KNOWN.channelId || null,
      text: 'Set your lineup!',
      cron: '0 15 * * SAT'
    }
  });
  expect(create.status()).toBeLessThan(500);

  const list = await expectJson(page, `${APP}/api/leagues/${KNOWN.leagueId}/reminders`);
  expect(Array.isArray(list.data)).toBeTruthy();
});

test('08 RAG: index & search (MVP text)', async ({ page }) => {
  test.skip(!KNOWN.leagueId, 'No TEST_LEAGUE_ID set for RAG');
  const idx = await page.request.post(`${APP}/api/rag/index/${KNOWN.leagueId}`, {
    headers: { 'Content-Type': 'application/json' },
    data: { content: 'SECTION 1: Draft is in August.', contentType: 'text/plain', title: 'TestDoc', version: 'test' }
  });
  expect([200,201].includes(idx.status())).toBeTruthy();

  const srch = await page.request.post(`${APP}/api/rag/search/${KNOWN.leagueId}`, {
    headers: { 'Content-Type': 'application/json' },
    data: { query: 'When is the draft?' }
  });
  expect(srch.status()).toBeLessThan(500);
});

test('09 Engagement: quick poll create', async ({ page }) => {
  test.skip(!KNOWN.leagueId, 'No TEST_LEAGUE_ID set for polls');
  const res = await page.request.post(`${APP}/api/v2/polls`, {
    headers: { 'Content-Type': 'application/json' },
    data: { leagueId: KNOWN.leagueId, question: 'Who wins?', options: ['Me','You'], durationMinutes: 10 }
  });
  expect(res.status()).toBeLessThan(500);
});

test('10 Digest preview (admin-only)', async ({ page }) => {
  test.skip(!KNOWN.leagueId || !KNOWN.adminKey, 'Need TEST_LEAGUE_ID and ADMIN_KEY');
  const res = await page.request.post(`${APP}/api/v2/digest/preview?leagueId=${KNOWN.leagueId}`, {
    headers: { 'X-Admin-Key': KNOWN.adminKey }
  });
  expect(res.status()).toBeLessThan(500);
});
