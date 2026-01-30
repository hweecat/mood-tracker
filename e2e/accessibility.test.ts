import { Builder, WebDriver } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import AxeBuilder = require('axe-webdriverjs');
import { Result } from 'axe-core';
import * as fs from 'fs';
import * as path from 'path';

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
  chromeOptions.addArguments('--headless'); // Run in headless mode
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--window-size=1920,1080');

  const driver: WebDriver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  const pages = [
    { name: 'Dashboard', path: '/' },
    { name: 'Mood Check-in', path: '/mood' }, // Assuming strictly client side nav might need explicit waits, but direct URL load is safer for unique page tests
    { name: 'Journal', path: '/journal' },
    // Add more pages as needed
  ];

  const results: AxeResult[] = [];

  try {
    for (const page of pages) {
      const url = `${APP_URL}${page.path === '/' ? '' : page.path}`;
      console.log(`Testing: ${page.name} (${url})`);
      
      await driver.get(url);
      
      // Give it a moment to render (simple wait)
      await driver.sleep(2000);

      // Analyze with Axe
      const builder = new AxeBuilder(driver);
      const result = await builder.analyze();

      results.push({
        url: url,
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
      res.violations.forEach(v => {
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
