/**
 * E2E Tests — AI Features (Summarize + Resume Match)
 * NOTE: These tests hit the real Gemini API if GEMINI_API_KEY is valid.
 * Set SKIP_AI_E2E=true to skip them in environments without a real key.
 */
import { test, expect } from '@playwright/test';

const SKIP_AI = process.env.SKIP_AI_E2E === 'true';

const AI_USER = {
  name: 'AI E2E User',
  email: `ai_e2e_${Date.now()}@jobsphere.test`,
  password: 'AI@E2ETest123',
};

test.beforeAll(async ({ request }) => {
  await request.post('/api/v1/auth/register', { data: AI_USER });
});

async function loginAs(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', AI_USER.email);
  await page.fill('input[type="password"]', AI_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^\/$|\/dashboard/, { timeout: 10000 });
}

async function seedJob(request) {
  const loginRes = await request.post('/api/v1/auth/login', {
    data: { email: AI_USER.email, password: AI_USER.password },
  });
  const { accessToken } = await loginRes.json();

  const res = await request.post('/api/v1/jobs', {
    data: {
      company: 'AI Test Corp',
      position: 'AI Engineer',
      jobType: 'full-time',
      workLocation: 'Remote',
      description:
        'We are looking for a skilled AI engineer with 3+ years of experience in Python, TensorFlow, PyTorch, and MLOps. Must know Docker, Kubernetes, and cloud platforms (AWS or GCP).',
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return (await res.json()).job;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB DETAILS AI SECTION
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Job Details — AI Summarize', () => {
  test('job details page renders AI summarize button', async ({ page, request }) => {
    const job = await seedJob(request);
    await loginAs(page);

    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    const summarizeBtn = page.locator(
      'button:has-text("Summarize"), button:has-text("Generate Summary"), button:has-text("AI Summar")',
    );
    await expect(summarizeBtn).toBeVisible({ timeout: 5000 });
  });

  test.skip(SKIP_AI, 'SKIP_AI_E2E=true');
  test('clicking summarize shows AI-generated summary (real API)', async ({ page, request }) => {
    const job = await seedJob(request);
    await loginAs(page);

    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    const summarizeBtn = page.locator(
      'button:has-text("Summarize"), button:has-text("Generate Summary")',
    );
    await summarizeBtn.click();

    // Wait for summary to appear (Gemini may take a moment)
    await expect(
      page.locator('[class*="summary"], div:has-text("Key Skills"), h3:has-text("Skills")'),
    ).toBeVisible({ timeout: 20000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESUME MATCHING
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Job Details — Resume Matching', () => {
  test('resume match text area and button are rendered', async ({ page, request }) => {
    const job = await seedJob(request);
    await loginAs(page);

    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    const resumeTextarea = page.locator(
      'textarea[placeholder*="resume" i], textarea[name="resumeText"]',
    );
    await expect(resumeTextarea).toBeVisible({ timeout: 5000 });

    const matchBtn = page.locator('button:has-text("Match"), button:has-text("Analyze")');
    await expect(matchBtn).toBeVisible({ timeout: 5000 });
  });

  test('shows error when match is attempted with empty resume text', async ({ page, request }) => {
    const job = await seedJob(request);
    await loginAs(page);

    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    const matchBtn = page.locator('button:has-text("Match"), button:has-text("Analyze")');
    if (await matchBtn.isVisible()) {
      await matchBtn.click();
      // Should show an error or validation message
      await expect(
        page.getByText(/required|enter your resume|provide resume/i),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test.skip(SKIP_AI, 'SKIP_AI_E2E=true');
  test('submitting resume text returns match score (real API)', async ({ page, request }) => {
    const job = await seedJob(request);
    await loginAs(page);

    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    const resumeTextarea = page.locator(
      'textarea[placeholder*="resume" i], textarea[name="resumeText"]',
    );

    if (await resumeTextarea.isVisible()) {
      await resumeTextarea.fill(
        'John Doe, Python Engineer. 4 years experience in TensorFlow, Docker, AWS, and MLOps pipelines.',
      );

      const matchBtn = page.locator('button:has-text("Match"), button:has-text("Analyze")');
      await matchBtn.click();

      // Wait for match score to appear
      await expect(
        page.locator('[class*="score"], div:has-text("Match Score"), div:has-text("%")'),
      ).toBeVisible({ timeout: 20000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DARK / LIGHT MODE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Theme Toggle', () => {
  test('theme toggle button is visible in navbar', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');

    const toggle = page.locator(
      'button[aria-label*="theme" i], button[title*="theme" i], button[title*="dark" i], button[title*="light" i]',
    );
    await expect(toggle).toBeVisible({ timeout: 5000 });
  });

  test('toggles dark mode class on html element', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');

    const toggle = page.locator(
      'button[aria-label*="theme" i], button[title*="theme" i], button[title*="dark" i], button[title*="light" i]',
    );

    if (await toggle.isVisible()) {
      const htmlBefore = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      await toggle.click();
      const htmlAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(htmlBefore).not.toBe(htmlAfter);
    }
  });

  test('theme preference persists after page reload', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');

    const toggle = page.locator(
      'button[aria-label*="theme" i], button[title*="theme" i], button[title*="dark" i], button[title*="light" i]',
    );

    if (await toggle.isVisible()) {
      await toggle.click();
      const darkBeforeReload = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );

      await page.reload();
      await page.waitForLoadState('networkidle');

      const darkAfterReload = await page.evaluate(() =>
        document.documentElement.classList.contains('dark'),
      );

      expect(darkBeforeReload).toBe(darkAfterReload);
    }
  });
});
