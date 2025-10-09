import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_APP_URL || 'https://thecommish.replit.app',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    env: {
      apiUrl: process.env.CYPRESS_API_URL || 'https://thecommish.replit.app',
      adminApiKey: process.env.CYPRESS_ADMIN_API_KEY,
      leagueUuid: process.env.CYPRESS_LEAGUE_UUID,
      discordChannelId: process.env.CYPRESS_DISCORD_CHANNEL_ID,
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      return config;
    },
  },
});
