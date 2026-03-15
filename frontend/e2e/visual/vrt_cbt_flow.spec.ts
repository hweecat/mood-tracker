import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for the AI-powered CBT Journaling Flow.
 * These tests ensure the premium design tokens (glassmorphism, amber highlights, brain icons)
 * remain consistent across updates.
 */
test.describe('CBT Flow Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Log browser console messages
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Navigate to login
    await page.goto('/login');
    
    // Wait for initial body to be present
    await page.waitForSelector('body');
    
    // Check for hydration to ensure the form is interactive
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible({ timeout: 10000 });
    await expect(loginForm).toHaveAttribute('data-hydrated', 'true', { timeout: 15000 });
    
    // Perform login (using demo credentials as seen in Selenium tests)
    console.log('FILLING LOGIN FORM');
    await page.fill('#username', 'demo');
    await page.fill('#password', 'demo');
    
    console.log('CLICKING SUBMIT');
    await page.click('button[type="submit"]');
    
    // Wait for redirect and dashboard elements
    console.log('WAITING FOR DASHBOARD');
    try {
      // Instead of waitForURL, wait for a key element on the dashboard
      await expect(page.locator('button[aria-label="Journal"]')).toBeVisible({ timeout: 20000 });
      console.log('DASHBOARD LOADED - JOURNAL BUTTON VISIBLE');
    } catch (e) {
      console.log('DASHBOARD FAILED TO LOAD - TAKING ERROR SCREENSHOT');
      await page.screenshot({ path: '/tmp/login-failure-state.png' });
      const currentUrl = page.url();
      console.log('URL at failure:', currentUrl);
      const content = await page.content();
      console.log('HTML content length:', content.length);
      throw e;
    }

    // Mock the analysis API
    await page.route('**/api/v1/cbt-logs/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          distortions: ['All-or-Nothing Thinking'],
          reframe_suggestion: 'I can learn from my mistakes even if I am not perfect.'
        })
      });
    });
  });

  test('CBT Journal Step 1 Visual Baseline', async ({ page }) => {
    // Navigate to Journal - based on accessibility test selectors
    // Navigate to Journal tab using explicit label
    await page.click('button[aria-label="Journal"]');
    
    // Wait for the form card to be visible
    const card = page.locator('.card').first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(/CBT Journal/i);
    
    // Allow animations to settle
    await page.waitForTimeout(1000);
    
    // Take a snapshot of the Step 1 card as baseline
    await expect(card).toHaveScreenshot('cbt-step-1-baseline.png');
  });

  test('AI Suggestion Amber Highlight Visual', async ({ page }) => {
    await page.click('button[aria-label="Journal"]');
    
    // Step 1: Situation
    await page.fill('#situation-textarea', 'My boss ignored my greeting this morning.');
    await page.click('button:has-text("Next Step")');
    
    // Wait for Step 2 heading
    await expect(page.locator('text=Automatic Thoughts')).toBeVisible();
    
    // Increase viewport height to ensure everything is visible
    await page.setViewportSize({ width: 1280, height: 1200 });

    // Step 2: Automatic Thoughts
    const thoughtsTextarea = page.locator('#thoughts-textarea');
    await thoughtsTextarea.click();
    const thought = 'He is going to fire me because I am incompetent.';
    await thoughtsTextarea.fill(thought);
    await thoughtsTextarea.blur(); // Explicit blur
    
    // Verify text is present
    await expect(thoughtsTextarea).toHaveValue(thought);
    
    // DEBUG: Check card inner HTML
    const cardHtml = await page.locator('.card').first().innerHTML();
    console.log('CARD HTML:', cardHtml);

    // DEBUG: Check for ALL buttons on the page
    const buttons = await page.$$eval('button', (btns) => btns.map(b => ({ text: b.textContent?.trim(), visible: b.checkVisibility(), html: b.outerHTML })));
    console.log('VISIBLE BUTTONS:', JSON.stringify(buttons, null, 2));

    const aiBtn = page.locator('button:has-text("Seek AI Perspective")');
    
    // Ensure the button is scrolled into view and visible
    await aiBtn.scrollIntoViewIfNeeded();
    await expect(aiBtn).toBeVisible({ timeout: 10000 });
    
    // Log state
    const isDisabled = await aiBtn.evaluate((el) => (el as HTMLButtonElement).disabled);
    console.log(`Button "Seek AI Perspective" disabled: ${isDisabled}`);
    
    await expect(aiBtn).toBeEnabled({ timeout: 15000 });
    await aiBtn.click();
    
    // Wait for analysis to complete (loading state finishes)
    await expect(aiBtn).toContainText('Seek AI Perspective', { timeout: 25000 });
    await expect(aiBtn).toBeEnabled();
    
    // Move to Step 3 - click the visible Next Step button in the current card
    console.log('CLICKING NEXT STEP ON STEP 2');
    await page.locator('.card button:has-text("Next Step")').click();
    
    // Wait for Step 3 identification content to be absolutely certain
    console.log('WAITING FOR STEP 3 CONTENT');
    await expect(page.locator('h3:has-text("3. Identification")')).toBeVisible({ timeout: 15000 });
    
    // Allow animations and state updates to settle
    await page.waitForTimeout(3000);
    
    // Take a debug screenshot
    await page.screenshot({ path: '/tmp/debug-step3.png' });
    console.log('DEBUG SCREENSHOT TAKEN: /tmp/debug-step3.png');
    
    // Take a snapshot of the Step 3 card
    const card = page.locator('.card').first();
    console.log('TAKING FINAL SNAPSHOT: cbt-step-3-ai-highlights.png');
    await expect(card).toHaveScreenshot('cbt-step-3-ai-highlights.png');
    console.log('SCREENSHOT TAKEN SUCCESSFULLY');
  });
});
