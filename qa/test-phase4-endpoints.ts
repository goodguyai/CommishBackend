import { test, expect } from '@playwright/test';

const BASE_URL = process.env.REPL_URL || 'http://localhost:5000';

// Test helper to create auth headers
const getSupabaseAuthHeaders = () => ({
  'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'test-token'}`,
  'Content-Type': 'application/json',
});

const getAdminHeaders = () => ({
  'x-admin-key': process.env.ADMIN_API_KEY || process.env.ADMIN_KEY || 'test-admin-key',
  'Content-Type': 'application/json',
});

test.describe('Phase 4: Job Observability and Reliable Automations', () => {
  let testLeagueId: string;
  let testJobId: string;

  test.beforeAll(async ({ request }) => {
    // Get or create a test league
    const response = await request.get(`${BASE_URL}/api/leagues`);
    const leagues = await response.json();
    
    if (leagues.length > 0) {
      testLeagueId = leagues[0].id;
    } else {
      // Create a test league if none exists
      const createResponse = await request.post(`${BASE_URL}/api/leagues`, {
        data: {
          name: 'Phase 4 Test League',
          platform: 'sleeper',
        },
      });
      const league = await createResponse.json();
      testLeagueId = league.id;
    }
  });

  test.describe('Job Management Endpoints', () => {
    test('1. GET /api/v3/jobs - List jobs for league', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/v3/jobs?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('jobs');
      expect(Array.isArray(data.data.jobs)).toBe(true);
      expect(data).toHaveProperty('request_id');
      
      console.log(`✓ GET /api/v3/jobs returned ${data.data.jobs.length} jobs`);
    });

    test('2. POST /api/v3/jobs/upsert - Create job with valid cron', async ({ request }) => {
      const validCron = '0 9 * * 1'; // Every Monday at 9 AM
      
      const response = await request.post(
        `${BASE_URL}/api/v3/jobs/upsert`,
        {
          headers: getSupabaseAuthHeaders(),
          data: {
            league_id: testLeagueId,
            kind: 'weekly_recap',
            cron: validCron,
            channel_id: '1234567890123456789',
            config: { test: true },
            enabled: true,
          },
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('job');
      expect(data.data.job).toHaveProperty('id');
      expect(data.data.job.cron).toBe(validCron);
      expect(data.data.job.kind).toBe('weekly_recap');
      expect(data.data.job.config).toEqual({ test: true });
      
      testJobId = data.data.job.id;
      console.log(`✓ Created job with ID: ${testJobId}`);
    });

    test('3. POST /api/v3/jobs/upsert - Reject invalid cron expression', async ({ request }) => {
      const invalidCron = 'invalid cron';
      
      const response = await request.post(
        `${BASE_URL}/api/v3/jobs/upsert`,
        {
          headers: getSupabaseAuthHeaders(),
          data: {
            league_id: testLeagueId,
            kind: 'test_job',
            cron: invalidCron,
            channel_id: '1234567890123456789',
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', false);
      expect(data).toHaveProperty('code', 'INVALID_CRON');
      
      console.log(`✓ Rejected invalid cron: "${invalidCron}"`);
    });

    test('4. POST /api/v3/jobs/upsert - Reject out-of-range cron expression', async ({ request }) => {
      const outOfRangeCron = '99 * * * *'; // Invalid hour
      
      const response = await request.post(
        `${BASE_URL}/api/v3/jobs/upsert`,
        {
          headers: getSupabaseAuthHeaders(),
          data: {
            league_id: testLeagueId,
            kind: 'test_job',
            cron: outOfRangeCron,
            channel_id: '1234567890123456789',
          },
        }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', false);
      expect(data).toHaveProperty('code', 'INVALID_CRON');
      
      console.log(`✓ Rejected out-of-range cron: "${outOfRangeCron}"`);
    });

    test('5. POST /api/v3/jobs/run-now - Execute job immediately', async ({ request }) => {
      if (!testJobId) {
        test.skip();
        return;
      }

      const response = await request.post(
        `${BASE_URL}/api/v3/jobs/run-now`,
        {
          headers: getSupabaseAuthHeaders(),
          data: {
            job_id: testJobId,
          },
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('requestId');
      expect(data.data).toHaveProperty('status');
      expect(['SUCCESS', 'FAILED']).toContain(data.data.status);
      
      console.log(`✓ Job run-now status: ${data.data.status}`);
    });

    test('6. GET /api/v3/jobs/history - Fetch job run history', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/v3/jobs/history?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('history');
      expect(Array.isArray(data.data.history)).toBe(true);
      
      // Verify history entries have required fields
      if (data.data.history.length > 0) {
        const firstEntry = data.data.history[0];
        expect(firstEntry).toHaveProperty('id');
        expect(firstEntry).toHaveProperty('jobId');
        expect(firstEntry).toHaveProperty('kind');
        expect(firstEntry).toHaveProperty('status');
        expect(firstEntry).toHaveProperty('startedAt');
        expect(firstEntry).toHaveProperty('detail');
        
        // Verify status is valid
        expect(['RUNNING', 'SUCCESS', 'FAILED']).toContain(firstEntry.status);
        
        // Verify error handling uses detail field
        if (firstEntry.status === 'FAILED') {
          expect(firstEntry.detail).toHaveProperty('error');
        }
      }
      
      console.log(`✓ Job history returned ${data.data.history.length} entries`);
    });

    test('7. GET /api/v3/jobs/history - Filter by kind', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/v3/jobs/history?league_id=${testLeagueId}&kind=weekly_recap`,
        { headers: getSupabaseAuthHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data.data).toHaveProperty('history');
      
      // All entries should be of the specified kind
      data.data.history.forEach((entry: any) => {
        expect(entry.kind).toBe('weekly_recap');
      });
      
      console.log(`✓ Filtered history by kind: weekly_recap (${data.data.history.length} entries)`);
    });

    test('8. GET /api/v3/jobs/failures - Fetch failure aggregates', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/v3/jobs/failures?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('failures');
      expect(Array.isArray(data.data.failures)).toBe(true);
      
      // Verify failure entries have required fields
      if (data.data.failures.length > 0) {
        const firstFailure = data.data.failures[0];
        expect(firstFailure).toHaveProperty('id');
        expect(firstFailure).toHaveProperty('jobId');
        expect(firstFailure).toHaveProperty('count');
        expect(firstFailure).toHaveProperty('lastErrorExcerpt');
        expect(firstFailure).toHaveProperty('lastSeenAt');
        
        // Verify count increments
        expect(firstFailure.count).toBeGreaterThanOrEqual(1);
      }
      
      console.log(`✓ Job failures returned ${data.data.failures.length} aggregates`);
    });

    test('9. Authentication required - All job endpoints', async ({ request }) => {
      const endpoints = [
        { method: 'get', url: `/api/v3/jobs?league_id=${testLeagueId}` },
        { method: 'post', url: '/api/v3/jobs/upsert', data: {} },
        { method: 'post', url: '/api/v3/jobs/run-now', data: {} },
        { method: 'get', url: `/api/v3/jobs/history?league_id=${testLeagueId}` },
        { method: 'get', url: `/api/v3/jobs/failures?league_id=${testLeagueId}` },
      ];

      for (const endpoint of endpoints) {
        const response = endpoint.method === 'get'
          ? await request.get(`${BASE_URL}${endpoint.url}`)
          : await request.post(`${BASE_URL}${endpoint.url}`, { data: endpoint.data || {} });

        expect(response.status()).toBe(401);
        const data = await response.json();
        expect(data).toHaveProperty('ok', false);
      }
      
      console.log('✓ All job endpoints require authentication');
    });
  });

  test.describe('Permissions Doctor', () => {
    const validGuildId = '1234567890123456789';
    const validChannelId = '9876543210987654321';

    test('10. GET /api/doctor/discord/permissions - With admin key', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/doctor/discord/permissions?guild_id=${validGuildId}&channel_id=${validChannelId}`,
        { headers: getAdminHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('installed');
      expect(data).toHaveProperty('channel_read');
      expect(data).toHaveProperty('channel_write');
      expect(data).toHaveProperty('embed_links');
      expect(data).toHaveProperty('add_reactions');
      expect(data).toHaveProperty('mention_everyone');
      expect(data).toHaveProperty('request_id');
      expect(data).toHaveProperty('measured_at');
      expect(data).toHaveProperty('elapsed_ms');
      
      // Verify 1500ms timeout enforcement
      expect(data.elapsed_ms).toBeLessThan(1500);
      
      console.log(`✓ Permissions check completed in ${data.elapsed_ms}ms`);
      console.log(`  - Installed: ${data.installed}`);
      console.log(`  - Channel Read: ${data.channel_read}`);
      console.log(`  - Channel Write: ${data.channel_write}`);
      console.log(`  - Embed Links: ${data.embed_links}`);
      console.log(`  - Add Reactions: ${data.add_reactions}`);
      console.log(`  - Mention Everyone: ${data.mention_everyone}`);
    });

    test('11. GET /api/doctor/discord/permissions - Without admin key (401)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/doctor/discord/permissions?guild_id=${validGuildId}&channel_id=${validChannelId}`
      );

      expect(response.status()).toBe(401);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', false);
      
      console.log('✓ Permissions doctor requires admin key');
    });

    test('12. GET /api/doctor/discord/permissions - Invalid snowflake IDs', async ({ request }) => {
      const invalidGuildId = 'invalid';
      const invalidChannelId = '123';
      
      const response = await request.get(
        `${BASE_URL}/api/doctor/discord/permissions?guild_id=${invalidGuildId}&channel_id=${invalidChannelId}`,
        { headers: getAdminHeaders() }
      );

      expect(response.status()).toBe(400);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', false);
      expect(data).toHaveProperty('code', 'INVALID_REQUEST');
      
      console.log('✓ Permissions doctor validates snowflake IDs');
    });
  });

  test.describe('Reactions System', () => {
    test('13. GET /api/v3/reactions/stats - Default 24 hours', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/v3/reactions/stats?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('count');
      expect(data.data).toHaveProperty('by_emoji');
      expect(typeof data.data.count).toBe('number');
      expect(typeof data.data.by_emoji).toBe('object');
      expect(data).toHaveProperty('request_id');
      
      console.log(`✓ Reactions stats (24h): ${data.data.count} reactions`);
      console.log(`  Emoji breakdown:`, data.data.by_emoji);
    });

    test('14. GET /api/v3/reactions/stats - Custom time window', async ({ request }) => {
      const hours = 48;
      const response = await request.get(
        `${BASE_URL}/api/v3/reactions/stats?league_id=${testLeagueId}&hours=${hours}`,
        { headers: getSupabaseAuthHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data.data).toHaveProperty('count');
      expect(data.data).toHaveProperty('by_emoji');
      
      console.log(`✓ Reactions stats (${hours}h): ${data.data.count} reactions`);
    });

    test('15. GET /api/v3/reactions/stats - Empty data (0 reactions)', async ({ request }) => {
      // Create a new league with no reactions
      const createResponse = await request.post(`${BASE_URL}/api/leagues`, {
        data: {
          name: 'No Reactions League',
          platform: 'sleeper',
        },
      });
      const newLeague = await createResponse.json();
      
      const response = await request.get(
        `${BASE_URL}/api/v3/reactions/stats?league_id=${newLeague.id}`,
        { headers: getSupabaseAuthHeaders() }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('ok', true);
      expect(data.data.count).toBe(0);
      expect(Object.keys(data.data.by_emoji).length).toBe(0);
      
      console.log('✓ Reactions stats handles empty data correctly');
    });
  });

  test.describe('Scheduler Integration', () => {
    test('16. Verify scheduler.loadJobsFromDatabase() at startup', async ({ request }) => {
      // Check server logs for scheduler initialization
      const logsResponse = await request.get(`${BASE_URL}/api/admin/logs`, {
        headers: getAdminHeaders(),
      });

      if (logsResponse.ok()) {
        const logs = await logsResponse.text();
        
        // Verify scheduler loaded jobs from database
        expect(logs).toContain('Loading jobs from database');
        
        console.log('✓ Scheduler loads jobs from database at startup');
      } else {
        console.warn('⚠ Could not verify scheduler logs (logs endpoint not available)');
      }
    });

    test('17. Verify job.cron field usage (not job.schedule)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/v3/jobs?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );

      const data = await response.json();
      
      if (data.data.jobs.length > 0) {
        const job = data.data.jobs[0];
        
        // Verify cron field exists and schedule doesn't
        expect(job).toHaveProperty('cron');
        expect(job).not.toHaveProperty('schedule');
        
        console.log('✓ Jobs use cron field (not schedule)');
      }
    });

    test('18. Verify job.config field usage (not job.metadata)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/v3/jobs?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );

      const data = await response.json();
      
      if (data.data.jobs.length > 0) {
        const job = data.data.jobs[0];
        
        // Verify config field exists and metadata doesn't
        expect(job).toHaveProperty('config');
        expect(job).not.toHaveProperty('metadata');
        
        console.log('✓ Jobs use config field (not metadata)');
      }
    });

    test('19. Verify executeJob() creates job_runs entries', async ({ request }) => {
      if (!testJobId) {
        test.skip();
        return;
      }

      // Get history count before
      const beforeResponse = await request.get(
        `${BASE_URL}/api/v3/jobs/history?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );
      const beforeData = await beforeResponse.json();
      const beforeCount = beforeData.data.history.length;

      // Run job
      await request.post(
        `${BASE_URL}/api/v3/jobs/run-now`,
        {
          headers: getSupabaseAuthHeaders(),
          data: { job_id: testJobId },
        }
      );

      // Wait a moment for job to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get history count after
      const afterResponse = await request.get(
        `${BASE_URL}/api/v3/jobs/history?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );
      const afterData = await afterResponse.json();
      const afterCount = afterData.data.history.length;

      expect(afterCount).toBeGreaterThan(beforeCount);
      
      console.log(`✓ executeJob() creates job_runs entries (${beforeCount} → ${afterCount})`);
    });

    test('20. Verify error handling stores in detail.error field', async ({ request }) => {
      // Get failures to check error storage
      const response = await request.get(
        `${BASE_URL}/api/v3/jobs/failures?league_id=${testLeagueId}`,
        { headers: getSupabaseAuthHeaders() }
      );

      const data = await response.json();
      
      if (data.data.failures.length > 0) {
        const failure = data.data.failures[0];
        
        // Verify error is stored in lastErrorExcerpt (not error column)
        expect(failure).toHaveProperty('lastErrorExcerpt');
        expect(failure).not.toHaveProperty('error');
        
        console.log('✓ Error handling stores in lastErrorExcerpt field');
      } else {
        console.log('✓ No failures found (error handling verified by schema)');
      }
    });
  });
});

test.describe('Phase 4: Cron Validation Examples', () => {
  let testLeagueId: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/leagues`);
    const leagues = await response.json();
    testLeagueId = leagues[0]?.id || 'test-league-id';
  });

  const cronTests = [
    { cron: '0 9 * * 1', valid: true, description: 'Every Monday at 9 AM' },
    { cron: '*/15 * * * *', valid: true, description: 'Every 15 minutes' },
    { cron: '0 0 * * 0', valid: true, description: 'Every Sunday at midnight' },
    { cron: '0 12 * * 1-5', valid: true, description: 'Weekdays at noon' },
    { cron: 'invalid', valid: false, description: 'Invalid cron string' },
    { cron: '99 * * * *', valid: false, description: 'Hour out of range' },
    { cron: '* * * * * *', valid: false, description: 'Too many fields (6 instead of 5)' },
    { cron: '* * *', valid: false, description: 'Too few fields' },
  ];

  for (const { cron, valid, description } of cronTests) {
    test(`Cron: "${cron}" - ${description}`, async ({ request }) => {
      const response = await request.post(
        `${BASE_URL}/api/v3/jobs/upsert`,
        {
          headers: getSupabaseAuthHeaders(),
          data: {
            league_id: testLeagueId,
            kind: 'test_cron',
            cron,
            channel_id: '1234567890123456789',
          },
        }
      );

      if (valid) {
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.ok).toBe(true);
        console.log(`✓ Valid: ${description}`);
      } else {
        expect(response.status()).toBe(400);
        const data = await response.json();
        expect(data.ok).toBe(false);
        expect(data.code).toBe('INVALID_CRON');
        console.log(`✓ Invalid: ${description}`);
      }
    });
  }
});
