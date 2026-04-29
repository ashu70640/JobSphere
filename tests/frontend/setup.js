import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ─── Mock react-router-dom ────────────────────────────────────────────────────
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate:  vi.fn(() => vi.fn()),
    useParams:    vi.fn(() => ({})),
    useLocation:  vi.fn(() => ({ pathname: '/' })),
    Link:         ({ children, to }) => <a href={to}>{children}</a>,
    NavLink:      ({ children, to }) => <a href={to}>{children}</a>,
    Navigate:     ({ to }) => <div data-testid="navigate" data-to={to} />,
    MemoryRouter: actual.MemoryRouter,
    Routes:       actual.Routes,
    Route:        actual.Route,
  };
});

// ─── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:   (k) => store[k] ?? null,
    setItem:   (k, v) => { store[k] = String(v); },
    removeItem:(k) => { delete store[k]; },
    clear:     () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ─── Silence expected console.error in tests (e.g. act() warnings) ───────────
const originalError = console.error.bind(console);
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('act(') || args[0].includes('Warning:'))
  )
    return;
  originalError(...args);
};
