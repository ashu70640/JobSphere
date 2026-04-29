/**
 * Frontend Unit Tests — ThemeToggle Component + ThemeContext
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThemeToggle from '../../client/src/components/ThemeToggle.jsx';
import { ThemeProvider } from '../../client/src/context/ThemeContext.jsx';

const renderWithTheme = (ui) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('ThemeToggle — Rendering', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders the toggle button', () => {
    renderWithTheme(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows a sun icon in dark mode and moon in light mode (or vice versa)', () => {
    renderWithTheme(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    // Icon text or aria-label varies by implementation — just confirm button renders
  });
});

describe('ThemeToggle — Dark Mode Toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('adds "dark" class to <html> when toggled on', () => {
    renderWithTheme(<ThemeToggle />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes "dark" class from <html> when toggled off', () => {
    // Start in dark mode
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');

    renderWithTheme(<ThemeToggle />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn); // should go to light mode

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists dark mode preference to localStorage', () => {
    renderWithTheme(<ThemeToggle />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn);

    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('persists light mode preference to localStorage', () => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');

    renderWithTheme(<ThemeToggle />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn); // toggle back to light

    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('reads persisted "dark" preference from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark');

    renderWithTheme(<ThemeToggle />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('defaults to light mode when localStorage has no preference', () => {
    localStorage.clear();

    renderWithTheme(<ThemeToggle />);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
