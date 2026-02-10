import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { Result } from 'axe-core';
import * as fs from 'fs';
import * as path from 'path';

// Import AxeBuilder using require for CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
const axeWebdriverjs = require('axe-webdriverjs');
const AxeBuilder = axeWebdriverjs.default || axeWebdriverjs;

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const REPORT_DIR = path.join(process.cwd(), 'reports');

// Ensure reports directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR);
}

interface AxeResult {
  url: string;
  violations: Result[];
  passes: Result[];
}

async function runAccessibilityTests() {
  console.log('Starting Accessibility Tests...');
  
  const chromeOptions = new Options();
  chromeOptions.addArguments('--headless=new'); // Run in headless mode (new engine)
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--window-size=1920,1080');

  const driver: WebDriver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  const results: AxeResult[] = [];

  try {
    // 1. Perform Login
    console.log(`Logging in to ${APP_URL}/login...`);
    await driver.get(`${APP_URL}/login`);
    
    // Wait for mounted state (since we use useEffect to set mounted=true)
    await driver.sleep(3000);
    
    let usernameInput;
    try {
      usernameInput = await driver.wait(until.elementLocated(By.id('username')), 20000);
    } catch (e) {
      console.error('Failed to find username input. Page source:');
      console.log(await driver.getPageSource());
      throw e;
    }
    const passwordInput = await driver.findElement(By.id('password'));
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));

    await usernameInput.sendKeys('demo');
    await passwordInput.sendKeys('demo');
    await submitButton.click();

    // Wait for redirect to dashboard and the nav to appear
    console.log('Login submitted, waiting for dashboard...');
    await driver.wait(until.elementLocated(By.css('nav')), 10000);
    console.log('Dashboard loaded, starting page analysis...');

    const pages = [
      { name: 'Dashboard', path: '/', selector: 'nav button:nth-child(1)' },
      { name: 'Mood Check-in', path: '/mood', selector: 'nav button:nth-child(2)' }, 
      { name: 'Journal', path: '/journal', selector: 'nav button:nth-child(3)' },
      { name: 'Insights', path: '/insights', selector: 'nav button:nth-child(4)' },
    ];

    for (const page of pages) {
      console.log(`Testing: ${page.name}`);
      
      // Click the nav button if we're already on the page (Dashboard is first)
      if (page.path !== '/') {
        const navButton = await driver.wait(until.elementLocated(By.css(page.selector)), 10000);
        await navButton.click();
        // Wait for the active tab state or a specific element on the tab to appear
        // Increase sleep to allow all animations (fade-in, slide-in) to finish completely
        await driver.sleep(5000); 
      } else {
        // Initial load wait
        await driver.sleep(5000);
      }
      
      const currentUrl = await driver.getCurrentUrl();
      
      // Analyze with Axe
      const builder = new AxeBuilder(driver);
      const result = await builder.analyze();

      results.push({
        url: currentUrl,
        violations: result.violations,
        passes: result.passes
      });

      if (result.violations.length > 0) {
        console.error(`❌ ${result.violations.length} violations found on ${page.name}`);
      } else {
        console.log(`✅ No violations found on ${page.name}`);
      }
    }
  } catch (err) {
    console.error('An error occurred during testing:', err);
    process.exit(1);
  } finally {
    await driver.quit();
  }

  generateReports(results);
}

function generateReports(results: AxeResult[]) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const jsonPath = path.join(REPORT_DIR, `accessibility-report-${timestamp}.json`);
  const mdPath = path.join(REPORT_DIR, `accessibility-report-${timestamp}.md`);

  // Write JSON Report
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`JSON Report saved to: ${jsonPath}`);

  // Write Markdown Summary
  let mdContent = `# Accessibility Test Report\n\n**Date:** ${new Date().toLocaleString()}\n\n`;
  
  let totalViolations = 0;

  results.forEach(res => {
    mdContent += `## Page: ${res.url}\n\n`;
    if (res.violations.length === 0) {
      mdContent += `✅ **Pass** - No violations found.\n\n`;
    } else {
      totalViolations += res.violations.length;
      mdContent += `❌ **Fail** - ${res.violations.length} violations found.\n\n`;
      mdContent += `| Impact | ID | Description | Help |\n`;
      mdContent += `|---|---|---|---|
`;
      res.violations.forEach((v: Result) => {
        mdContent += `| **${v.impact}** | \`${v.id}\` | ${v.description} | [Link](${v.helpUrl}) |\n`;
      });
      mdContent += `\n`;
    }
  });

  mdContent += `---\n**Total Violations across all pages:** ${totalViolations}\n`;

  fs.writeFileSync(mdPath, mdContent);
  console.log(`Markdown Report saved to: ${mdPath}`);
  
  if (totalViolations > 0) {
    console.error(`\nTest failed with ${totalViolations} total violations.`);
    process.exit(1); 
  } else {
    console.log('\nAll accessibility tests passed!');
  }
}

runAccessibilityTests();