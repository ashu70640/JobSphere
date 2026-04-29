/**
 * Frontend Unit Tests — Login Page
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from '../../client/src/pages/Login.jsx';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock SafeFetch helper that Login uses for API calls
vi.mock('../../client/src/Helper/SafeFetch.jsx', () => ({
  default: vi.fn(),
}));

import safeFetch from '../../client/src/Helper/SafeFetch.jsx';

// ─── Render helper ────────────────────────────────────────────────────────────

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

// ─────────────────────────────────────────────────────────────────────────────

describe('Login Page — Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i) || screen.getByPlaceholderText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i) || screen.getByPlaceholderText(/password/i)).toBeTruthy();
  });

  it('renders a submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /login|sign in/i })).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    renderLogin();
    const registerLink = screen.getByRole('link', { name: /register|sign up|create/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.getAttribute('href')).toMatch(/register/);
  });

  it('renders the JobSphere brand name', () => {
    renderLogin();
    expect(screen.getByText(/jobsphere/i)).toBeInTheDocument();
  });
});

describe('Login Page — Form Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('updates email field value on input', async () => {
    renderLogin();
    const emailInput =
      screen.queryByLabelText(/email/i) ||
      screen.getByPlaceholderText(/email/i);
    await userEvent.type(emailInput, 'test@example.com');
    expect(emailInput.value).toBe('test@example.com');
  });

  it('updates password field value on input', async () => {
    renderLogin();
    const passwordInput =
      screen.queryByLabelText(/password/i) ||
      screen.getByPlaceholderText(/password/i);
    await userEvent.type(passwordInput, 'mypassword');
    expect(passwordInput.value).toBe('mypassword');
  });

  it('navigates to dashboard on successful login', async () => {
    safeFetch.mockResolvedValue({
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      user: { userId: 'uid-1', name: 'Test', email: 'test@test.com', location: 'NY' },
    });

    renderLogin();

    const emailInput = screen.queryByLabelText(/email/i) || screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.queryByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);

    await userEvent.type(emailInput, 'test@test.com');
    await userEvent.type(passwordInput, 'pass');
    fireEvent.click(screen.getByRole('button', { name: /login|sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('stores token in localStorage on successful login', async () => {
    safeFetch.mockResolvedValue({
      accessToken: 'access-token-abc',
      refreshToken: 'refresh-token-xyz',
      user: { userId: 'uid-1', name: 'Test', email: 't@t.com', location: 'NY' },
    });

    renderLogin();

    const emailInput = screen.queryByLabelText(/email/i) || screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.queryByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);

    await userEvent.type(emailInput, 't@t.com');
    await userEvent.type(passwordInput, 'pass');
    fireEvent.click(screen.getByRole('button', { name: /login|sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('access-token-abc');
    });
  });

  it('shows error message on failed login', async () => {
    safeFetch.mockRejectedValue({ message: 'Invalid Credentials' });

    renderLogin();

    const emailInput = screen.queryByLabelText(/email/i) || screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.queryByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);

    await userEvent.type(emailInput, 'bad@test.com');
    await userEvent.type(passwordInput, 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /login|sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid|credentials|error/i),
      ).toBeInTheDocument();
    });
  });
});
