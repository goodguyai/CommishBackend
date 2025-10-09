// Custom Cypress commands for THE COMMISH E2E tests

Cypress.Commands.add('adminRequest', (method: string, url: string, body?: any) => {
  const apiUrl = Cypress.env('apiUrl');
  const adminApiKey = Cypress.env('adminApiKey');

  if (!adminApiKey) {
    throw new Error('CYPRESS_ADMIN_API_KEY is not set');
  }

  return cy.request({
    method,
    url: `${apiUrl}${url}`,
    headers: {
      'Authorization': `Bearer ${adminApiKey}`,
      'Content-Type': 'application/json',
    },
    body,
    failOnStatusCode: false,
  });
});
