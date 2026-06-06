import { expect, Page, test } from '@playwright/test';
import { createServer, Server, ServerResponse } from 'node:http';

const VIEWPORTS = [
  { width: 320, height: 900 },
  { width: 375, height: 900 },
  { width: 390, height: 900 },
  { width: 768, height: 1000 },
  { width: 1280, height: 900 },
];

let mockBackend: Server | null = null;

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization,content-type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
}

async function startMockBackend() {
  if (mockBackend) return;

  mockBackend = createServer((req, res) => {
    const url = req.url || '';

    if (req.method === 'OPTIONS') {
      sendJson(res, 200, {});
      return;
    }

    if (url === '/api/v1/auth/login' && req.method === 'POST') {
      sendJson(res, 200, { access_token: 'visual-token', accessToken: 'visual-token' });
      return;
    }

    if (url === '/api/v1/users/me' && req.method === 'GET') {
      sendJson(res, 200, { id: 'visual-user', name: 'Demo User', email: 'demo@example.com' });
      return;
    }

    if ((url === '/api/v1/moods/' || url === '/api/v1/cbt-logs/') && req.method === 'GET') {
      sendJson(res, 200, []);
      return;
    }

    if ((url === '/api/v1/moods/' || url === '/api/v1/cbt-logs/') && req.method === 'POST') {
      sendJson(res, 200, {});
      return;
    }

    sendJson(res, 404, { detail: 'Not found' });
  });

  await new Promise<void>((resolve, reject) => {
    mockBackend?.once('error', reject);
    mockBackend?.listen(8123, resolve);
  });
}

async function login(page: Page) {
  await page.goto('/login');
  await expect(page.locator('form')).toHaveAttribute('data-hydrated', 'true');
  await page.fill('#identifier', 'demo');
  await page.fill('#password', 'demo');
  await page.click('button[type="submit"]', { noWaitAfter: true });
  await page.waitForURL('**/', { timeout: 30000 });
  await expect(page.locator('button[aria-label="Journal"]')).toBeVisible({ timeout: 20000 });
}

async function mockCBTAnalysis(page: Page) {
  await page.route('**/api/v1/cbt-logs/analyze', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysisId: 'analysis-visual',
        suggestions: [
          {
            id: 'distortion-1',
            distortion: 'All-or-Nothing Thinking',
            reasoning: 'The thought treats one difficult moment as a total outcome.',
            confidence: 0.91,
          },
        ],
        reframes: [
          {
            id: 'reframe-1',
            perspective: 'Compassionate',
            content: 'This was uncomfortable, and I can take one useful lesson from it without judging my whole self.',
          },
        ],
        actionPlans: [
          {
            id: 'plan-1',
            title: 'Ask for feedback',
            rationale: 'A short follow-up can turn uncertainty into specifics.',
            steps: ['Write two questions', 'Book a short check-in'],
            timeframe: 'today',
          },
        ],
        provider: 'mock',
        model: 'mock-cbt',
        promptVersion: 'visual-test',
      }),
    });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    htmlOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyOverflow: document.body.scrollWidth > document.body.clientWidth,
    htmlScrollWidth: document.documentElement.scrollWidth,
    htmlClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
  }));

  expect(overflow).toEqual(expect.objectContaining({
    htmlOverflow: false,
    bodyOverflow: false,
  }));
}

async function expectVisibleButtonsAreTappable(page: Page) {
  const smallButtons = await page.locator('button:visible').evaluateAll(buttons => {
    return buttons
      .map(button => {
        const rect = button.getBoundingClientRect();
        const label = button.getAttribute('aria-label') || button.textContent?.trim() || button.outerHTML;
        return { label, width: rect.width, height: rect.height };
      })
      .filter(button => button.label !== 'Open Next.js Dev Tools')
      .filter(button => button.height < 44 || button.width < 44);
  });

  expect(smallButtons).toEqual([]);
}

test.describe('CBT mobile usability flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await startMockBackend();
  });

  test.afterAll(async () => {
    await new Promise<void>(resolve => {
      if (!mockBackend) {
        resolve();
        return;
      }
      mockBackend.close(() => resolve());
      mockBackend = null;
    });
  });

  test.beforeEach(async ({ page }) => {
    await mockCBTAnalysis(page);
  });

  for (const viewport of VIEWPORTS) {
    test(`has no horizontal overflow and tappable controls at ${viewport.width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await login(page);
      await page.getByRole('navigation', { name: /main navigation/i }).getByRole('button', { name: 'Journal' }).click();
      await expect(page.getByRole('heading', { name: /cbt journal entry/i })).toBeVisible();

      await expectNoHorizontalOverflow(page);
      await expectVisibleButtonsAreTappable(page);

      await page.fill('#situation-textarea', 'A difficult work conversation with a long label that should wrap safely.');
      await page.getByRole('button', { name: /next step/i }).click();
      await expect(page.getByLabel(/automatic thoughts/i)).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectVisibleButtonsAreTappable(page);

      await page.fill('#thoughts-textarea', 'I ruined everything and there is no way to recover.');
      await page.getByRole('button', { name: /seek ai perspective/i }).click();
      await expect(page.getByRole('button', { name: /seek ai perspective/i })).toBeEnabled({ timeout: 15000 });
      await page.getByRole('button', { name: /next step/i }).click();
      await expect(page.getByText(/3\. Identification/i)).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectVisibleButtonsAreTappable(page);

      await page.getByRole('button', { name: /next step/i }).click();
      await expect(page.getByRole('button', { name: /accept compassionate reframe/i })).toBeVisible();
      await page.getByRole('button', { name: /accept compassionate reframe/i }).click();
      await expectNoHorizontalOverflow(page);
      await expectVisibleButtonsAreTappable(page);

      await page.getByRole('button', { name: /next step/i }).click();
      await expect(page.getByRole('button', { name: /accept ask for feedback action plan/i })).toBeVisible();
      await page.getByRole('button', { name: /accept ask for feedback action plan/i }).click();
      await expectNoHorizontalOverflow(page);
      await expectVisibleButtonsAreTappable(page);

      await page.screenshot({
        path: testInfo.outputPath(`cbt-flow-${viewport.width}.png`),
        fullPage: true,
      });
    });
  }
});
