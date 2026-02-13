const puppeteer = require('puppeteer');
const fetch = global.fetch || require('node-fetch');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const TEST_USER_ID = process.env.TEST_USER_ID || '5ef0e56f-7486-4f63-a4e3-8b0833ac164d';

(async () => {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  console.log('Navigating to app:', APP_URL);
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });

  // Try to find the Send Praise button by text
  const [button] = await page.$x("//button[contains(., 'Send Praise')]");
  if (!button) {
    console.error('Send Praise button not found on page');
    await browser.close();
    process.exit(2);
  }

  console.log('Clicking Send Praise button...');
  await button.click();

  // wait briefly for UI/network
  await page.waitForTimeout(1200);

  // Call the API directly to confirm notification created
  console.log('Fetching notifications from API...');
  const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(TEST_USER_ID)}/notifications`);
  const payload = await res.json();
  console.log('API response status:', res.status);
  console.log(JSON.stringify(payload, null, 2));

  await browser.close();
  process.exit(0);
})();
