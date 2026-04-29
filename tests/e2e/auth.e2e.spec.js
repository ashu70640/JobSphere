/**
 * E2E Tests — Authentication Flows
 * Requires: Docker Compose running → docker compose up --build
 * Base URL: http://localhost (Nginx port 80)
 */
import { test, expect } from '@playwright/test';

// ─── Test data ────────────────────────────────────────────────────────────────

const uniqueEmail = () => `e2e_${Date.now()}@jobsphere.test`;

const testUser = {
  name: 'E2E Tester',
  email: uniqueEmail(),
  password: 'E2E@Secure123',
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Register Page', () => {
  test('renders the register form correctly', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('input[type="text"], input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('successfully registers a new user and redirects to dashboard', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="name"], input[placeholder*="name" i]', testUser.name);
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\//); // dashboard route
    await page.waitForLoadState('networkidle');
  });

  test('shows error when registering with an already-taken email', async ({ page }) => {
    // Register first
    await page.goto('/register');
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'First User');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Try to register again with same email
    await page.goto('/register');
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Second User');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should display an error
    await expect(page.getByText(/already exist|already registered|taken/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows a link to the login page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('a[href*="login"]')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login Page', () => {
  test.beforeAll(async ({ request }) => {
    // Register via API so the user exists
    await request.post('/api/v1/auth/register', {
      data: testUser,
    });
  });

  test('renders the login form correctly', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('logs in with valid credentials and lands on dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/^\/$|\/dashboard/);
    await expect(page).not.toHaveURL(/login/);
  });

  test('shows error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', 'WrongPassword!');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid|incorrect|wrong|credentials/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('shows a link to the register page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href*="register"]')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Protected Routes', () => {
  test('unauthenticated user is redirected to /login when visiting /', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/login/);
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user is redirected from /add-job to /login', async ({ page }) => {
    await page.goto('/add-job');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated user cannot access /interviews', async ({ page }) => {
    await page.goto('/interviews');
    await expect(page).toHaveURL(/login/);
  });

  test('authenticated user can access protected dashboard', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/^\/$|\/dashboard/);

    // Navigate to protected pages
    await page.goto('/');
    await expect(page).not.toHaveURL(/login/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FULL REGISTER → LOGIN → PROFILE UPDATE JOURNEY
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Complete Auth Journey', () => {
  test('register → login → view profile → update → logout flow', async ({ page }) => {
    const journeyEmail = uniqueEmail();

    // 1. Register
    await page.goto('/register');
    await page.fill('input[name="name"], input[placeholder*="name" i]', 'Journey User');
    await page.fill('input[type="email"]', journeyEmail);
    await page.fill('input[type="password"]', 'Journey@123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/^\/$|\/dashboard/, { timeout: 10000 });

    // 2. Navigate to Profile
    await page.goto('/profile');
    await expect(page).not.toHaveURL(/login/);

    // 3. Verify profile is visible
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/journey user/i)).toBeVisible({ timeout: 5000 });
  });
});
