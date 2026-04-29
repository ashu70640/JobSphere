/**
 * Frontend Unit Tests — Register Page
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Register from '../../client/src/pages/Register.jsx';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('../../client/src/Helper/SafeFetch.jsx', () => ({
  default: vi.fn(),
}));
import safeFetch from '../../client/src/Helper/SafeFetch.jsx';

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );

describe('Register Page — Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders name, email, and password inputs', () => {
    renderRegister();
    expect(screen.queryByLabelText(/name/i) || screen.queryByPlaceholderText(/name/i)).toBeTruthy();
    expect(screen.queryByLabelText(/email/i) || screen.queryByPlaceholderText(/email/i)).toBeTruthy();
    expect(screen.queryByLabelText(/password/i) || screen.queryByPlaceholderText(/password/i)).toBeTruthy();
  });

  it('renders a submit / register button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /register|sign up|create/i })).toBeInTheDocument();
  });

  it('renders a link to the login page', () => {
    renderRegister();
    const loginLink = screen.getByRole('link', { name: /login|sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.getAttribute('href')).toMatch(/login/);
  });

  it('renders the JobSphere brand name', () => {
    renderRegister();
    expect(screen.getByText(/jobsphere/i)).toBeInTheDocument();
  });
});

describe('Register Page — Form Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('navigates to dashboard after successful registration', async () => {
    safeFetch.mockResolvedValue({
      token: 'reg-token',
      user:  { name: 'New User', email: 'new@test.com' },
    });

    renderRegister();

    const nameInput     = screen.queryByLabelText(/name/i)     || screen.getByPlaceholderText(/name/i);
    const emailInput    = screen.queryByLabelText(/email/i)    || screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.queryByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);

    await userEvent.type(nameInput, 'New User');
    await userEvent.type(emailInput, 'new@test.com');
    await userEvent.type(passwordInput, 'Pass@123');

    fireEvent.click(screen.getByRole('button', { name: /register|sign up|create/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('displays server error when registration fails', async () => {
    safeFetch.mockRejectedValue({ message: 'User Already Exist' });

    renderRegister();

    const nameInput     = screen.queryByLabelText(/name/i)     || screen.getByPlaceholderText(/name/i);
    const emailInput    = screen.queryByLabelText(/email/i)    || screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.queryByLabelText(/password/i) || screen.getByPlaceholderText(/password/i);

    await userEvent.type(nameInput, 'Dup User');
    await userEvent.type(emailInput, 'dup@test.com');
    await userEvent.type(passwordInput, 'pass');

    fireEvent.click(screen.getByRole('button', { name: /register|sign up|create/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exist|error|failed/i)).toBeInTheDocument();
    });
  });
});
