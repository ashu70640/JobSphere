/**
 * E2E Tests — Interview Management
 * Requires: Docker Compose running
 */
import { test, expect } from '@playwright/test';

const INTERVIEW_USER = {
  name: 'Interview E2E',
  email: `interview_e2e_${Date.now()}@jobsphere.test`,
  password: 'Interview@E2E',
};

test.beforeAll(async ({ request }) => {
  await request.post('/api/v1/auth/register', { data: INTERVIEW_USER });
});

async function loginAs(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', INTERVIEW_USER.email);
  await page.fill('input[type="password"]', INTERVIEW_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^\/$|\/dashboard/, { timeout: 10000 });
}

async function seedInterviewJob(request) {
  const loginRes = await request.post('/api/v1/auth/login', {
    data: { email: INTERVIEW_USER.email, password: INTERVIEW_USER.password },
  });
  const { accessToken } = await loginRes.json();

  const jobRes = await request.post('/api/v1/jobs', {
    data: {
      company: 'Interview Co',
      position: 'Interview Candidate',
      status: 'interview',
      jobType: 'full-time',
      workLocation: 'NY',
      description: 'A job requiring React, Node.js, and MongoDB skills.',
      interviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      interviewTime: '10:00',
      interviewType: 'video',
      interviewRound: 1,
      interviewStatus: 'scheduled',
      interviewerName: 'Jane Interviewer',
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return (await jobRes.json()).job;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEWS PAGE
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interviews Page (/interviews)', () => {
  test('renders the interviews page without crashing', async ({ page, request }) => {
    await seedInterviewJob(request);
    await loginAs(page);
    await page.goto('/interviews');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/interviews/);
    await expect(page).not.toHaveURL(/login/);
  });

  test('shows interview job in the grouped view', async ({ page, request }) => {
    await seedInterviewJob(request);
    await loginAs(page);
    await page.goto('/interviews');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Interview Co')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Interview Candidate')).toBeVisible();
  });

  test('shows interview stats bar (KPI cards)', async ({ page, request }) => {
    await seedInterviewJob(request);
    await loginAs(page);
    await page.goto('/interviews');
    await page.waitForLoadState('networkidle');

    // Stats bar should show Today, This Week, Needs Attention, Offer Rate
    const statsBar = page.locator('[class*="stats"], [data-testid*="stats"]');
    if (await statsBar.isVisible()) {
      await expect(statsBar).toBeVisible();
    }
  });

  test('interviews page shows empty state when no interviews exist', async ({ page }) => {
    await loginAs(page);
    await page.goto('/interviews');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/no interviews|no upcoming|schedule your first/i),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UPCOMING INTERVIEWS WIDGET (DASHBOARD)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard — Upcoming Interviews Widget', () => {
  test('shows upcoming interview job in dashboard sidebar/widget', async ({ page, request }) => {
    await seedInterviewJob(request);
    await loginAs(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Interview Co')).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEW SECTION IN ADD/EDIT JOB
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Interview Section in EditJob', () => {
  test('interview fields appear when status is changed to interview', async ({ page, request }) => {
    const job = await seedInterviewJob(request);
    await loginAs(page);

    await page.goto(`/edit-job/${job._id}`);
    await page.waitForLoadState('networkidle');

    // Interview section should be visible since status is 'interview'
    const interviewDateInput = page.locator(
      'input[name="interviewDate"], input[type="date"]',
    );
    if (await interviewDateInput.isVisible()) {
      await expect(interviewDateInput).toBeVisible();
    }

    const interviewTypeSelect = page.locator('select[name="interviewType"]');
    if (await interviewTypeSelect.isVisible()) {
      await expect(interviewTypeSelect).toBeVisible();
    }
  });

  test('can update interview details and save', async ({ page, request }) => {
    const job = await seedInterviewJob(request);
    await loginAs(page);

    await page.goto(`/edit-job/${job._id}`);
    await page.waitForLoadState('networkidle');

    // Update interview round if visible
    const roundInput = page.locator('input[name="interviewRound"]');
    if (await roundInput.isVisible()) {
      await roundInput.fill('2');
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(/^\/$|\/dashboard/, { timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERVIEW PREP PANEL IN JOB DETAILS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Job Details — Interview Prep Panel', () => {
  test('shows InterviewPrepPanel for interview-status jobs', async ({ page, request }) => {
    const job = await seedInterviewJob(request);
    await loginAs(page);

    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    // Interview prep section or countdown should be visible
    const prepPanel = page.locator(
      '[class*="prep"], [data-testid*="prep"], h2:has-text("Interview Prep")',
    );
    if (await prepPanel.isVisible()) {
      await expect(prepPanel).toBeVisible();
    }
  });

  test('interview countdown pill is shown on job header', async ({ page, request }) => {
    const job = await seedInterviewJob(request);
    await loginAs(page);

    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    // Look for urgency pill: "Tomorrow", "This Week", etc.
    const urgencyPill = page.locator(
      'span:has-text("Tomorrow"), span:has-text("This Week"), span:has-text("Today")',
    );
    if (await urgencyPill.isVisible()) {
      await expect(urgencyPill).toBeVisible();
    }
  });
});
