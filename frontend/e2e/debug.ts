import { Builder, WebDriver, By } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';

async function debug() {
  const chromeOptions = new Options();
  chromeOptions.addArguments('--headless=new');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');

  const driver: WebDriver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  try {
    console.log('Fetching login page...');
    await driver.get('http://localhost:3000/login');
    await driver.sleep(5000);
    const source = await driver.getPageSource();
    console.log('Page Source snippet:');
    console.log(source.substring(0, 2000));
    
    const elements = await driver.findElements(By.css('input'));
    console.log(`Found ${elements.length} input elements`);
    for (const el of elements) {
        console.log('Input id:', await el.getAttribute('id'), 'type:', await el.getAttribute('type'));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await driver.quit();
  }
}

debug();
