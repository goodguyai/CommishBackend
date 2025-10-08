/**
 * Phase 4 Job Observability and Reliable Automations Testing
 * Tests job management endpoints, permissions doctor, reactions stats, and scheduler integration
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  method: string;
  testCase: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  error?: string;
  responseExample?: any;
  notes?: string;
}

const testResults: TestResult[] = [];
let testLeagueId = '';
let testJobId = '';

function addResult(result: TestResult) {
  testResults.push(result);
  const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${result.method} ${result.endpoint} - ${result.testCase}: ${result.status}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.statusCode) {
    console.log(`   Status Code: ${result.statusCode}`);
  }
  if (result.notes) {
    console.log(`   Notes: ${result.notes}`);
  }
}

async function testEndpoint(
  method: string,
  endpoint: string,
  testCase: string,
  options: {
    headers?: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
    expectedStatus?: number;
    notes?: string;
    skipAuth?: boolean;
  } = {}
): Promise<any> {
  try {
    let url = `${BASE_URL}${endpoint}`;
    
    if (options.queryParams) {
      const params = new URLSearchParams(options.queryParams);
      url += `?${params.toString()}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (options.body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const resp = await fetch(url, fetchOptions);
    const data = await resp.json().catch(() => ({}));

    const passed = options.expectedStatus ? resp.status === options.expectedStatus : resp.ok;

    addResult({
      endpoint,
      method,
      testCase,
      status: passed ? 'PASS' : 'FAIL',
      statusCode: resp.status,
      responseExample: data,
      notes: options.notes,
    });

    return data;
  } catch (error: any) {
    addResult({
      endpoint,
      method,
      testCase,
      status: 'FAIL',
      error: error.message,
      notes: options.notes,
    });
    return null;
  }
}

async function runTests() {
  console.log('\n🧪 Phase 4: Job Observability and Reliable Automations Test Suite\n');

  const mockToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const adminKey = process.env.ADMIN_API_KEY || process.env.ADMIN_KEY || '';

  // Setup: Get a test league
  console.log('📋 Setup: Finding test league...\n');
  const leaguesData = await testEndpoint('GET', '/api/leagues', 'Get leagues list', {
    expectedStatus: 200,
  });
  
  if (leaguesData && leaguesData.length > 0) {
    testLeagueId = leaguesData[0].id;
    console.log(`   Using league ID: ${testLeagueId}\n`);
  } else {
    console.log('   ⚠️  No leagues found, using mock UUID\n');
    testLeagueId = '123e4567-e89b-12d3-a456-426614174000';
  }

  console.log('='.repeat(80));
  console.log('SECTION 1: Job Management Endpoints (5 endpoints)');
  console.log('='.repeat(80) + '\n');

  // Test 1: GET /api/v3/jobs - List jobs
  await testEndpoint('GET', '/api/v3/jobs', 'List jobs without auth', {
    queryParams: { league_id: testLeagueId },
    expectedStatus: 401,
    notes: 'Should require Supabase authentication',
  });

  const jobsData = await testEndpoint('GET', '/api/v3/jobs', 'List jobs with auth', {
    headers: { 'Authorization': mockToken },
    queryParams: { league_id: testLeagueId },
    expectedStatus: 200,
    notes: 'Should return jobs array',
  });

  // Test 2: POST /api/v3/jobs/upsert - Create job with valid cron
  const validCronJob = await testEndpoint('POST', '/api/v3/jobs/upsert', 'Create job with valid cron (0 9 * * 1)', {
    headers: { 'Authorization': mockToken },
    body: {
      league_id: testLeagueId,
      kind: 'weekly_recap',
      cron: '0 9 * * 1',
      channel_id: '1234567890123456789',
      config: { test: true },
      enabled: true,
    },
    expectedStatus: 200,
    notes: 'Every Monday at 9 AM',
  });

  if (validCronJob && validCronJob.data && validCronJob.data.job) {
    testJobId = validCronJob.data.job.id;
    console.log(`   Created job ID: ${testJobId}\n`);
  }

  // Test 3: POST /api/v3/jobs/upsert - Invalid cron validation
  await testEndpoint('POST', '/api/v3/jobs/upsert', 'Reject invalid cron string', {
    headers: { 'Authorization': mockToken },
    body: {
      league_id: testLeagueId,
      kind: 'test_job',
      cron: 'invalid cron',
      channel_id: '1234567890123456789',
    },
    expectedStatus: 400,
    notes: 'Should reject with INVALID_CRON code',
  });

  await testEndpoint('POST', '/api/v3/jobs/upsert', 'Reject out-of-range cron (99 * * * *)', {
    headers: { 'Authorization': mockToken },
    body: {
      league_id: testLeagueId,
      kind: 'test_job',
      cron: '99 * * * *',
      channel_id: '1234567890123456789',
    },
    expectedStatus: 400,
    notes: 'Hour 99 is out of range',
  });

  // Test 4: POST /api/v3/jobs/run-now - Execute job immediately
  if (testJobId) {
    await testEndpoint('POST', '/api/v3/jobs/run-now', 'Run job immediately', {
      headers: { 'Authorization': mockToken },
      body: { job_id: testJobId },
      expectedStatus: 200,
      notes: 'Should create job_runs entry',
    });
  }

  // Test 5: GET /api/v3/jobs/history - Job run history
  const historyData = await testEndpoint('GET', '/api/v3/jobs/history', 'Get job run history', {
    headers: { 'Authorization': mockToken },
    queryParams: { league_id: testLeagueId },
    expectedStatus: 200,
    notes: 'Should return history array from job_runs table',
  });

  if (historyData && historyData.data && historyData.data.history) {
    console.log(`   Found ${historyData.data.history.length} job runs\n`);
    
    if (historyData.data.history.length > 0) {
      const run = historyData.data.history[0];
      const hasRequiredFields = run.id && run.jobId && run.status && run.startedAt && run.detail;
      addResult({
        endpoint: '/api/v3/jobs/history',
        method: 'GET',
        testCase: 'Verify job_runs schema',
        status: hasRequiredFields ? 'PASS' : 'FAIL',
        notes: `Required fields: ${hasRequiredFields ? 'present' : 'missing'}`,
      });

      // Check status field values
      const validStatus = ['RUNNING', 'SUCCESS', 'FAILED'].includes(run.status);
      addResult({
        endpoint: '/api/v3/jobs/history',
        method: 'GET',
        testCase: 'Verify status field values',
        status: validStatus ? 'PASS' : 'FAIL',
        notes: `Status: ${run.status}`,
      });

      // Check error handling uses detail field
      if (run.status === 'FAILED' && run.detail && run.detail.error) {
        addResult({
          endpoint: '/api/v3/jobs/history',
          method: 'GET',
          testCase: 'Error stored in detail.error field',
          status: 'PASS',
          notes: 'Error correctly stored in detail field',
        });
      }
    }
  }

  await testEndpoint('GET', '/api/v3/jobs/history', 'Filter history by kind', {
    headers: { 'Authorization': mockToken },
    queryParams: { league_id: testLeagueId, kind: 'weekly_recap' },
    expectedStatus: 200,
    notes: 'Should filter by job kind',
  });

  // Test 6: GET /api/v3/jobs/failures - Failure aggregates
  const failuresData = await testEndpoint('GET', '/api/v3/jobs/failures', 'Get job failures', {
    headers: { 'Authorization': mockToken },
    queryParams: { league_id: testLeagueId },
    expectedStatus: 200,
    notes: 'Should return failures from job_failures table',
  });

  if (failuresData && failuresData.data && failuresData.data.failures) {
    console.log(`   Found ${failuresData.data.failures.length} job failures\n`);
    
    if (failuresData.data.failures.length > 0) {
      const failure = failuresData.data.failures[0];
      const hasRequiredFields = failure.jobId && failure.count && failure.lastErrorExcerpt && failure.lastSeenAt;
      addResult({
        endpoint: '/api/v3/jobs/failures',
        method: 'GET',
        testCase: 'Verify job_failures schema',
        status: hasRequiredFields ? 'PASS' : 'FAIL',
        notes: `Count: ${failure.count}, has lastErrorExcerpt: ${!!failure.lastErrorExcerpt}`,
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SECTION 2: Permissions Doctor');
  console.log('='.repeat(80) + '\n');

  const validGuildId = '1234567890123456789';
  const validChannelId = '9876543210987654321';

  // Test without admin key
  await testEndpoint('GET', '/api/doctor/discord/permissions', 'Without admin key (401)', {
    queryParams: { guild_id: validGuildId, channel_id: validChannelId },
    expectedStatus: 401,
    notes: 'Should require ADMIN_API_KEY or ADMIN_KEY header',
  });

  // Test with admin key
  if (adminKey) {
    const permsData = await testEndpoint('GET', '/api/doctor/discord/permissions', 'With admin key', {
      headers: { 'x-admin-key': adminKey },
      queryParams: { guild_id: validGuildId, channel_id: validChannelId },
      expectedStatus: 200,
      notes: 'Should return 6 permission checks + metadata',
    });

    if (permsData) {
      const has6Permissions = permsData.installed !== undefined &&
        permsData.channel_read !== undefined &&
        permsData.channel_write !== undefined &&
        permsData.embed_links !== undefined &&
        permsData.add_reactions !== undefined &&
        permsData.mention_everyone !== undefined;
      
      addResult({
        endpoint: '/api/doctor/discord/permissions',
        method: 'GET',
        testCase: 'Verify 6 permission checks',
        status: has6Permissions ? 'PASS' : 'FAIL',
        notes: `Permissions: ${has6Permissions ? 'all present' : 'missing'}`,
      });

      if (permsData.elapsed_ms) {
        addResult({
          endpoint: '/api/doctor/discord/permissions',
          method: 'GET',
          testCase: '1500ms timeout enforcement',
          status: permsData.elapsed_ms < 1500 ? 'PASS' : 'FAIL',
          notes: `Elapsed: ${permsData.elapsed_ms}ms`,
        });
      }
    }
  } else {
    console.log('   ⚠️  ADMIN_API_KEY not set, skipping admin key tests\n');
  }

  // Test invalid snowflake IDs
  await testEndpoint('GET', '/api/doctor/discord/permissions', 'Invalid snowflake IDs', {
    headers: { 'x-admin-key': adminKey || 'test' },
    queryParams: { guild_id: 'invalid', channel_id: '123' },
    expectedStatus: 400,
    notes: 'Should validate snowflake ID format (17-19 digits)',
  });

  console.log('\n' + '='.repeat(80));
  console.log('SECTION 3: Reactions System');
  console.log('='.repeat(80) + '\n');

  const reactionsData = await testEndpoint('GET', '/api/v3/reactions/stats', 'Get reactions stats (24h default)', {
    headers: { 'Authorization': mockToken },
    queryParams: { league_id: testLeagueId },
    expectedStatus: 200,
    notes: 'Should query bot_activity table for kind=reaction',
  });

  if (reactionsData && reactionsData.data) {
    const hasRequiredFields = reactionsData.data.count !== undefined && reactionsData.data.by_emoji !== undefined;
    addResult({
      endpoint: '/api/v3/reactions/stats',
      method: 'GET',
      testCase: 'Verify response schema',
      status: hasRequiredFields ? 'PASS' : 'FAIL',
      notes: `Count: ${reactionsData.data.count}, Emoji breakdown: ${JSON.stringify(reactionsData.data.by_emoji)}`,
    });
  }

  await testEndpoint('GET', '/api/v3/reactions/stats', 'Custom time window (48h)', {
    headers: { 'Authorization': mockToken },
    queryParams: { league_id: testLeagueId, hours: '48' },
    expectedStatus: 200,
    notes: 'Should filter by custom hours parameter',
  });

  console.log('\n' + '='.repeat(80));
  console.log('SECTION 4: Cron Validation Examples');
  console.log('='.repeat(80) + '\n');

  const cronTests = [
    { cron: '0 9 * * 1', valid: true, desc: 'Every Monday at 9 AM' },
    { cron: '*/15 * * * *', valid: true, desc: 'Every 15 minutes' },
    { cron: '0 0 * * 0', valid: true, desc: 'Every Sunday at midnight' },
    { cron: '0 12 * * 1-5', valid: true, desc: 'Weekdays at noon' },
    { cron: 'invalid', valid: false, desc: 'Invalid cron string' },
    { cron: '* * * * * *', valid: false, desc: 'Too many fields (6 vs 5)' },
    { cron: '* * *', valid: false, desc: 'Too few fields' },
  ];

  for (const { cron, valid, desc } of cronTests) {
    await testEndpoint('POST', '/api/v3/jobs/upsert', `Cron: "${cron}" - ${desc}`, {
      headers: { 'Authorization': mockToken },
      body: {
        league_id: testLeagueId,
        kind: 'test_cron',
        cron,
        channel_id: '1234567890123456789',
      },
      expectedStatus: valid ? 200 : 400,
      notes: valid ? 'Valid' : 'Should reject',
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;
  const total = testResults.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.method} ${r.endpoint}: ${r.testCase}`);
        if (r.error) console.log(`    Error: ${r.error}`);
        if (r.statusCode) console.log(`    Status Code: ${r.statusCode}`);
      });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
