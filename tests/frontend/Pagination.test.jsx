/**
 * Frontend Unit Tests — Pagination Component
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Pagination from '../../client/src/components/Pagination.jsx';

const renderPagination = (props) =>
  render(<Pagination {...props} />);

describe('Pagination — Rendering', () => {
  it('returns null when totalPages is 1', () => {
    const { container } = renderPagination({
      currentPage: 1,
      totalPages: 1,
      onPageChange: vi.fn(),
      totalJobs: 5,
      limit: 6,
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when totalPages is 0', () => {
    const { container } = renderPagination({
      currentPage: 1,
      totalPages: 0,
      onPageChange: vi.fn(),
      totalJobs: 0,
      limit: 6,
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders prev/next buttons when totalPages > 1', () => {
    renderPagination({
      currentPage: 2,
      totalPages: 5,
      onPageChange: vi.fn(),
      totalJobs: 30,
      limit: 6,
    });
    expect(screen.getByText(/prev/i) || screen.getByLabelText(/previous/i)).toBeTruthy();
    expect(screen.getByText(/next/i) || screen.getByLabelText(/next/i)).toBeTruthy();
  });

  it('renders page numbers', () => {
    renderPagination({
      currentPage: 1,
      totalPages: 3,
      onPageChange: vi.fn(),
      totalJobs: 18,
      limit: 6,
    });
    // Should show page 1, 2, 3
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows range indicator (Showing X–Y of Z jobs)', () => {
    renderPagination({
      currentPage: 1,
      totalPages: 3,
      onPageChange: vi.fn(),
      totalJobs: 18,
      limit: 6,
    });
    // "Showing 1–6 of 18 jobs" or similar
    expect(screen.getByText(/showing/i)).toBeInTheDocument();
    expect(screen.getByText(/18/)).toBeInTheDocument();
  });

  it('marks the current page as active/selected', () => {
    renderPagination({
      currentPage: 2,
      totalPages: 5,
      onPageChange: vi.fn(),
      totalJobs: 30,
      limit: 6,
    });
    const page2 = screen.getByRole('button', { name: '2' });
    expect(page2).toHaveAttribute('aria-current', 'page');
  });
});

describe('Pagination — Interactions', () => {
  it('calls onPageChange with correct page when a page number is clicked', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 1, totalPages: 4, onPageChange, totalJobs: 24, limit: 6 });

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with currentPage+1 when Next is clicked', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 2, totalPages: 5, onPageChange, totalJobs: 30, limit: 6 });

    const nextBtn = screen.getByText(/next/i) || screen.getByLabelText(/next/i);
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with currentPage-1 when Prev is clicked', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 3, totalPages: 5, onPageChange, totalJobs: 30, limit: 6 });

    const prevBtn = screen.getByText(/prev/i) || screen.getByLabelText(/previous/i);
    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('Prev button is disabled on the first page', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 1, totalPages: 3, onPageChange, totalJobs: 18, limit: 6 });

    const prevBtn = screen.queryByRole('button', { name: /prev/i }) ||
      screen.queryByLabelText(/previous/i);
    if (prevBtn) {
      expect(prevBtn).toBeDisabled();
    }
  });

  it('Next button is disabled on the last page', () => {
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 3, totalPages: 3, onPageChange, totalJobs: 18, limit: 6 });

    const nextBtn = screen.queryByRole('button', { name: /next/i }) ||
      screen.queryByLabelText(/next/i);
    if (nextBtn) {
      expect(nextBtn).toBeDisabled();
    }
  });

  it('shows ellipsis for large page counts', () => {
    renderPagination({
      currentPage: 5,
      totalPages: 20,
      onPageChange: vi.fn(),
      totalJobs: 120,
      limit: 6,
    });
    // Should show at least one ellipsis element
    const ellipsis = screen.queryAllByText('...');
    expect(ellipsis.length).toBeGreaterThan(0);
  });
});
