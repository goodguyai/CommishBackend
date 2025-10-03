import { test } from '@playwright/test';

const APP = 'https://thecommish.replit.app';

test('Diagnostic: Take screenshots of all pages', async ({ page }) => {
  console.log('=== Testing Home Page ===');
  await page.goto(APP, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'diagnostic__home.png', fullPage: true });
  
  const html = await page.content();
  console.log('Home page HTML length:', html.length);
  console.log('Title:', await page.title());
  
  // Check if elements exist in DOM
  const demoButton = await page.$('[data-testid="cta-try-demo"]');
  console.log('Demo button exists:', !!demoButton);
  
  const betaButton = await page.$('[data-testid="cta-activate-beta"]');
  console.log('Beta button exists:', !!betaButton);
  
  console.log('\n=== Testing /app Page ===');
  await page.goto(`${APP}/app`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'diagnostic__app.png', fullPage: true });
  
  const dashboardRoot = await page.$('[data-testid="dashboard-root"]');
  console.log('Dashboard root exists:', !!dashboardRoot);
  
  console.log('\n=== Testing /setup Page ===');
  await page.goto(`${APP}/setup`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'diagnostic__setup.png', fullPage: true });
  
  const setupDiscord = await page.$('[data-testid="setup-step-discord"]');
  console.log('Setup Discord step exists:', !!setupDiscord);
});
