import { Builder, WebDriver, By, until } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function runLoginTest() {
  console.log('Starting Login Flow Test...');
  
  const chromeOptions = new Options();
  chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--window-size=1920,1080');

  const driver: WebDriver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    console.log(`Navigating to ${APP_URL}/login...`);
    await driver.get(`${APP_URL}/login`);
    
    // Wait for the login form to be visible
    await driver.wait(until.elementLocated(By.id('username')), 5000);
    
    const usernameInput = await driver.findElement(By.id('username'));
    const passwordInput = await driver.findElement(By.id('password'));
    const submitButton = await driver.findElement(By.css('button[type="submit"]'));

    console.log('Entering demo credentials...');
    await usernameInput.sendKeys('demo');
    await passwordInput.sendKeys('demo');
    await submitButton.click();

    // Wait for the dashboard to load (look for the "MindfulTrack" header or a nav element)
    console.log('Waiting for dashboard redirection...');
    await driver.wait(until.elementLocated(By.css('nav')), 10000);
    
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.endsWith('/') || currentUrl.includes('/dashboard')) {
        console.log('✅ Login successful! Redirected to dashboard.');
    } else {
        throw new Error(`Unexpected redirection URL: ${currentUrl}`);
    }

  } catch (err) {
    console.error('❌ Login test failed:', err);
    process.exit(1);
  } finally {
    await driver.quit();
  }
}

runLoginTest();
