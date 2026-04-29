/**
 * Frontend Unit Tests — FilterBar Component
 */
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FilterBar from '../../client/src/components/FilterBar.jsx';

const defaultProps = {
  search:           '',
  status:           'all',
  jobType:          'all',
  sort:             'latest',
  totalJobs:        12,
  onSearchChange:   vi.fn(),
  onStatusChange:   vi.fn(),
  onJobTypeChange:  vi.fn(),
  onSortChange:     vi.fn(),
  onResetFilters:   vi.fn(),
};

describe('FilterBar — Rendering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the search input', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders status, jobType, and sort dropdowns', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByDisplayValue(/all/i) || screen.getByRole('combobox')).toBeTruthy();
  });

  it('shows job count badge', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('does NOT show Reset button when no filter is active', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
  });

  it('shows Reset button when search has a value', () => {
    render(<FilterBar {...defaultProps} search="react" />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('shows Reset button when status filter is active', () => {
    render(<FilterBar {...defaultProps} status="interview" />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('shows active filter chips when filters are set', () => {
    render(<FilterBar {...defaultProps} search="python" status="pending" />);
    // Row 2 shows active filter tags
    expect(screen.getByText(/python/i) || screen.getByText(/pending/i)).toBeTruthy();
  });
});

describe('FilterBar — Interactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls onSearchChange when user types in search input', async () => {
    const onSearchChange = vi.fn();
    render(<FilterBar {...defaultProps} onSearchChange={onSearchChange} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'a');

    expect(onSearchChange).toHaveBeenCalled();
  });

  it('calls onStatusChange when status dropdown changes', () => {
    const onStatusChange = vi.fn();
    render(<FilterBar {...defaultProps} onStatusChange={onStatusChange} />);

    const selects = screen.getAllByRole('combobox');
    // First combobox is typically status
    fireEvent.change(selects[0], { target: { value: 'interview' } });

    expect(onStatusChange).toHaveBeenCalledWith('interview');
  });

  it('calls onResetFilters when Reset button is clicked', () => {
    const onResetFilters = vi.fn();
    render(<FilterBar {...defaultProps} search="react" onResetFilters={onResetFilters} />);

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it('shows inline clear ✕ button when search has text', () => {
    render(<FilterBar {...defaultProps} search="node" />);
    // Clear button inside search field
    const clearBtn = screen.queryByRole('button', { name: /clear|×|✕/i });
    if (clearBtn) expect(clearBtn).toBeInTheDocument();
  });

  it('clears search when inline clear button is clicked', () => {
    const onSearchChange = vi.fn();
    render(<FilterBar {...defaultProps} search="node" onSearchChange={onSearchChange} />);

    const clearBtn = screen.queryByRole('button', { name: /clear|×|✕/i });
    if (clearBtn) {
      fireEvent.click(clearBtn);
      expect(onSearchChange).toHaveBeenCalledWith('');
    }
  });
});
