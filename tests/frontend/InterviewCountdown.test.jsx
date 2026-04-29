/**
 * Frontend Unit Tests — InterviewCountdown + getUrgency helper
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import InterviewCountdown, {
  getUrgency,
} from '../../client/src/components/interview/InterviewCountdown.jsx';

// ─── getUrgency helper ────────────────────────────────────────────────────────

describe('getUrgency() helper', () => {
  const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };

  it('returns "overdue" for a past interview date', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(getUrgency(past)).toBe('overdue');
  });

  it('returns "today" for today\'s interview', () => {
    const today = new Date().toISOString();
    expect(getUrgency(today)).toBe('today');
  });

  it('returns "tomorrow" for interview exactly 1 day away', () => {
    expect(getUrgency(daysFromNow(1))).toBe('tomorrow');
  });

  it('returns "week" for interview 3 days away', () => {
    expect(getUrgency(daysFromNow(3))).toBe('week');
  });

  it('returns "week" for interview 6 days away', () => {
    expect(getUrgency(daysFromNow(6))).toBe('week');
  });

  it('returns "later" for interview more than 7 days away', () => {
    expect(getUrgency(daysFromNow(8))).toBe('later');
  });

  it('returns "later" for interview 30 days away', () => {
    expect(getUrgency(daysFromNow(30))).toBe('later');
  });
});

// ─── InterviewCountdown component ────────────────────────────────────────────

describe('InterviewCountdown — Rendering', () => {
  const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  };

  it('renders "Overdue" pill for past interview', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    render(<InterviewCountdown interviewDate={past} />);
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });

  it('renders "Today" pill for today\'s interview', () => {
    render(<InterviewCountdown interviewDate={new Date().toISOString()} />);
    expect(screen.getByText(/today/i)).toBeInTheDocument();
  });

  it('renders "Tomorrow" pill for tomorrow\'s interview', () => {
    render(<InterviewCountdown interviewDate={daysFromNow(1)} />);
    expect(screen.getByText(/tomorrow/i)).toBeInTheDocument();
  });

  it('renders "This Week" pill for interview within 7 days', () => {
    render(<InterviewCountdown interviewDate={daysFromNow(4)} />);
    expect(screen.getByText(/this week/i)).toBeInTheDocument();
  });

  it('renders "Later" pill for interview more than 7 days out', () => {
    render(<InterviewCountdown interviewDate={daysFromNow(10)} />);
    expect(screen.getByText(/later/i)).toBeInTheDocument();
  });

  it('renders nothing or null when no interviewDate is provided', () => {
    const { container } = render(<InterviewCountdown interviewDate={null} />);
    expect(container.firstChild).toBeNull();
  });
});
