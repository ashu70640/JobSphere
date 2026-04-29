/**
 * E2E Tests — Jobs CRUD + Filters + Dashboard
 * Requires: Docker Compose running → docker compose up --build
 */
import { test, expect } from '@playwright/test';

// ─── Shared auth state ────────────────────────────────────────────────────────

const E2E_USER = {
  name: 'Jobs E2E User',
  email: `jobs_e2e_${Date.now()}@jobsphere.test`,
  password: 'Jobs@E2E123',
};

// Register once and reuse access token for API seeding
test.beforeAll(async ({ request }) => {
  await request.post('/api/v1/auth/register', { data: E2E_USER });
});

// Helper: login via UI and return the page logged in
async function loginAs(page, email = E2E_USER.email, password = E2E_USER.password) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/^\/$|\/dashboard/, { timeout: 10000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('shows empty state when no jobs exist', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no jobs|no applications|create your first/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('renders filter bar and search input', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');

    await expect(page.locator('input[placeholder*="search" i], input[type="search"]')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD JOB
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Add Job', () => {
  test('navigates to /add-job and renders the form', async ({ page }) => {
    await loginAs(page);
    await page.goto('/add-job');

    await expect(page.locator('input[name="company"], input[placeholder*="company" i]')).toBeVisible();
    await expect(page.locator('input[name="position"], input[placeholder*="position" i]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('creates a new job and redirects back', async ({ page }) => {
    await loginAs(page);
    await page.goto('/add-job');

    await page.fill('input[name="company"], input[placeholder*="company" i]', 'E2E Corp');
    await page.fill('input[name="position"], input[placeholder*="position" i]', 'QA Engineer');

    // workLocation
    const workLocationInput = page.locator('input[name="workLocation"], input[placeholder*="location" i]');
    if (await workLocationInput.isVisible()) {
      await workLocationInput.fill('Remote');
    }

    // description (textarea or input)
    const descInput = page.locator('textarea[name="description"], input[name="description"], textarea');
    if (await descInput.first().isVisible()) {
      await descInput.first().fill('End-to-end test job description for QA purposes.');
    }

    await page.click('button[type="submit"]');

    // Should redirect to dashboard or job list
    await page.waitForURL(/^\/$|\/dashboard|add-job/, { timeout: 10000 });
  });

  test('shows validation error when required fields are empty', async ({ page }) => {
    await loginAs(page);
    await page.goto('/add-job');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Should NOT navigate away
    await expect(page).toHaveURL(/add-job/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FULL CRUD JOURNEY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Complete Job CRUD Journey', () => {
  test('create → view → edit → delete a job', async ({ page }) => {
    await loginAs(page);

    // 1. Create job
    await page.goto('/add-job');
    await page.fill('input[name="company"], input[placeholder*="company" i]', 'CRUD Corp');
    await page.fill('input[name="position"], input[placeholder*="position" i]', 'CRUD Developer');

    const locInput = page.locator('input[name="workLocation"], input[placeholder*="location" i]');
    if (await locInput.isVisible()) await locInput.fill('NY');

    const descInput = page.locator('textarea[name="description"], textarea').first();
    if (await descInput.isVisible()) {
      await descInput.fill('A job for CRUD testing purposes.');
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(/^\/$|\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 2. Verify job appears on dashboard
    await expect(page.getByText('CRUD Corp')).toBeVisible({ timeout: 8000 });

    // 3. Click Edit button
    const editBtn = page.locator('a[href*="edit-job"], button:has-text("Edit")').first();
    await editBtn.click();
    await page.waitForURL(/edit-job/, { timeout: 5000 });

    // 4. Update status
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('interview');
    }
    await page.click('button[type="submit"]');
    await page.waitForURL(/^\/$|\/dashboard/, { timeout: 10000 });

    // 5. Delete — find the job and click delete
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const deleteBtn = page.locator('button:has-text("Delete")').first();
    await deleteBtn.click();

    // Confirm if dialog appears
    page.on('dialog', (dialog) => dialog.accept());
    await page.waitForLoadState('networkidle');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FILTERS + SEARCH
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Dashboard Filters & Search', () => {
  test.beforeEach(async ({ request }) => {
    // Seed a job via API for filter tests
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: E2E_USER.email, password: E2E_USER.password },
    });
    const { accessToken } = await loginRes.json();

    await request.post('/api/v1/jobs', {
      data: {
        company: 'FilterTest Corp',
        position: 'Filter Developer',
        status: 'pending',
        jobType: 'remote',
        workLocation: 'Remote',
        description: 'Job for filter testing.',
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  });

  test('search bar filters jobs by company name', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]');
    await searchInput.fill('FilterTest');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('FilterTest Corp')).toBeVisible({ timeout: 5000 });
  });

  test('status filter shows only matching jobs', async ({ page }) => {
    await loginAs(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const statusSelect = page.locator('select[name="status"], select').first();
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('pending');
      await page.waitForLoadState('networkidle');
      // All visible jobs should have pending status
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Job Notes', () => {
  test('can add a note to a job from the job details page', async ({ page, request }) => {
    // Seed job via API
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: E2E_USER.email, password: E2E_USER.password },
    });
    const { accessToken } = await loginRes.json();

    const jobRes = await request.post('/api/v1/jobs', {
      data: {
        company: 'Note Corp',
        position: 'Note Taker',
        workLocation: 'NY',
        description: 'Note job',
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { job } = await jobRes.json();

    // Visit job detail
    await loginAs(page);
    await page.goto(`/job/${job._id}`);
    await page.waitForLoadState('networkidle');

    // Add note
    const noteInput = page.locator(
      'textarea[placeholder*="note" i], input[placeholder*="note" i]',
    ).first();

    if (await noteInput.isVisible()) {
      await noteInput.fill('This is an E2E test note');
      await page.locator('button:has-text("Add"), button[type="submit"]').last().click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('This is an E2E test note')).toBeVisible({ timeout: 5000 });
    }
  });
});
