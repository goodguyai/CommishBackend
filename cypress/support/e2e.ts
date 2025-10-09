// Cypress E2E support file
// This runs before each test file

import './commands';

// Prevent TypeScript errors on Cypress
declare global {
  namespace Cypress {
    interface Chainable {
      adminRequest(
        method: string,
        url: string,
        body?: any
      ): Chainable<Cypress.Response<any>>;
    }
  }
}
