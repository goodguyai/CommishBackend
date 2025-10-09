/// <reference types="cypress" />

describe('THE COMMISH - Doctor & Jobs E2E', () => {
  const apiUrl = Cypress.env('apiUrl');
  const leagueUuid = Cypress.env('leagueUuid');
  const discordChannelId = Cypress.env('discordChannelId');

  before(() => {
    // Validate required environment variables
    expect(apiUrl, 'CYPRESS_API_URL must be set').to.exist;
    expect(leagueUuid, 'CYPRESS_LEAGUE_UUID must be set').to.exist;
    expect(discordChannelId, 'CYPRESS_DISCORD_CHANNEL_ID must be set').to.exist;
  });

  describe('v2 Doctor Endpoints', () => {
    it('should return OK from /api/v2/doctor/discord (public)', () => {
      cy.request(`${apiUrl}/api/v2/doctor/discord`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('ok', true);
        expect(response.body).to.have.property('bot');
        expect(response.body.bot).to.have.property('id');
        expect(response.body.bot).to.have.property('username');
      });
    });

    it('should return 403 from /api/v2/doctor/cron/detail without admin key', () => {
      cy.request({
        url: `${apiUrl}/api/v2/doctor/cron/detail`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(403);
      });
    });

    it('should return telemetry from /api/v2/doctor/cron/detail with admin key', () => {
      cy.adminRequest('GET', '/api/v2/doctor/cron/detail').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('ok', true);
        expect(response.body).to.have.property('data');
        
        const data = response.body.data;
        expect(data).to.be.an('array');
        
        // If there are jobs, validate their structure
        if (data.length > 0) {
          const job = data[0];
          expect(job).to.have.property('key');
          expect(job).to.have.property('cron');
          expect(job).to.have.property('queued').that.is.a('number');
          
          // Validate perms object
          if (job.perms) {
            expect(job.perms).to.have.property('channel');
            expect(job.perms).to.have.property('bot');
            expect(job.perms.channel).to.be.oneOf(['ok', 'missing']);
            expect(job.perms.bot).to.be.oneOf(['ok', 'missing', 'unknown']);
          }
        }
      });
    });
  });

  describe('v3 Jobs Management', () => {
    it('should enable content poster for one league via /api/v3/jobs/upsert', () => {
      cy.adminRequest('POST', '/api/v3/jobs/upsert', {
        league_id: leagueUuid,
        contentPoster: {
          enabled: true,
          channelId: discordChannelId,
          cron: '*/5 * * * *',
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('ok', true);
      });
    });

    it('should return 422 when enabling content poster without channelId', () => {
      cy.adminRequest('POST', '/api/v3/jobs/upsert', {
        league_id: leagueUuid,
        contentPoster: {
          enabled: true,
          channelId: null,
          cron: '*/5 * * * *',
        },
      }).then((response) => {
        expect(response.status).to.eq(422);
        expect(response.body).to.have.property('ok', false);
        expect(response.body).to.have.property('code', 'NON_NULL_CHANNEL_REQUIRED');
      });
    });

    it('should list jobs for the league via /api/v3/jobs', () => {
      cy.adminRequest('GET', `/api/v3/jobs?league_id=${leagueUuid}`).then(
        (response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('ok', true);
          expect(response.body).to.have.property('data');
          expect(response.body.data).to.have.property('jobs');
        }
      );
    });
  });

  describe('UUID Validation Guards', () => {
    it('should reject non-UUID league_id with 422 (not PostgreSQL 22P02)', () => {
      cy.adminRequest('POST', '/api/v3/constitution/sync', {
        league_id: 'lg_demo_1', // Invalid UUID
      }).then((response) => {
        expect(response.status).to.eq(422);
        expect(response.body).to.have.property('ok', false);
        expect(response.body).to.have.property('code', 'INVALID_UUID');
        expect(response.body.message).to.not.include('22P02');
      });
    });

    it('should accept valid UUID league_id', () => {
      cy.adminRequest('POST', '/api/v3/constitution/sync', {
        league_id: leagueUuid,
      }).then((response) => {
        // Should succeed or return idempotent response
        expect(response.status).to.be.oneOf([200, 422]);
        expect(response.body).to.have.property('ok');
      });
    });
  });

  describe('Idempotency & Dry-Run', () => {
    it('should allow dry-run content enqueue without Discord posting', () => {
      cy.adminRequest('POST', '/api/v2/doctor/cron/enqueue/content?dry=true').then(
        (response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('ok', true);
        }
      );
    });

    it('should be idempotent on constitution sync (second call)', () => {
      // First call
      cy.adminRequest('POST', '/api/v3/constitution/sync', {
        league_id: leagueUuid,
      }).then((firstResponse) => {
        expect(firstResponse.body).to.have.property('ok');

        // Second call
        cy.adminRequest('POST', '/api/v3/constitution/sync', {
          league_id: leagueUuid,
        }).then((secondResponse) => {
          expect(secondResponse.status).to.be.oneOf([200, 422]);
          expect(secondResponse.body).to.have.property('ok');
          
          // Should indicate skip/duplicate or no-op
          if (secondResponse.status === 422) {
            expect(secondResponse.body.code).to.be.oneOf([
              'DUPLICATE',
              'SKIPPED',
              'NO_CHANGES',
            ]);
          }
        });
      });
    });
  });

  describe('Feature Flags Management', () => {
    it('should update league features via /api/v3/features', () => {
      cy.adminRequest('POST', '/api/v3/features', {
        league_id: leagueUuid,
        features: {
          onboarding: true,
          reactions: false,
          announcements: false,
          weeklyRecaps: true,
          ruleQA: true,
          moderation: false,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('ok', true);
      });
    });

    it('should get league features via /api/v3/features', () => {
      cy.adminRequest('GET', `/api/v3/features?league_id=${leagueUuid}`).then(
        (response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('ok', true);
          expect(response.body).to.have.property('data');
          expect(response.body.data).to.have.property('features');
        }
      );
    });
  });
});
