import { test } from '@playwright/test';

const APP = 'https://6af4d371-c976-42de-b33d-bd2947b222c0-00-2brktdylk8a4w.kirk.replit.dev';

test('Diagnostic: Test dev server directly', async ({ page }) => {
  console.log('=== Testing Dev Server Home Page ===');
  await page.goto(APP, { waitUntil: 'networkidle', timeout: 30000 });
  
  const demoButton = await page.$('[data-testid="cta-try-demo"]');
  console.log('Demo button exists:', !!demoButton);
  
  const betaButton = await page.$('[data-testid="cta-activate-beta"]');
  console.log('Beta button exists:', !!betaButton);
  
  if (demoButton && betaButton) {
    console.log('SUCCESS: data-testid attributes found in dev server!');
  } else {
    console.log('FAIL: data-testid attributes still missing');
  }
});
